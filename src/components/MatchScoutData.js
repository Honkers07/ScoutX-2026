import {
  MatchStage,
  StartPosition,
  IntakeElement,
  IntakeLocations,
  ElementPointsAuto,
  ElementPointsTele,
  CageLocation,
} from "./MatchConstants";
import { Scouters } from "./Scouters";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { Constants } from "../Constants";

// Import functions from AssignmentHelpers
import {
  getAssignmentForScouter,
  getNextAssignment,
  markAssignmentComplete,
} from "./pages/Assignments/AssignmentHelpers";

const climb = ["No Climb", "L1", "L2", "L3"];

const defaultData = [
  {
    prematchstage: MatchStage.PRE_MATCH,
    verificationCode: "",
    team: "",
    match: "",
    name: "",
    alliance: "",
  },
  {
    autostage: MatchStage.AUTO,
    leave: true,
    outtakeCounts: [],
    fuelScored: [],
    shootingTimes: [],
  },
  {
    telestage: MatchStage.TELEOP,
    climb: climb[0],
    outtakeCounts: [],
    fuelScored: [],
    shootingTimes: [],
  },
  {
    postmatchstage: MatchStage.POST_MATCH,
    defense: "",
    comments: "",
    quickFeedback: [],
    intakeBroken: false,
    outtakeBroken: false,
    elevatorBroken: false,
    armBroken: false,
    brownsOut: false,
    wobbly: false,
    canKnockAlgae: false,
    missesOuttakesConsistently: false,
    slowIntakes: false,
    disabled: false,
    goodDefenseFromOpponents: false,
    playedMajorityDefense: false,
    touchItOwnIt: false,
    aStopped: false,
    eStopped: false,
    knockedCage: false,
    failedClimb: false,
    trench: false,
    shuttle: false,
  },
  {
    metadatastage: MatchStage.METADATA,
    timestamp: new Date(),
  },
];
export default class MatchScoutData {
  constructor(setAlert) {
    this.stage = MatchStage.PRE_MATCH;
    this.data = defaultData;
    this.history = [];
    this.historyCounter = 0;
    this.setAlert = setAlert;

    this.alert = {
      open: false,
      message: "",
      severity: "success",
    };
  }

  // Get assignment for a scouter by name and match number
  getAssignmentForScouter(name, matchNumber) {
    return getAssignmentForScouter(name, matchNumber);
  }

  // Auto-fill fields based on scouter assignment
  // Returns the assignment info if found, null otherwise
  autoFillFromAssignment(name, matchNumber) {
    const assignment = getAssignmentForScouter(name, matchNumber);

    if (assignment) {
      // Auto-fill the prematch data
      this.data[MatchStage.PRE_MATCH]["match"] =
        assignment.match?.toString() || matchNumber.toString();
      this.data[MatchStage.PRE_MATCH]["alliance"] = assignment.alliance;
      this.data[MatchStage.PRE_MATCH]["start_position"] =
        assignment.position.toString();
      this.data[MatchStage.PRE_MATCH]["verificationCode"] =
        assignment.verificationCode || "";

      if (assignment.team) {
        this.data[MatchStage.PRE_MATCH]["team"] = assignment.team.toString();
      }

      return assignment;
    }

    return null;
  }

  // Get the next incomplete assignment for a scouter
  getNextAssignment(name) {
    return getNextAssignment(name);
  }

  // Auto-fill from next assignment after submission
  autoFillFromNextAssignment(name) {
    const nextAssignment = getNextAssignment(name);

    if (nextAssignment) {
      this.data[MatchStage.PRE_MATCH]["match"] =
        nextAssignment.match.toString();
      this.data[MatchStage.PRE_MATCH]["alliance"] = nextAssignment.alliance;
      this.data[MatchStage.PRE_MATCH]["start_position"] =
        nextAssignment.position.toString();
      this.data[MatchStage.PRE_MATCH]["verificationCode"] =
        nextAssignment.verificationCode || "";

      if (nextAssignment.team) {
        this.data[MatchStage.PRE_MATCH]["team"] =
          nextAssignment.team.toString();
      }

      return nextAssignment;
    }

    return null;
  }

  // Mark current assignment as completed
  async markCurrentAssignmentCompleted(name, matchNumber) {
    await markAssignmentComplete(name, matchNumber);
  }

  get(stage, path) {
    return this.data[stage][path];
  }

  getFuel(stage) {
    return this.data[stage]["fuelScored"];
  }

  getShootingTimes(stage) {
    return this.data[stage]["shootingTimes"];
  }

