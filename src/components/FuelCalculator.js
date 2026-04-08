// FuelCalculatorFinal.js - Combined implementation of FuelCalculatorKILO and FuelCalculatorGPT
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import firebase from "../firebase";

// ----------------------------- Constants -----------------------------

let MATCH_TIMING = {
  AUTO_END: 20,
  TRANSITION_SHIFT_END: 23,
  TRANSITION_END: 33,
  SHIFT1_END: 58,
  SHIFT2_END: 83,
  SHIFT3_END: 108,
  SHIFT4_END: 133,
  END_GAME_END: 163,
  TOTAL_DURATION: 163,
};

let CONFIDENCE = {
  DECAY_CONSTANT: 0.1,
  MAX_CONFIDENCE: 1.0,
  LOW_CONFIDENCE_THRESHOLD: 0.3,
};

let HISTORICAL_AVERAGING = {
  LOW_CONFIDENCE_THRESHOLD: 0.3,
  MIN_TOTAL_SHOOTING_TIME_FOR_AVERAGING: 5.0,
  DECAY_RATE: 0.8,
  MIN_HISTORICAL_MATCHES: 1,
  MAX_MATCHES_TO_LOOK_BACK: 12,
};

let SCOUTER_DELAY = {
  START: 0.5,
  END: 0,
};

let DATA_FILTERING = {
  MIN_SHOOTING_TIME: SCOUTER_DELAY.END - SCOUTER_DELAY.START,
  SHOOTING_TIME_MERGE_THRESHOLD: 1.5,
  MIN_SCORE_INCREMENT: 1,
  MAX_SCORE_INCREMENT: 20,
};

let SCOREBOARD = {
  START: 0,
  END: 5,
  RATE: 0.1,
};

let QUALITY_METRICS = {
  MIN_SHOOTING_TIME: 2,
  REFERENCE_SHOOTING_TIME: 10,
  CONFIDENCE_WEIGHT: 0.5,
};

// Export function to set constants (for tuning)
export function setConstants(newConstants) {
  if (newConstants.MATCH_TIMING)
    MATCH_TIMING = { ...MATCH_TIMING, ...newConstants.MATCH_TIMING };
  if (newConstants.CONFIDENCE)
    CONFIDENCE = { ...CONFIDENCE, ...newConstants.CONFIDENCE };
  if (newConstants.HISTORICAL_AVERAGING)
    HISTORICAL_AVERAGING = {
      ...HISTORICAL_AVERAGING,
      ...newConstants.HISTORICAL_AVERAGING,
    };
  if (newConstants.SCOUTER_DELAY)
    SCOUTER_DELAY = { ...SCOUTER_DELAY, ...newConstants.SCOUTER_DELAY };
  if (newConstants.DATA_FILTERING)
    DATA_FILTERING = { ...DATA_FILTERING, ...newConstants.DATA_FILTERING };
  if (newConstants.SCOREBOARD)
    SCOREBOARD = { ...SCOREBOARD, ...newConstants.SCOREBOARD };
  if (newConstants.QUALITY_METRICS)
    QUALITY_METRICS = { ...QUALITY_METRICS, ...newConstants.QUALITY_METRICS };
}

// Export function to get current constants
export function getConstants() {
  return {
    MATCH_TIMING,
    CONFIDENCE,
    HISTORICAL_AVERAGING,
    SCOUTER_DELAY,
    DATA_FILTERING,
    SCOREBOARD,
    QUALITY_METRICS,
  };
}

// ----------------------------- Small helpers -----------------------------

function clamp01(x) {
  if (x == null || Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function overlapDuration(aStart, aEnd, bStart, bEnd) {
  const s = Math.max(aStart, bStart);
  const e = Math.min(aEnd, bEnd);
  return e > s ? e - s : 0;
}

function splitAutoTeleByTime(time, value) {
  if (time <= MATCH_TIMING.TRANSITION_SHIFT_END)
    return { auto: value, tele: 0 };
  return { auto: 0, tele: value };
}

function roundFuel(x) {
  return Math.round(Number(x ?? 0));
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, v) => sum + Number(v || 0), 0) / values.length;
}

/**
 * Calculate total shooting time from robot shooting times array
 */
export function calculateTotalShootingTime(shootingTimes) {
  if (!Array.isArray(shootingTimes) || shootingTimes.length === 0) return 0;
  return shootingTimes.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
}

/**
 * Calculate quality metric for a robot
 * Combines confidence (per-robot) with accuracy (alliance-wide)
 * Confidence is weighted by shooting time - more shooting time = more weight on confidence
 */
export function calculateQuality(robot, accuracy) {
  const shootingTime = Number(robot.shootingTime ?? 0);
  const confidence = Number(robot.confidence ?? 0);

  if (shootingTime < QUALITY_METRICS.MIN_SHOOTING_TIME) {
    return accuracy;
  }

  const confidenceWeight = Math.min(
    shootingTime / QUALITY_METRICS.REFERENCE_SHOOTING_TIME,
    1.0
  );

  const weightedConfidence =
    confidence * confidenceWeight * QUALITY_METRICS.CONFIDENCE_WEIGHT;
  const weightedAccuracy =
    accuracy * (1 - confidenceWeight * QUALITY_METRICS.CONFIDENCE_WEIGHT);

  return weightedConfidence + weightedAccuracy;
}

// ----------------------------- Data cleaning / timing -----------------------------

