/**
 * Data processing utilities for ScoutX 2026 FRC Data Visualization
 * Provides helper functions to transform Firestore data for charts
 */

/**
 * Build data for Points vs Matches line chart
 * @param {Array} matchData - Array of match scouting documents
 * @returns {Object} Chart.js data object
 */
export const buildPointsVsMatches = (matchData) => {
    const sortedMatches = [...matchData]
        .filter(m => m.matchNumber && m.totalPoints)
        .sort((a, b) => {
            const matchA = parseInt(a.matchNumber) || 0;
            const matchB = parseInt(b.matchNumber) || 0;
            return matchA - matchB;
        });

    return {
        labels: sortedMatches.map(m => `Match ${m.matchNumber}`),
        datasets: [
            {
                label: 'Total Points',
                data: sortedMatches.map(m => parseInt(m.totalPoints) || 0),
                borderColor: '#1565C0',
                backgroundColor: 'rgba(21, 101, 192, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Auto Points',
                data: sortedMatches.map(m => parseInt(m.autoPoints) || 0),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Teleop Points',
                data: sortedMatches.map(m => parseInt(m.telePoints) || 0),
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };
};

/**
 * Build data for Element Points (Coral/Algae) vs Climb scatter chart
 * @param {Array} matchData - Array of match scouting documents
 * @returns {Object} Chart.js scatter data object
 */
export const buildElementVsClimbScatter = (matchData) => {
    const validData = matchData.filter(m => 
        (m.totalCoralPoints || m.totalAlgaePoints) && m.climbPoints
    );

    const coralPoints = validData.map(m => ({
        x: parseInt(m.totalCoralPoints) || 0,
        y: parseInt(m.climbPoints) || 0,
        match: m.matchNumber,
        team: m.team,
    }));

    const algaePoints = validData.map(m => ({
        x: parseInt(m.totalAlgaePoints) || 0,
        y: parseInt(m.climbPoints) || 0,
        match: m.matchNumber,
        team: m.team,
    }));

    return {
        datasets: [
            {
                label: 'Coral Points',
                data: coralPoints,
                backgroundColor: '#FF6F00',
                pointRadius: 6,
                pointHoverRadius: 8,
            },
            {
                label: 'Algae Points',
                data: algaePoints,
                backgroundColor: '#4CAF50',
                pointRadius: 6,
                pointHoverRadius: 8,
            },
        ],
    };
};

/**
 * Build data for Team Performance Radar chart
 * @param {Array} matchData - Array of match scouting documents
 * @returns {Object} Chart.js radar data object
 */
export const buildTeamPerformanceRadar = (matchData) => {
    // Calculate averages across all matches
    const validMatches = matchData.filter(m => m.totalPoints);
    
    if (validMatches.length === 0) {
        return {
            labels: ['Total Points', 'Auto Points', 'Tele Points', 'Climb Points', 'Coral Points'],
            datasets: [{
                label: 'Team Performance',
                data: [0, 0, 0, 0, 0],
                backgroundColor: 'rgba(21, 101, 192, 0.3)',
                borderColor: '#1565C0',
                pointBackgroundColor: '#1565C0',
            }],
        };
    }

    const avgTotalPoints = validMatches.reduce((sum, m) => sum + (parseInt(m.totalPoints) || 0), 0) / validMatches.length;
    const avgAutoPoints = validMatches.reduce((sum, m) => sum + (parseInt(m.autoPoints) || 0), 0) / validMatches.length;
    const avgTelePoints = validMatches.reduce((sum, m) => sum + (parseInt(m.telePoints) || 0), 0) / validMatches.length;
    const avgClimbPoints = validMatches.reduce((sum, m) => sum + (parseInt(m.climbPoints) || 0), 0) / validMatches.length;
    const avgCoralPoints = validMatches.reduce((sum, m) => sum + (parseInt(m.totalCoralPoints) || 0), 0) / validMatches.length;

    // Normalize to 0-100 scale for radar chart
    const maxPoints = 50; // Adjust based on expected max
    const normalize = (val) => Math.min(100, (val / maxPoints) * 100);

    return {
        labels: [
            'Total Points',
            'Auto Points',
            'Tele Points',
            'Climb Points',
            'Coral Points'
        ],
        datasets: [
            {
                label: 'Team Performance (Avg)',
                data: [
                    normalize(avgTotalPoints),
                    normalize(avgAutoPoints),
                    normalize(avgTelePoints),
                    normalize(avgClimbPoints),
                    normalize(avgCoralPoints),
                ],
                backgroundColor: 'rgba(21, 101, 192, 0.3)',
                borderColor: '#1565C0',
                pointBackgroundColor: '#1565C0',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#1565C0',
            },
        ],
    };
};

/**
 * Build summary statistics for a team
 * @param {Array} matchData - Array of match scouting documents
 * @returns {Object} Summary statistics
 */
export const buildTeamSummary = (matchData) => {
    const validMatches = matchData.filter(m => m.totalPoints);
    
    if (validMatches.length === 0) {
        return {
            matchesScouted: 0,
            avgPoints: 0,
            avgAutoPoints: 0,
            avgTelePoints: 0,
            avgClimbPoints: 0,
            avgCoralPoints: 0,
            avgAlgaePoints: 0,
            maxPoints: 0,
            minPoints: 0,
        };
    }

    const totalPointsList = validMatches.map(m => parseInt(m.totalPoints) || 0);
    
    return {
        matchesScouted: validMatches.length,
        avgPoints: (totalPointsList.reduce((a, b) => a + b, 0) / validMatches.length).toFixed(1),
        avgAutoPoints: (validMatches.reduce((sum, m) => sum + (parseInt(m.autoPoints) || 0), 0) / validMatches.length).toFixed(1),
        avgTelePoints: (validMatches.reduce((sum, m) => sum + (parseInt(m.telePoints) || 0), 0) / validMatches.length).toFixed(1),
        avgClimbPoints: (validMatches.reduce((sum, m) => sum + (parseInt(m.climbPoints) || 0), 0) / validMatches.length).toFixed(1),
        avgCoralPoints: (validMatches.reduce((sum, m) => sum + (parseInt(m.totalCoralPoints) || 0), 0) / validMatches.length).toFixed(1),
        avgAlgaePoints: (validMatches.reduce((sum, m) => sum + (parseInt(m.totalAlgaePoints) || 0), 0) / validMatches.length).toFixed(1),
        maxPoints: Math.max(...totalPointsList),
        minPoints: Math.min(...totalPointsList),
    };
};

/**
 * Format match data for table display
 * @param {Array} matchData - Array of match scouting documents
 * @returns {Array} Formatted match data
 */
export const formatMatchDataForTable = (matchData) => {
    return matchData.map(m => ({
        matchNumber: m.matchNumber || '-',
        team: m.team || '-',
        totalPoints: parseInt(m.totalPoints) || 0,
        autoPoints: parseInt(m.autoPoints) || 0,
        telePoints: parseInt(m.telePoints) || 0,
        climbPoints: parseInt(m.climbPoints) || 0,
        totalCoralPoints: parseInt(m.totalCoralPoints) || 0,
        autoCoralPoints: parseInt(m.autoCoralPoints) || 0,
        teleCoralPoints: parseInt(m.teleCoralPoints) || 0,
        totalAlgaePoints: parseInt(m.totalAlgaePoints) || 0,
        autoAlgaePoints: parseInt(m.autoAlgaePoints) || 0,
        teleAlgaePoints: parseInt(m.teleAlgaePoints) || 0,
        climbPosition: m.ClimbPosition || 'No Climb',
        comments: m.comments || '',
    }));
};