  addOuttakeEntry(
    stage,
    selectedIntakeElement,
    selectedIntakeLocation,
    timeElapsed,
    outtakeLocation
  ) {
    const target = this.data[stage]["outtakeCounts"];
    target.push({
      element: Object.keys(IntakeElement).find(
        (k) => IntakeElement[k] === selectedIntakeElement
      ),
      intakeLocation: Object.keys(IntakeLocations).find(
        (k) => IntakeLocations[k] === selectedIntakeLocation
      ),
      outtakeLocation: outtakeLocation,
      cycleTime: timeElapsed / 1000,
    });
  }

  addFuel(stage, value) {
    this.data[stage]["fuelScored"].push(value);
  }

  setFuel(stage, value) {
    const index = this.data[stage]["fuelScored"].length - 1;
    this.data[stage]["fuelScored"][index] = value;
    console.log(this.data[stage]["fuelScored"]);
  }

  addShootingTimes(stage, value) {
    this.data[stage]["shootingTimes"].push(value);
    console.log(this.data[stage]["shootingTimes"]);
  }

  setShootingTimes(stage, value) {
    const index = this.data[stage]["shootingTimes"].length - 1;
    this.data[stage]["shootingTimes"][index] = value;
    console.log(this.data[stage]["shootingTimes"]);
  }

  deleteShootingTimes(stage, index) {
    this.data[stage]["shootingTimes"].splice(index, 1);
    console.log(this.data[stage]["shootingTimes"]);
  }

  // Store shooting time ranges for Timer Page
  setShootingTimeRanges(ranges) {
    this.data[MatchStage.TELEOP]["shootingTimes"] = ranges;
    console.log("Shooting time ranges set:", ranges);
  }

  getShootingTimeRanges() {
    return this.data[MatchStage.TELEOP]["shootingTimes"];
  }

  setClimb(stage, value) {
    this.data[stage]["climb"] = climb[value];
  }

  deletePrevious(stage) {
    this.data[stage]["outtakeCounts"].pop();
  }

  delete(stage, index) {
    this.data[stage]["outtakeCounts"].splice(index, 1);
  }

  deleteFuel(stage, index) {
    this.data[stage]["fuelScored"].splice(index, 1);
  }

  getOuttakeCount(stage) {
    return this.data[stage]["outtakeCounts"].length;
  }

  setPostData(type, value) {
    this.data[MatchStage.POST_MATCH][type] = value;
  }

  getPostData(type) {
    return this.data[MatchStage.POST_MATCH][type];
  }

  set(stage, path, value) {
    this.history.push({
      id: ++this.historyCounter,
      stage: stage,
      path: path,
      value: this.data[stage][path],
      time: new Date(),
    });
    this.data[stage][path] = value;
  }