export function cleanAndMergeShootingTimes(
  shootingTimes,
  minShootingTime = DATA_FILTERING.MIN_SHOOTING_TIME,
  mergeThreshold = DATA_FILTERING.SHOOTING_TIME_MERGE_THRESHOLD
) {
  if (!Array.isArray(shootingTimes) || shootingTimes.length === 0) return [];

  const filtered = shootingTimes.filter((t) => {
    if (t == null) return false;
    const start = Number(t.startShootTime ?? 0);
    const end = Number(t.endShootTime ?? 0);
    const duration = typeof t.duration === "number" ? t.duration : end - start;
    return Number.isFinite(duration) && duration >= minShootingTime;
  });

  if (filtered.length === 0) return [];

  const sorted = filtered
    .map((t) => {
      const start = Number(t.startShootTime ?? 0);
      const end = Number(t.endShootTime ?? 0);
      return {
        startShootTime: start,
        endShootTime: end,
        duration: typeof t.duration === "number" ? t.duration : end - start,
      };
    })
    .filter(
      (t) =>
        Number.isFinite(t.startShootTime) &&
        Number.isFinite(t.endShootTime) &&
        t.endShootTime >= t.startShootTime
    )
    .sort((a, b) => a.startShootTime - b.startShootTime);

  const merged = [
    {
      ...sorted[0],
      duration: sorted[0].endShootTime - sorted[0].startShootTime,
    },
  ];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = merged[merged.length - 1];

    if (cur.startShootTime - last.endShootTime <= mergeThreshold) {
      last.endShootTime = Math.max(last.endShootTime, cur.endShootTime);
      last.duration = last.endShootTime - last.startShootTime;
    } else {
      merged.push({
        startShootTime: cur.startShootTime,
        endShootTime: cur.endShootTime,
        duration: cur.endShootTime - cur.startShootTime,
      });
    }
  }

  return merged.filter((t) => t.duration > 0);
}

export function adjustForScouterDelay(shootingTimes) {
  if (!Array.isArray(shootingTimes) || shootingTimes.length === 0) return [];
  return shootingTimes
    .map((t) => {
      const rawStart = Number(t.startShootTime ?? t.start ?? 0);
      const rawEnd = Number(t.endShootTime ?? t.end ?? 0);

      const adjustedStart = Math.max(0, rawStart - SCOUTER_DELAY.START);
      const adjustedEnd = Math.max(0, rawEnd - SCOUTER_DELAY.END);

      return {
        start: adjustedStart,
        end: adjustedEnd,
        duration: adjustedEnd - adjustedStart,
      };
    })
    .filter((t) => Number.isFinite(t.duration) && t.duration > 0);
}

export function cropToActiveHub(shootingTimes, hubActivePeriods) {
  if (!Array.isArray(shootingTimes) || shootingTimes.length === 0) return [];
  if (!Array.isArray(hubActivePeriods) || hubActivePeriods.length === 0)
    return [];

  const cropped = [];
  for (const time of shootingTimes) {
    for (const p of hubActivePeriods) {
      if (time.end <= p.start || time.start >= p.end) continue;
      const s = Math.max(time.start, p.start);
      const e = Math.min(time.end, p.end);
      if (e > s) cropped.push({ start: s, end: e, duration: e - s });
    }
  }
  return cropped;
}

/**
 * Filters score timeline to only include fuel-related increments
 * Using >= MIN and <= MAX
 */
export function filterFuelIncrements(scoreTimeline) {
  if (!Array.isArray(scoreTimeline) || scoreTimeline.length === 0) return [];

  const filtered = [];
  for (let i = 1; i < scoreTimeline.length; i++) {
    const cur = scoreTimeline[i];
    const prev = scoreTimeline[i - 1];
    if (!cur || !prev) continue;
    if (cur.score == null || prev.score == null) continue;

    const inc = Number(cur.score) - Number(prev.score);
    const t = Number(cur.timestamp ?? cur.time ?? 0);

    if (
      inc >= DATA_FILTERING.MIN_SCORE_INCREMENT &&
      inc <= DATA_FILTERING.MAX_SCORE_INCREMENT &&
      Number.isFinite(t)
    ) {
      filtered.push({
        time: t,
        score: Number(cur.score),
        increment: inc,
      });
    }
  }
  return filtered;
}

export function findExclusiveAndMultipleShootingTimes(robotTimes) {
  if (!Array.isArray(robotTimes) || robotTimes.length === 0) return [];

  const all = [];
  robotTimes.forEach((times, idx) => {
    (times || []).forEach((t) => {
      if (!t) return;
      const s = Number(t.start);
      const e = Number(t.end);
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;
      all.push({ start: s, end: e, robotIndex: idx });
    });
  });

  all.sort((a, b) => a.start - b.start);
  if (all.length === 0) return [];

  const segments = [];
  let current = {
    start: all[0].start,
    end: all[0].end,
    robots: [all[0].robotIndex],
  };

  for (let i = 1; i < all.length; i++) {
    const t = all[i];
    if (t.start <= current.end) {
      current.end = Math.max(current.end, t.end);
      if (!current.robots.includes(t.robotIndex))
        current.robots.push(t.robotIndex);
    } else {
      segments.push(current);
      current = { start: t.start, end: t.end, robots: [t.robotIndex] };
    }
  }
  segments.push(current);

  return segments.map((s) => ({
    start: s.start,
    end: s.end,
    duration: s.end - s.start,
    type: s.robots.length === 1 ? "exclusive" : "multiple",
    robots: s.robots,
  }));
}

export function createScoreboardOffset(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return [];
  return segments.map((seg) => {
    const duration = Number(seg.duration ?? seg.end - seg.start);
    return {
      start: seg.start + SCOREBOARD.START,
      end: seg.end + SCOREBOARD.END + duration * SCOREBOARD.RATE,
      originalStart: seg.start,
      originalEnd: seg.end,
      duration,
      type: seg.type,
      robots: seg.robots,
    };
  });
}

