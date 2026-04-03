# Defense Metrics Plan

## Overview

This plan outlines the implementation of defense metrics for ScoutX:

1. **Defense Effectiveness Metric** - Calculated in FuelCalculator.js, measures how effectively a team defended against opponents
2. **Heavily Defended Metric** - Calculated in DataTable.js (visualization), percentage of matches where a team was targeted

---

## Data Source

During post-match scouting, scouter marks quick feedback buttons:
- **"Defended"** - Their team played defense against opponents
- **"Was Defended Against"** - Their team was targeted by opponent defense

These are stored in `quickFeedback` array in matchScoutData (e.g., `["Defended", "Was Defended Against"]`).

---

## Defense Effectiveness Metric (FuelCalculator.js)

### Core Logic

The defense metric calculates how much a defending team reduced the opponent's score by comparing the opponent's actual fuel when defended against their historical average fuel when NOT defended.

### Step-by-Step Algorithm

#### Step 1: Identify Defending Teams and Defended Teams

```javascript
const defendingTeams = allTeams.filter(t => 
    (t.quickFeedback || []).includes("Defended")
);
const defendedTeams = allTeams.filter(t => 
    (t.quickFeedback || []).includes("Was Defended Against")
);
```

#### Step 2: Calculate Average Reduction Across Defended Teams

For each defended team:
1. Get their historical average fuel when NOT defended
2. Compare to actual fuel in this match
3. Calculate reduction percentage

```javascript
const reductions = [];
for (const defendedTeam of defendedTeams) {
    const historicalAvg = getHistoricalAverageFuelWhenNotDefended(
        defendedTeam.teamNumber, 
        allMatchResults
    );
    
    if (historicalAvg === 0) continue; // Skip if historical is 0
    
    const actualFuel = defendedTeam.totalFuel;
    const reduction = historicalAvg - actualFuel;
    
    if (reduction > 0) {
        reductions.push(reduction / historicalAvg);
    }
}

const avgReduction = reductions.length > 0 ? average(reductions) : 0;
```

#### Step 3: Distribute Among Multiple Defenders

If multiple teams defended, use historical defense metrics for weighting:

```javascript
if (defendingTeams.length === 1) {
    return [{ team: defendingTeams[0].teamNumber, finalDefenseMetric: avgReduction }];
}

// Get historical metrics
const historicalMetrics = defendingTeams.map(d => ({
    team: d.teamNumber,
    historicalAvg: getHistoricalDefenseMetric(d.teamNumber, allMatchResults)
}));

const totalHistorical = historicalMetrics.reduce((sum, h) => sum + h.historicalAvg, 0);

if (totalHistorical === 0) {
    // No history, distribute equally
    const equalShare = avgReduction / defendingTeams.length;
    return defendingTeams.map(d => ({ team: d.teamNumber, finalDefenseMetric: equalShare }));
}

// Apply weights
return historicalMetrics.map(h => ({
    team: h.teamNumber,
    finalDefenseMetric: avgReduction * (h.historicalAvg / totalHistorical)
}));
```

---

## Heavily Defended Metric (DataTable.js)

```
Heavily Defended % = Matches with "Was Defended Against" / Total Matches
```

---

## Edge Cases

1. **No historical data**: Use overall average fuel
2. **Zero historical fuel**: Skip that team (not meaningful to compare)
3. **No defenders**: All teams get defenseMetric = 0
4. **No historical defense metrics**: Distribute equally
5. **Negative reduction**: Treat as 0

---

## Files to Modify

1. **FuelCalculator.js** - Add defense calculation functions
2. **DataTable.js** - Add aggregated columns

### Visualization Color Ranges

**Defense Metric:**
- Green: > 0.50 (50%+ reduction = excellent defense)
- Yellow: > 0.25 to 0.50 (25-50% reduction = average defense)
- Red: ≤ 0.25 (< 25% reduction = poor defense)

**Heavily Defended %:**
- Just display as percentage (e.g., 0.50 = 50%)
- No color coding needed

---

## Data Visualization Columns

### DataTable.js (Team Summary Table)

Add columns:
- **Average Defense Metric** - Average of defenseMetric across matches where team played defense (last 5 or total based on toggle)
- **Defended Against %** - Percentage of matches where team was defended against (last 5 or total based on toggle)

### TeamMatches.js (Per-Match Table)

Add columns:
- **Defense Metric** - Show actual value if team played defense, show "N/A" if team didn't play defense in that match
- **Was Defended** - Green = Yes (was defended against), Red = No (was not defended against)

For the **Average Row**:
- **Average Defense Metric** - Average of defenseMetric for matches where team played defense
- **Defended Against %** - Percentage of total matches where team was defended against (not just a boolean)

---

## Sample Calculations

### Example 1: Single Defender, Single Defended Team

- Team 1678 historical avg (NOT defended): 45 fuel
- Team 1678 actual fuel: 20 fuel
- Reduction: 45 - 20 = 25
- Reduction %: 25/45 = 0.556

**Result:** Team 254 gets defenseMetric = 0.56

### Example 2: Two Defenders, Two Defended Teams

**Step 1:** Average reduction across defended teams
- Team 1678: 55.6% reduction
- Team 333: 60.5% reduction
- Average = 58.1%

**Step 2:** Historical weights
- Team 254: 0.23 (41.8%)
- Team 111: 0.32 (58.2%)

**Step 3:** Apply weights
- Team 254: 0.581 × 0.418 = 0.24
- Team 111: 0.581 × 0.582 = 0.34

**Result:** Team 254 = 0.24, Team 111 = 0.34 (sum = 0.58 = avgReduction)