  deriveAutoOuttakeMetrics() {
    const autoOuttakeCounts = this.data[MatchStage.AUTO]["outtakeCounts"];

    const metrics = {
      // Coral
      AutoCoralScored: 0,
      AutoMissedCoral: 0,
      AutoCoralL1: 0,
      AutoCoralL2: 0,
      AutoCoralL3: 0,
      AutoCoralL4: 0,
      AutoMissedCoralL1: 0,
      AutoMissedCoralL2: 0,
      AutoMissedCoralL3: 0,
      AutoMissedCoralL4: 0,
      // Algae
      AutoAlgaeScored: 0,
      AutoMissedAlgae: 0,
      AutoAlgaeProcessor: 0,
      AutoAlgaeNet: 0,
      AutoMissedAlgaeProcessor: 0,
      AutoMissedAlgaeNet: 0,
      // Cycle
      AutoAvgCoralCycle: 0,
      AutoAvgAlgaeCycle: 0,
      // Intakes
      AutoCoralIntakeStation: 0,
      AutoCoralIntakeGround: 0,
      AutoAlgaeIntakeGround: 0,
      AutoAlgaeIntakeReef: 0,
    };

    let totalCoralCycleTime = 0;
    let coralCount = 0;
    let totalAlgaeCycleTime = 0;
    let algaeCount = 0;

    autoOuttakeCounts.forEach((entry) => {
      const { element, outtakeLocation, cycleTime, intakeLocation } = entry;
      const isMissed = outtakeLocation.includes("MISSED") ? true : false;

      if (element === "CORAL" && isMissed) {
        metrics.AutoMissedCoral++;
        if (outtakeLocation === "MISSED L1") metrics.AutoMissedCoralL1++;
        if (outtakeLocation === "MISSED L2") metrics.AutoMissedCoralL2++;
        if (outtakeLocation === "MISSED L3") metrics.AutoMissedCoralL3++;
        if (outtakeLocation === "MISSED L4") metrics.AutoMissedCoralL4++;
        if (intakeLocation === "GROUND") metrics.AutoCoralIntakeGround++;
        if (intakeLocation === "STATION") metrics.AutoCoralIntakeStation++;
        totalCoralCycleTime += cycleTime;
        coralCount++;
      } else if (element === "CORAL") {
        metrics.AutoCoralScored++;
        if (outtakeLocation === "L1") metrics.AutoCoralL1++;
        if (outtakeLocation === "L2") metrics.AutoCoralL2++;
        if (outtakeLocation === "L3") metrics.AutoCoralL3++;
        if (outtakeLocation === "L4") metrics.AutoCoralL4++;
        if (intakeLocation === "GROUND") metrics.AutoCoralIntakeGround++;
        if (intakeLocation === "STATION") metrics.AutoCoralIntakeStation++;
        totalCoralCycleTime += cycleTime;
        coralCount++;
      } else if (element === "ALGAE" && isMissed) {
        metrics.AutoMissedAlgae++;
        if (outtakeLocation === "MISSED PROCESSOR")
          metrics.AutoMissedAlgaeProcessor++;
        if (outtakeLocation === "MISSED NET") metrics.AutoMissedAlgaeNet++;
        if (intakeLocation === "GROUND") metrics.AutoAlgaeIntakeGround++;
        if (intakeLocation === "REEF") metrics.AutoAlgaeIntakeReef++;
        totalAlgaeCycleTime += cycleTime;
        algaeCount++;
      } else if (element === "ALGAE") {
        metrics.AutoAlgaeScored++;
        if (outtakeLocation === "PROCESSOR") metrics.AutoAlgaeProcessor++;
        if (outtakeLocation === "NET") metrics.AutoAlgaeNet++;
        if (intakeLocation === "GROUND") metrics.AutoAlgaeIntakeGround++;
        if (intakeLocation === "REEF") metrics.AutoAlgaeIntakeReef++;
        totalAlgaeCycleTime += cycleTime;
        algaeCount++;
      }
    });

    // Calculate averages
    metrics.AutoAvgCoralCycle =
      coralCount > 0 ? (totalCoralCycleTime / coralCount).toFixed(3) : 0;
    metrics.AutoAvgAlgaeCycle =
      algaeCount > 0 ? (totalAlgaeCycleTime / algaeCount).toFixed(3) : 0;

    return metrics;
  }