export function resolveOverlaps(offsetSegments) {
  if (!Array.isArray(offsetSegments) || offsetSegments.length === 0) return [];
  const sorted = [...offsetSegments].sort(
    (a, b) => a.originalStart - b.originalStart
  );

  const resolved = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const current = { ...sorted[i] };
    const last = resolved[resolved.length - 1];

    if (current.start < last.end) {
      const overlap = last.end - current.start;
      const half = overlap / 2;
      last.end = last.end - half;
      current.start = current.start + half;
    }

    if (last.end < last.start) last.end = last.start;
    if (current.end < current.start) current.end = current.start;

    resolved.push(current);
  }

  return resolved;
}

export function calculateConfidence(exclusiveTimeSeconds) {
  const t = Math.max(0, Number(exclusiveTimeSeconds ?? 0));
  if (!Number.isFinite(t) || t <= 0) return 0;
  const c = 1 - Math.exp(-CONFIDENCE.DECAY_CONSTANT * t);
  return Math.min(CONFIDENCE.MAX_CONFIDENCE, Math.max(0, c));
}

// ----------------------------- Historical averaging -----------------------------

export function estimateBallPerSecond(
  currentBps,
  currentConfidence,
  matchDataTeams,
  teamNumber,
  totalShootingTime,
  decayRate = HISTORICAL_AVERAGING.DECAY_RATE
) {
  const confC = clamp01(currentConfidence);
  const bpsC = Number(currentBps ?? 0);
  const shootingTime = Number(totalShootingTime ?? 0);

  if (
    confC >= HISTORICAL_AVERAGING.LOW_CONFIDENCE_THRESHOLD ||
    shootingTime <= HISTORICAL_AVERAGING.MIN_TOTAL_SHOOTING_TIME_FOR_AVERAGING
  ) {
    return bpsC;
  }

  const historical = (matchDataTeams || []).filter(
    (t) => t.teamNumber === teamNumber
  );
  if (historical.length < HISTORICAL_AVERAGING.MIN_HISTORICAL_MATCHES)
    return bpsC;

  let weightedSum = bpsC * confC;
  let weightSum = confC;

  for (const m of historical) {
    const matchesAgo = Math.max(1, Number(m.matchesAgo ?? 1));
    const recencyFactor = Math.pow(decayRate, matchesAgo);
    const weight = clamp01(m.quality ?? 0) * recencyFactor;

    weightedSum += Number(m.ballsPerSecond ?? 0) * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : bpsC;
}

// ----------------------------- HUB logic -----------------------------

function getAutoFuelFromTimeline(scoreTimeline) {
  const incs = filterFuelIncrements(scoreTimeline);
  let autoFuel = 0;
  for (const i of incs) {
    if (i.time <= MATCH_TIMING.TRANSITION_SHIFT_END) autoFuel += i.increment;
  }
  return autoFuel;
}

function determineAutoWinner(videoScoreDoc) {
  const redAuto = getAutoFuelFromTimeline(
    videoScoreDoc?.redScoreTimeline || []
  );
  const blueAuto = getAutoFuelFromTimeline(
    videoScoreDoc?.blueScoreTimeline || []
  );
  if (redAuto > blueAuto) return "red";
  if (blueAuto > redAuto) return "blue";
  return "tie";
}

function getHubActivePeriods(alliance, autoWinner) {
  const periods = [];

  periods.push({ start: 0, end: MATCH_TIMING.TRANSITION_END });
  periods.push({
    start: MATCH_TIMING.SHIFT4_END,
    end: MATCH_TIMING.END_GAME_END,
  });

  const shifts = [
    { start: MATCH_TIMING.TRANSITION_END, end: MATCH_TIMING.SHIFT1_END },
    { start: MATCH_TIMING.SHIFT1_END, end: MATCH_TIMING.SHIFT2_END },
    { start: MATCH_TIMING.SHIFT2_END, end: MATCH_TIMING.SHIFT3_END },
    { start: MATCH_TIMING.SHIFT3_END, end: MATCH_TIMING.SHIFT4_END },
  ];

  const shift1ActiveAlliance = autoWinner === "red" ? "blue" : "red";

  shifts.forEach((sh, idx) => {
    const activeAlliance =
      idx % 2 === 0
        ? shift1ActiveAlliance
        : autoWinner === "tie"
        ? "blue"
        : autoWinner;
    if (alliance === activeAlliance)
      periods.push({ start: sh.start, end: sh.end });
  });

  return periods;
}

// ----------------------------- Firestore reads -----------------------------

async function getVideoScoreData(matchNumber) {
  const qy = query(
    collection(firebase, "videoScoreData"),
    where("matchNumber", "==", String(matchNumber)),
    limit(1)
  );
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

async function getTimerScoutData(matchNumber, scouterTeam) {
  // Query by match and scouterTeam to get all entries from this scouter's team for this match
  const qy = query(
    collection(firebase, "timerScoutData"),
    where("match", "==", String(matchNumber)),
    where("scouterTeam", "==", String(scouterTeam))
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => d.data());
}

async function getFuelScoutData(matchNumber) {
  const c = collection(firebase, "fuelScoutData");

  const qMatch = query(c, where("match", "==", String(matchNumber)));
  const sMatch = await getDocs(qMatch);
  if (!sMatch.empty) return sMatch.docs.map((d) => d.data());

  const qMatchNumber = query(
    c,
    where("matchNumber", "==", String(matchNumber))
  );
  const sMatchNumber = await getDocs(qMatchNumber);
  return sMatchNumber.docs.map((d) => d.data());
}

async function getMatchDataHistory(matchNumber, teamNumber) {
  const qy = query(
    collection(firebase, "matchData"),
    where("matchNumber", "<", Number(matchNumber)),
    orderBy("matchNumber", "desc"),
    limit(HISTORICAL_AVERAGING.MAX_MATCHES_TO_LOOK_BACK)
  );

  const snap = await getDocs(qy);

  let ago = 0;
  const out = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const teams = Array.isArray(data?.teams) ? data.teams : [];
    const entry = teams.find(
      (t) => Number(t.teamNumber) === Number(teamNumber)
    );
    if (!entry) continue;
    ago += 1;
    out.push({
      teamNumber: Number(teamNumber),
      ballsPerSecond: Number(entry.ballsPerSecond ?? 0),
      confidence: clamp01(entry.confidence),
      quality: Number(entry.quality ?? entry.confidence ?? 0),
      matchesAgo: ago,
    });
  }

  return out;
}

/**
 * Fetch prior matchData entries for teams in this match so defense weighting
 * can use historical totalFuel / wasDefending / wasDefendedAgainst / defenseMetric
 */
async function getHistoricalDefenseData(matchNumber, teamNumbers = []) {
  if (!Array.isArray(teamNumbers) || teamNumbers.length === 0) return [];

  const qy = query(
    collection(firebase, "matchData"),
    where("matchNumber", "<", Number(matchNumber)),
    orderBy("matchNumber", "desc"),
    limit(50)
  );

  const snap = await getDocs(qy);
  const wanted = new Set(teamNumbers.map((t) => Number(t)));
  const out = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const teams = Array.isArray(data?.teams) ? data.teams : [];

    for (const team of teams) {
      const teamNumber = Number(team.teamNumber ?? team.team);
      if (!wanted.has(teamNumber)) continue;

      out.push({
        team: teamNumber,
        teamNumber,
        totalFuel: Number(team.totalFuel ?? 0),
        wasDefending:
          Boolean(team.wasDefending) ||
          (Array.isArray(team.quickFeedback) &&
            team.quickFeedback.includes("Defended")),
        wasDefendedAgainst:
          Boolean(team.wasDefendedAgainst) ||
          (Array.isArray(team.quickFeedback) &&
            team.quickFeedback.includes("Was Defended Against")),
        defenseMetric: Number(team.defenseMetric ?? 0),
      });
    }
  }

  return out;
}

// ----------------------------- Attribution utilities -----------------------------

function attributeIncrementsToSegments(increments, resolvedOffsetSegments) {
  const segFuel = resolvedOffsetSegments.map(() => ({
    autoFuel: 0,
    teleFuel: 0,
    totalFuel: 0,
  }));

  for (const inc of increments) {
    const t = inc.time;
    const v = inc.increment;

    let hit = -1;
    for (let i = 0; i < resolvedOffsetSegments.length; i++) {
      const s = resolvedOffsetSegments[i];
      if (t >= s.start && t <= s.end) {
        hit = i;
        break;
      }
    }
    if (hit === -1) continue;

    const buckets = splitAutoTeleByTime(t, v);
    segFuel[hit].autoFuel += buckets.auto;
    segFuel[hit].teleFuel += buckets.tele;
    segFuel[hit].totalFuel += v;
  }

  return segFuel;
}

function distributeMultipleSegmentFuel({
  robots,
  duration,
  fuelAuto,
  fuelTele,
  bpsByRobot,
  addFuel,
}) {
  const idxs = robots;
  const known = idxs.filter((i) => Number(bpsByRobot[i] ?? 0) > 0);
  const unknown = idxs.filter((i) => !(Number(bpsByRobot[i] ?? 0) > 0));

  const distBucket = (bucketFuel, isAuto) => {
    if (bucketFuel <= 0) return;

    if (known.length === 0) {
      const each = bucketFuel / idxs.length;
      for (const i of idxs) addFuel(i, isAuto ? each : 0, isAuto ? 0 : each);
      return;
    }

    if (known.length === idxs.length) {
      const totalBps = known.reduce((s, i) => s + Number(bpsByRobot[i]), 0);
      if (totalBps <= 0) {
        const each = bucketFuel / idxs.length;
        for (const i of idxs) addFuel(i, isAuto ? each : 0, isAuto ? 0 : each);
        return;
      }

      for (const i of known) {
        const share = (Number(bpsByRobot[i]) / totalBps) * bucketFuel;
        addFuel(i, isAuto ? share : 0, isAuto ? 0 : share);
      }
      return;
    }

    const knownExpected = known.reduce(
      (s, i) => s + Number(bpsByRobot[i]) * duration,
      0
    );

    if (knownExpected <= 0) {
      const each = bucketFuel / idxs.length;
      for (const i of idxs) addFuel(i, isAuto ? each : 0, isAuto ? 0 : each);
      return;
    }

    if (knownExpected >= bucketFuel) {
      const scale = bucketFuel / knownExpected;
      for (const i of known) {
        const share = Number(bpsByRobot[i]) * duration * scale;
        addFuel(i, isAuto ? share : 0, isAuto ? 0 : share);
      }
      return;
    }

    for (const i of known) {
      const share = Number(bpsByRobot[i]) * duration;
      addFuel(i, isAuto ? share : 0, isAuto ? 0 : share);
    }

    const remaining = bucketFuel - knownExpected;
    if (unknown.length === 0) return;
    const each = remaining / unknown.length;
    for (const i of unknown) addFuel(i, isAuto ? each : 0, isAuto ? 0 : each);
  };

  distBucket(fuelAuto, true);
  distBucket(fuelTele, false);
}

// ----------------------------- Video Method (per alliance) -----------------------------