  deriveTeleOuttakeMetrics() {
    const teleOuttakeCounts = this.data[MatchStage.TELEOP]["outtakeCounts"];

    const metrics = {
      // Coral
      TeleCoralScored: 0,
      TeleMissedCoral: 0,
      TeleCoralL1: 0,
      TeleCoralL2: 0,
      TeleCoralL3: 0,
      TeleCoralL4: 0,
      TeleMissedCoralL1: 0,
      TeleMissedCoralL2: 0,
      TeleMissedCoralL3: 0,
      TeleMissedCoralL4: 0,
      // Algae
      TeleAlgaeScored: 0,
      TeleMissedAlgae: 0,
      TeleAlgaeProcessor: 0,
      TeleAlgaeNet: 0,
      TeleMissedAlgaeProcessor: 0,
      TeleMissedAlgaeNet: 0,
      // Cycle
      TeleAvgCoralCycle: 0,
      TeleAvgAlgaeCycle: 0,
      // Intakes
      TeleCoralIntakeStation: 0,
      TeleCoralIntakeGround: 0,
      TeleAlgaeIntakeGround: 0,
      TeleAlgaeIntakeReef: 0,
    };

    let totalCoralCycleTime = 0;
    let coralCount = 0;
    let totalAlgaeCycleTime = 0;
    let algaeCount = 0;

    teleOuttakeCounts.forEach((entry) => {
      const { element, outtakeLocation, cycleTime, intakeLocation } = entry;
      const isMissed = outtakeLocation.includes("MISSED") ? true : false;

      if (element === "CORAL" && isMissed) {
        metrics.TeleMissedCoral++;
        if (outtakeLocation === "MISSED L1") metrics.TeleMissedCoralL1++;
        if (outtakeLocation === "MISSED L2") metrics.TeleMissedCoralL2++;
        if (outtakeLocation === "MISSED L3") metrics.TeleMissedCoralL3++;
        if (outtakeLocation === "MISSED L4") metrics.TeleMissedCoralL4++;
        if (intakeLocation === "GROUND") metrics.TeleCoralIntakeGround++;
        if (intakeLocation === "STATION") metrics.TeleCoralIntakeStation++;
        totalCoralCycleTime += cycleTime;
        coralCount++;
      } else if (element === "CORAL") {
        metrics.TeleCoralScored++;
        if (outtakeLocation === "L1") metrics.TeleCoralL1++;
        if (outtakeLocation === "L2") metrics.TeleCoralL2++;
        if (outtakeLocation === "L3") metrics.TeleCoralL3++;
        if (outtakeLocation === "L4") metrics.TeleCoralL4++;
        if (intakeLocation === "GROUND") metrics.TeleCoralIntakeGround++;
        if (intakeLocation === "STATION") metrics.TeleCoralIntakeStation++;
        totalCoralCycleTime += cycleTime;
        coralCount++;
      } else if (element === "ALGAE" && isMissed) {
        metrics.TeleMissedAlgae++;
        if (outtakeLocation === "MISSED PROCESSOR")
          metrics.TeleMissedAlgaeProcessor++;
        if (outtakeLocation === "MISSED NET") metrics.TeleMissedAlgaeNet++;
        if (intakeLocation === "GROUND") metrics.TeleAlgaeIntakeGround++;
        if (intakeLocation === "REEF") metrics.TeleAlgaeIntakeReef++;
        totalAlgaeCycleTime += cycleTime;
        algaeCount++;
      } else if (element === "ALGAE") {
        metrics.TeleAlgaeScored++;
        if (outtakeLocation === "PROCESSOR") metrics.TeleAlgaeProcessor++;
        if (outtakeLocation === "NET") metrics.TeleAlgaeNet++;
        if (intakeLocation === "GROUND") metrics.TeleAlgaeIntakeGround++;
        if (intakeLocation === "REEF") metrics.TeleAlgaeIntakeReef++;
        totalAlgaeCycleTime += cycleTime;
        algaeCount++;
      }
    });

    // Calculate averages
    metrics.TeleAvgCoralCycle =
      coralCount > 0 ? (totalCoralCycleTime / coralCount).toFixed(3) : 0;
    metrics.TeleAvgAlgaeCycle =
      algaeCount > 0 ? (totalAlgaeCycleTime / algaeCount).toFixed(3) : 0;

    return metrics;
  }

  // Calculate derived summary metrics for analytics
  deriveSummaryMetrics() {
    const autoOuttakeCounts = this.data[MatchStage.AUTO]["outtakeCounts"];
    const teleOuttakeCounts = this.data[MatchStage.TELEOP]["outtakeCounts"];
    const climbPosition = this.data[MatchStage.TELEOP]["climb"];
    const leave = this.data[MatchStage.AUTO]["leave"];

    // Calculate Auto Points
    let autoCoralPoints = 0;
    let autoAlgaePoints = 0;
    let autoLeavePoints = leave ? ElementPointsAuto.LEAVE : 0;

    autoOuttakeCounts.forEach((entry) => {
      const { element, outtakeLocation } = entry;
      const isMissed = outtakeLocation.includes("MISSED");
      if (isMissed) return;

      if (element === "CORAL") {
        if (outtakeLocation === "L1")
          autoCoralPoints += ElementPointsAuto.CORALL1;
        else if (outtakeLocation === "L2")
          autoCoralPoints += ElementPointsAuto.CORALL2;
        else if (outtakeLocation === "L3")
          autoCoralPoints += ElementPointsAuto.CORALL3;
        else if (outtakeLocation === "L4")
          autoCoralPoints += ElementPointsAuto.CORALL4;
      } else if (element === "ALGAE") {
        if (outtakeLocation === "NET")
          autoAlgaePoints += ElementPointsAuto.ALGAENET;
        else if (outtakeLocation === "PROCESSOR")
          autoAlgaePoints += ElementPointsAuto.ALGAEPROCESSOR;
      }
    });

    // Calculate Teleop Points
    let teleCoralPoints = 0;
    let teleAlgaePoints = 0;
    let climbPoints = 0;

    teleOuttakeCounts.forEach((entry) => {
      const { element, outtakeLocation } = entry;
      const isMissed = outtakeLocation.includes("MISSED");
      if (isMissed) return;

      if (element === "CORAL") {
        if (outtakeLocation === "L1")
          teleCoralPoints += ElementPointsTele.CORALL1;
        else if (outtakeLocation === "L2")
          teleCoralPoints += ElementPointsTele.CORALL2;
        else if (outtakeLocation === "L3")
          teleCoralPoints += ElementPointsTele.CORALL3;
        else if (outtakeLocation === "L4")
          teleCoralPoints += ElementPointsTele.CORALL4;
      } else if (element === "ALGAE") {
        if (outtakeLocation === "NET")
          teleAlgaePoints += ElementPointsTele.ALGAENET;
        else if (outtakeLocation === "PROCESSOR")
          teleAlgaePoints += ElementPointsTele.ALGAEPROCESSOR;
      }
    });

    // Calculate Climb Points
    if (climbPosition === "L1") climbPoints = ElementPointsTele.PARK;
    else if (climbPosition === "L2") climbPoints = ElementPointsTele.SHALLOW;
    else if (climbPosition === "L3") climbPoints = ElementPointsTele.DEEP;

    const autoPoints = autoLeavePoints + autoCoralPoints + autoAlgaePoints;
    const telePoints = teleCoralPoints + teleAlgaePoints + climbPoints;
    const totalPoints = autoPoints + telePoints;

    // Calculate scoring rate (elements per second)
    const totalAutoElements = autoOuttakeCounts.filter(
      (e) => !e.outtakeLocation.includes("MISSED")
    ).length;
    const totalTeleElements = teleOuttakeCounts.filter(
      (e) => !e.outtakeLocation.includes("MISSED")
    ).length;
    const autoTime = 15; // Auto period is 15 seconds
    const teleTime = 135; // Teleop period is 135 seconds

    const coralPoints = autoCoralPoints + teleCoralPoints;
    const algaePoints = autoAlgaePoints + teleAlgaePoints;

    return {
      autoPoints: autoPoints,
      telePoints: telePoints,
      totalPoints: totalPoints,
      autoCoralPoints: autoCoralPoints,
      teleCoralPoints: teleCoralPoints,
      totalCoralPoints: coralPoints,
      autoAlgaePoints: autoAlgaePoints,
      teleAlgaePoints: teleAlgaePoints,
      totalAlgaePoints: algaePoints,
      climbPoints: climbPoints,
      autoLeavePoints: autoLeavePoints,
      autoElementsPerSecond:
        autoTime > 0 ? (totalAutoElements / autoTime).toFixed(3) : 0,
      teleElementsPerSecond:
        teleTime > 0 ? (totalTeleElements / teleTime).toFixed(3) : 0,
    };
  }

  async submit() {
    const isIncomplete =
      this.data[0]["team"] === "" ||
      this.data[0]["match"] === "" ||
      this.data[0]["name"] === "" ||
      this.data[0]["alliance"] === "" ||
      this.data[0]["verificationCode"] === "";

    if (
      isIncomplete &&
      this.data[0]["verificationCode"] !==
        process.env.REACT_APP_VERIFICATION_CODE
    ) {
      this.sendAlert("Incomplete Pre-Match Page and Incorrect Code", "error");
      return false;
    } else if (isIncomplete) {
      this.sendAlert("Incomplete Pre-Match Page", "error");
      return false;
    } else if (
      this.data[0]["verificationCode"] !==
      process.env.REACT_APP_VERIFICATION_CODE
    ) {
      this.sendAlert("Incorrect Verification Code", "error");
      return false;
    } else {
      this.setAlert({ open: false });
      this.set(MatchStage.METADATA, "timestamp", Date.now());
      const db = getFirestore();

      const autoOuttakeCounts = defaultData[1].outtakeCounts;
      const teleOuttakeCounts = defaultData[2].outtakeCounts;

      const autoioCount = defaultData[1].outtakeCounts.length;
      const teleioCount = defaultData[2].outtakeCounts.length;

      const teleClimbPosition = defaultData[2].climb;

      const autoMetrics = this.deriveAutoOuttakeMetrics();
      const teleMetrics = this.deriveTeleOuttakeMetrics();
      const summaryMetrics = this.deriveSummaryMetrics();

      let firebaseData = {
        autoioCount: autoioCount,
        teleioCount: teleioCount,
        autoOuttakeCounts: autoOuttakeCounts,
        teleOuttakeCounts: teleOuttakeCounts,
        ClimbPosition: teleClimbPosition,
      };

      firebaseData = {
        ...firebaseData,
        ...autoMetrics,
        ...teleMetrics,
        ...summaryMetrics,
      };

      for (const key in defaultData) {
        for (const inner in defaultData[key]) {
          firebaseData[`${inner}`] = `${defaultData[key][inner]}`;
        }
      }
      delete firebaseData.io;
      await setDoc(
        doc(
          db,
          "matchScoutData",
          defaultData[0].team + "_" + defaultData[0].match
        ),
        firebaseData
      );

      return true;
    }
  }

  sendAlert(message, severity) {
    this.setAlert({ open: true, message, severity }); // Use state updater
  }
}