async function runVideoMethodForAlliance({
  allianceTeams,
  scoreTimeline,
  matchNumber,
}) {
  const robotTimes = allianceTeams.map((t) => t.shootingTimesAdjustedCropped);

  const segments = findExclusiveAndMultipleShootingTimes(robotTimes);

  const exclusiveTime = new Array(allianceTeams.length).fill(0);
  segments.forEach((seg) => {
    if (seg.type !== "exclusive") return;
    const idx = seg.robots[0];
    exclusiveTime[idx] += seg.duration;
  });

  const confidence = exclusiveTime.map((t) => calculateConfidence(t));

  const offsetSegments = createScoreboardOffset(segments);
  const resolved = resolveOverlaps(offsetSegments);

  const increments = filterFuelIncrements(scoreTimeline);
  const segFuel = attributeIncrementsToSegments(increments, resolved);

  const fuelAutoByRobot = new Array(allianceTeams.length).fill(0);
  const fuelTeleByRobot = new Array(allianceTeams.length).fill(0);
  const exclusiveFuelByRobot = new Array(allianceTeams.length).fill(0);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const f = segFuel[i];
    if (!f) continue;

    if (seg.type === "exclusive") {
      const idx = seg.robots[0];
      fuelAutoByRobot[idx] += f.autoFuel;
      fuelTeleByRobot[idx] += f.teleFuel;
      exclusiveFuelByRobot[idx] += f.totalFuel;
    }
  }

  const rawBps = allianceTeams.map((_, idx) => {
    const t = exclusiveTime[idx];
    if (t <= 0) return 0;
    return exclusiveFuelByRobot[idx] / t;
  });

  const bps = [...rawBps];

  const totalShootingTimes = allianceTeams.map((t) =>
    calculateTotalShootingTime(t.shootingTimesAdjustedCropped || [])
  );

  const histories = await Promise.all(
    allianceTeams.map(async (t, idx) => {
      const shouldUseHistorical =
        confidence[idx] < HISTORICAL_AVERAGING.LOW_CONFIDENCE_THRESHOLD &&
        totalShootingTimes[idx] >
          HISTORICAL_AVERAGING.MIN_TOTAL_SHOOTING_TIME_FOR_AVERAGING;

      if (!shouldUseHistorical) return [];
      return getMatchDataHistory(matchNumber, t.teamNumber);
    })
  );

  for (let i = 0; i < allianceTeams.length; i++) {
    const teamNumber = allianceTeams[i].teamNumber;
    bps[i] = estimateBallPerSecond(
      rawBps[i],
      confidence[i],
      histories[i],
      teamNumber,
      totalShootingTimes[i]
    );
  }

  const addFuel = (robotIdx, autoAdd, teleAdd) => {
    fuelAutoByRobot[robotIdx] += autoAdd;
    fuelTeleByRobot[robotIdx] += teleAdd;
  };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type !== "multiple") continue;

    const f = segFuel[i];
    if (!f || f.totalFuel <= 0) continue;

    distributeMultipleSegmentFuel({
      robots: seg.robots,
      duration: seg.duration,
      fuelAuto: f.autoFuel,
      fuelTele: f.teleFuel,
      bpsByRobot: bps,
      addFuel,
    });
  }

  return allianceTeams.map((t, idx) => {
    const autoFuel = fuelAutoByRobot[idx];
    const teleFuel = fuelTeleByRobot[idx];
    const totalFuel = autoFuel + teleFuel;

    const shootingTime = calculateTotalShootingTime(
      t.shootingTimesAdjustedCropped || []
    );

    return {
      team: Number(t.teamNumber),
      match: Number(matchNumber),
      alliance: t.alliance,
      autoFuel,
      teleFuel,
      totalFuel,
      ballsPerSec: bps[idx],
      shootingTime,
      confidence: confidence[idx],
      method: "video",
      autoClimb: typeof t.autoClimb === "number" ? t.autoClimb : 0,
      teleClimb: typeof t.teleClimb === "number" ? t.teleClimb : 0,
      quickFeedback: t.quickFeedback || [],
    };
  });
}

// ----------------------------- Basic Method (fallback) -----------------------------

function averageBpsFromBursts(bursts) {
  if (!Array.isArray(bursts) || bursts.length === 0) return 0;

  let sum = 0;
  let count = 0;
  for (const b of bursts) {
    if (!b) continue;
    const fuel = Number(b.fuelScored ?? 0);
    const dur = Number(b.duration ?? 0);
    if (!Number.isFinite(fuel) || !Number.isFinite(dur) || dur <= 0) continue;
    sum += fuel / dur;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

function sumAutoTeleTimeFromAdjustedTimes(adjustedTimes) {
  let autoTime = 0;
  let teleTime = 0;

  for (const t of adjustedTimes || []) {
    const s = Number(t.start);
    const e = Number(t.end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) continue;

    autoTime += overlapDuration(s, e, 0, MATCH_TIMING.AUTO_END);
    teleTime += overlapDuration(
      s,
      e,
      MATCH_TIMING.AUTO_END,
      MATCH_TIMING.END_GAME_END
    );
  }

  return { autoTime, teleTime };
}

// ----------------------------- Helper to get actual fuel from score timeline -----------------------------

function getActualFuelFromTimeline(scoreTimeline) {
  const incs = filterFuelIncrements(scoreTimeline);
  let autoFuel = 0;
  let teleFuel = 0;
  for (const i of incs) {
    if (i.time <= MATCH_TIMING.TRANSITION_SHIFT_END) {
      autoFuel += i.increment;
    } else {
      teleFuel += i.increment;
    }
  }
  return { autoFuel, teleFuel, totalFuel: autoFuel + teleFuel };
}

// ----------------------------- Defense Metrics Helpers -----------------------------

/**
 * Calculate defense metrics for all teams in a match
 * @param {Array} allTeams - All team results for this match with totalFuel calculated
 * @param {Array} historicalMatchData - Historical match data for all teams
 * @returns {Array} - Teams with defense metrics added
 */
export function calculateDefenseMetrics(allTeams, historicalMatchData = []) {
  if (!Array.isArray(allTeams) || allTeams.length === 0) {
    return [];
  }

  const defendingTeams = allTeams.filter((t) =>
    (t.quickFeedback || []).includes("Defended")
  );
  const defendedTeams = allTeams.filter((t) =>
    (t.quickFeedback || []).includes("Was Defended Against")
  );

  if (defendingTeams.length === 0) {
    return allTeams.map((t) => ({
      ...t,
      defenseMetric: -1,
    }));
  }

  const reductions = [];
  for (const defendedTeam of defendedTeams) {
    const historicalAvg = getHistoricalAverageFuelWhenNotDefended(
      defendedTeam.team,
      historicalMatchData
    );

    const baselineFuel =
      historicalAvg > 0
        ? historicalAvg
        : getCurrentMatchFallbackBaseline(defendedTeam.team, allTeams);

    if (baselineFuel <= 0) continue;

    const actualFuel = Number(defendedTeam.totalFuel ?? 0);
    const reduction = baselineFuel - actualFuel;

    if (reduction > 0) {
      reductions.push(reduction / baselineFuel);
    }
  }

  const avgReduction = average(reductions);

  let defenseCredits = [];

  if (defendingTeams.length === 1) {
    defenseCredits = [
      {
        team: defendingTeams[0].team,
        finalDefenseMetric: avgReduction,
      },
    ];
  } else {
    const historicalMetrics = defendingTeams.map((d) => ({
      team: d.team,
      historicalAvg: getHistoricalDefenseMetric(d.team, historicalMatchData),
    }));

    const totalHistorical = historicalMetrics.reduce(
      (sum, h) => sum + h.historicalAvg,
      0
    );

    if (totalHistorical === 0) {
      const equalShare = avgReduction / defendingTeams.length;
      defenseCredits = defendingTeams.map((d) => ({
        team: d.team,
        finalDefenseMetric: equalShare,
      }));
    } else {
      defenseCredits = historicalMetrics.map((h) => ({
        team: h.team,
        finalDefenseMetric:
          avgReduction * (h.historicalAvg / totalHistorical),
      }));
    }
  }

  return allTeams.map((team) => {
    const defenseInfo = defenseCredits.find((d) => d.team === team.team);
    const isDefending = (team.quickFeedback || []).includes("Defended");

    return {
      ...team,
      defenseMetric: isDefending
        ? Number(defenseInfo?.finalDefenseMetric ?? 0)
        : -1,
    };
  });
}

function getCurrentMatchFallbackBaseline(teamNumber, allTeams) {
  const peers = (allTeams || []).filter((t) => Number(t.team) !== Number(teamNumber));
  if (peers.length === 0) return 0;
  return average(peers.map((t) => Number(t.totalFuel ?? 0)));
}

/**
 * Get historical average fuel for a team when they were NOT defended against
 */
function getHistoricalAverageFuelWhenNotDefended(teamNumber, historicalMatchData) {
  if (!Array.isArray(historicalMatchData) || historicalMatchData.length === 0) {
    return 0;
  }

  const teamMatches = historicalMatchData.filter(
    (m) => Number(m.team ?? m.teamNumber) === Number(teamNumber)
  );

  const notDefendedMatches = teamMatches.filter((m) => !m.wasDefendedAgainst);

  if (notDefendedMatches.length === 0) {
    if (teamMatches.length === 0) return 0;
    return average(teamMatches.map((m) => Number(m.totalFuel ?? 0)));
  }

  return average(notDefendedMatches.map((m) => Number(m.totalFuel ?? 0)));
}

/**
 * Get a team's historical average defense metric from past matches
 */
function getHistoricalDefenseMetric(teamNumber, historicalMatchData) {
  if (!Array.isArray(historicalMatchData) || historicalMatchData.length === 0) {
    return 0;
  }

  const teamMatches = historicalMatchData.filter(
    (m) =>
      Number(m.team ?? m.teamNumber) === Number(teamNumber) && m.wasDefending
  );

  if (teamMatches.length === 0) return 0;

  return average(teamMatches.map((m) => Number(m.defenseMetric ?? 0)));
}

// ----------------------------- Main function -----------------------------

export async function calculateFuelScored(matchNumber, scouterTeam) {
  const m = Number(matchNumber);
  if (!Number.isFinite(m))
    throw new Error("calculateFuelScored: matchNumber must be a number");
  if (!scouterTeam)
    throw new Error("calculateFuelScored: scouterTeam is required");

  const videoScore = await getVideoScoreData(m);
  const timerDocs = await getTimerScoutData(m, scouterTeam);
  const fuelDocs = await getFuelScoutData(m);

  // Since we query by scouterTeam, timerDocs contains all teams scouted by this scouter's team
  // Create a map of team -> doc (should be one per team)
  const timerByTeam = new Map();
  for (const d of timerDocs) {
    const team = Number(d.team ?? d.teamNumber);
    if (!Number.isFinite(team)) continue;
    // Take the first (and should be only) entry for each team
    if (!timerByTeam.has(team)) {
      timerByTeam.set(team, d);
    }
  }

  const fuelByTeam = new Map();
  for (const d of fuelDocs) {
    const team = Number(d.team ?? d.teamNumber);
    if (!Number.isFinite(team)) continue;
    fuelByTeam.set(team, d);
  }

  const distinctTeams = new Set([...timerByTeam.keys()]);
  const canVideo =
    !!videoScore &&
    distinctTeams.size === 6 &&
    determineAutoWinner(videoScore) !== "tie";

  let actualRedFuel = { autoFuel: 0, teleFuel: 0, totalFuel: 0 };
  let actualBlueFuel = { autoFuel: 0, teleFuel: 0, totalFuel: 0 };

  if (videoScore) {
    actualRedFuel = getActualFuelFromTimeline(
      videoScore.redScoreTimeline || []
    );
    actualBlueFuel = getActualFuelFromTimeline(
      videoScore.blueScoreTimeline || []
    );
  }

  const allTeamNumbers = [...distinctTeams];
  const historicalDefenseData = await getHistoricalDefenseData(
    m,
    allTeamNumbers
  );

  if (canVideo) {
    const autoWinner = determineAutoWinner(videoScore);
    const redPeriods = getHubActivePeriods("red", autoWinner);
    const bluePeriods = getHubActivePeriods("blue", autoWinner);

    const redTeams = [];
    const blueTeams = [];

    for (const [, doc] of timerByTeam.entries()) {
      const teamNumber = Number(doc.team ?? doc.teamNumber);
      const allianceRaw = String(doc.alliance ?? "")
        .trim()
        .toLowerCase();
      const alliance =
        allianceRaw === "blue" ? "blue" : allianceRaw === "red" ? "red" : "";

      const rawTimes = Array.isArray(doc.shootingTimes)
        ? doc.shootingTimes
        : [];
      const merged = cleanAndMergeShootingTimes(rawTimes);
      const adjusted = adjustForScouterDelay(merged);

      const periods =
        alliance === "red"
          ? redPeriods
          : alliance === "blue"
          ? bluePeriods
          : null;
      const cropped = periods ? cropToActiveHub(adjusted, periods) : [];

      const entry = {
        teamNumber,
        alliance,
        shootingTimesAdjustedCropped: cropped,
        autoClimb: typeof doc.autoClimb === "number" ? doc.autoClimb : 0,
        teleClimb: typeof doc.teleopClimb === "number" ? doc.teleopClimb : 0,
        quickFeedback: doc.quickFeedback || [],
      };
      if (alliance === "red") redTeams.push(entry);
      else if (alliance === "blue") blueTeams.push(entry);
    }

    if (redTeams.length === 3 && blueTeams.length === 3) {
      const [redRes, blueRes] = await Promise.all([
        runVideoMethodForAlliance({
          allianceTeams: redTeams,
          scoreTimeline: videoScore.redScoreTimeline || [],
          matchNumber: m,
        }),
        runVideoMethodForAlliance({
          allianceTeams: blueTeams,
          scoreTimeline: videoScore.blueScoreTimeline || [],
          matchNumber: m,
        }),
      ]);

      const calculatedRedAutoFuel = redRes.reduce(
        (sum, r) => sum + r.autoFuel,
        0
      );
      const calculatedRedTeleFuel = redRes.reduce(
        (sum, r) => sum + r.teleFuel,
        0
      );
      const calculatedBlueAutoFuel = blueRes.reduce(
        (sum, r) => sum + r.autoFuel,
        0
      );
      const calculatedBlueTeleFuel = blueRes.reduce(
        (sum, r) => sum + r.teleFuel,
        0
      );

      const calculatedRedFuel = calculatedRedAutoFuel + calculatedRedTeleFuel;
      const calculatedBlueFuel =
        calculatedBlueAutoFuel + calculatedBlueTeleFuel;

      const redAccuracy =
        actualRedFuel.totalFuel > 0
          ? calculatedRedFuel / actualRedFuel.totalFuel
          : 0;
      const blueAccuracy =
        actualBlueFuel.totalFuel > 0
          ? calculatedBlueFuel / actualBlueFuel.totalFuel
          : 0;

      const adjustByPercentages = (
        results,
        actualFuel,
        calculatedAuto,
        calculatedTele
      ) => {
        return results.map((r) => {
          const autoPercentage =
            calculatedAuto > 0 ? r.autoFuel / calculatedAuto : 0;
          const telePercentage =
            calculatedTele > 0 ? r.teleFuel / calculatedTele : 0;

          const adjustedAutoFuel = roundFuel(
            autoPercentage * actualFuel.autoFuel
          );
          const adjustedTeleFuel = roundFuel(
            telePercentage * actualFuel.teleFuel
          );

          return {
            ...r,
            autoFuel: adjustedAutoFuel,
            teleFuel: adjustedTeleFuel,
            totalFuel: adjustedAutoFuel + adjustedTeleFuel,
          };
        });
      };

      const adjustedRedRes = adjustByPercentages(
        redRes,
        actualRedFuel,
        calculatedRedAutoFuel,
        calculatedRedTeleFuel
      );
      const adjustedBlueRes = adjustByPercentages(
        blueRes,
        actualBlueFuel,
        calculatedBlueAutoFuel,
        calculatedBlueTeleFuel
      );

      const finalVideoResults = [
        ...adjustedRedRes.map((r) => ({
          team: r.team,
          match: r.match,
          alliance: r.alliance,
          autoFuel: r.autoFuel,
          teleFuel: r.teleFuel,
          totalFuel: r.totalFuel,
          ballsPerSec: r.ballsPerSec,
          shootingTime: r.shootingTime,
          method: r.method,
          autoClimb: r.autoClimb,
          teleClimb: r.teleClimb,
          quickFeedback: r.quickFeedback,
          accuracy: redAccuracy,
          confidence: r.confidence,
          quality: calculateQuality(r, redAccuracy),
        })),
        ...adjustedBlueRes.map((r) => ({
          team: r.team,
          match: r.match,
          alliance: r.alliance,
          autoFuel: r.autoFuel,
          teleFuel: r.teleFuel,
          totalFuel: r.totalFuel,
          ballsPerSec: r.ballsPerSec,
          shootingTime: r.shootingTime,
          method: r.method,
          autoClimb: r.autoClimb,
          teleClimb: r.teleClimb,
          quickFeedback: r.quickFeedback,
          accuracy: blueAccuracy,
          confidence: r.confidence,
          quality: calculateQuality(r, blueAccuracy),
        })),
      ];

      return calculateDefenseMetrics(finalVideoResults, historicalDefenseData);
    }
  }

  const teams = new Set([...timerByTeam.keys(), ...fuelByTeam.keys()]);
  const results = [];

  for (const team of teams) {
    const tDoc = timerByTeam.get(team);
    const fDoc = fuelByTeam.get(team);
    if (!tDoc || !fDoc) continue;

    const allianceRaw = String(tDoc.alliance ?? "")
      .trim()
      .toLowerCase();
    const alliance =
      allianceRaw === "blue" ? "blue" : allianceRaw === "red" ? "red" : "";

    const bursts = Array.isArray(fDoc.bursts) ? fDoc.bursts : [];
    const avgBps = averageBpsFromBursts(bursts);

    const rawTimes = Array.isArray(tDoc.shootingTimes)
      ? tDoc.shootingTimes
      : [];
    const merged = cleanAndMergeShootingTimes(rawTimes);
    const adjusted = adjustForScouterDelay(merged);

    const { autoTime, teleTime } = sumAutoTeleTimeFromAdjustedTimes(adjusted);

    const autoFuel = avgBps * autoTime;
    const teleFuel = avgBps * teleTime;

    const shootingTime = calculateTotalShootingTime(adjusted);

    const autoFuelRounded = roundFuel(autoFuel);
    const teleFuelRounded = roundFuel(teleFuel);

    results.push({
      team: Number(team),
      match: Number(m),
      alliance,
      autoFuel: autoFuelRounded,
      teleFuel: teleFuelRounded,
      totalFuel: autoFuelRounded + teleFuelRounded,
      ballsPerSec: avgBps,
      shootingTime,
      method: "basic",
      autoClimb: typeof tDoc.autoClimb === "number" ? tDoc.autoClimb : 0,
      teleClimb: typeof tDoc.teleopClimb === "number" ? tDoc.teleopClimb : 0,
      quickFeedback: tDoc.quickFeedback || [],
    });
  }

  const redResults = results.filter((r) => r.alliance === "red");
  const blueResults = results.filter((r) => r.alliance === "blue");

  const calculatedRedAutoFuel = redResults.reduce(
    (sum, r) => sum + r.autoFuel,
    0
  );
  const calculatedRedTeleFuel = redResults.reduce(
    (sum, r) => sum + r.teleFuel,
    0
  );
  const calculatedBlueAutoFuel = blueResults.reduce(
    (sum, r) => sum + r.autoFuel,
    0
  );
  const calculatedBlueTeleFuel = blueResults.reduce(
    (sum, r) => sum + r.teleFuel,
    0
  );

  const calculatedRedFuel = calculatedRedAutoFuel + calculatedRedTeleFuel;
  const calculatedBlueFuel = calculatedBlueAutoFuel + calculatedBlueTeleFuel;

  const redAccuracy =
    actualRedFuel.totalFuel > 0
      ? calculatedRedFuel / actualRedFuel.totalFuel
      : 0;
  const blueAccuracy =
    actualBlueFuel.totalFuel > 0
      ? calculatedBlueFuel / actualBlueFuel.totalFuel
      : 0;

  const adjustBasicByPercentages = (
    results,
    actualFuel,
    calculatedAuto,
    calculatedTele
  ) => {
    return results.map((r) => {
      const autoPercentage =
        calculatedAuto > 0 ? r.autoFuel / calculatedAuto : 0;
      const telePercentage =
        calculatedTele > 0 ? r.teleFuel / calculatedTele : 0;

      const adjustedAutoFuel = roundFuel(autoPercentage * actualFuel.autoFuel);
      const adjustedTeleFuel = roundFuel(telePercentage * actualFuel.teleFuel);

      return {
        ...r,
        autoFuel: adjustedAutoFuel,
        teleFuel: adjustedTeleFuel,
        totalFuel: adjustedAutoFuel + adjustedTeleFuel,
      };
    });
  };

  const adjustedRedResults = adjustBasicByPercentages(
    redResults,
    actualRedFuel,
    calculatedRedAutoFuel,
    calculatedRedTeleFuel
  );
  const adjustedBlueResults = adjustBasicByPercentages(
    blueResults,
    actualBlueFuel,
    calculatedBlueAutoFuel,
    calculatedBlueTeleFuel
  );

  const finalBasicResults = [
    ...adjustedRedResults.map((r) => ({
      team: r.team,
      match: r.match,
      alliance: r.alliance,
      autoFuel: r.autoFuel,
      teleFuel: r.teleFuel,
      totalFuel: r.totalFuel,
      ballsPerSec: r.ballsPerSec,
      shootingTime: r.shootingTime,
      method: r.method,
      autoClimb: r.autoClimb,
      teleClimb: r.teleClimb,
      quickFeedback: r.quickFeedback,
      accuracy: redAccuracy,
      confidence: -1,
      quality: calculateQuality({ ...r, confidence: -1 }, redAccuracy),
    })),
    ...adjustedBlueResults.map((r) => ({
      team: r.team,
      match: r.match,
      alliance: r.alliance,
      autoFuel: r.autoFuel,
      teleFuel: r.teleFuel,
      totalFuel: r.totalFuel,
      ballsPerSec: r.ballsPerSec,
      shootingTime: r.shootingTime,
      method: r.method,
      autoClimb: r.autoClimb,
      teleClimb: r.teleClimb,
      quickFeedback: r.quickFeedback,
      accuracy: blueAccuracy,
      confidence: -1,
      quality: calculateQuality({ ...r, confidence: -1 }, blueAccuracy),
    })),
  ];

  return calculateDefenseMetrics(finalBasicResults, historicalDefenseData);
}

// Default export
export default calculateFuelScored;