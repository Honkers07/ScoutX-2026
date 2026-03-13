import React from 'react';
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const TeamPerformanceRadar = ({ chartData, title = "Team Performance Profile" }) => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#fff',
                    font: {
                        size: 12,
                    },
                },
            },
            title: {
                display: true,
                text: title,
                color: '#fff',
                font: {
                    size: 16,
                    weight: 'bold',
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: '#1565C0',
                borderWidth: 1,
            },
        },
        scales: {
            r: {
                angleLines: {
                    color: 'rgba(255, 255, 255, 0.2)',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.2)',
                },
                pointLabels: {
                    color: '#fff',
                    font: {
                        size: 11,
                    },
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    backdropColor: 'transparent',
                },
                suggestedMin: 0,
                suggestedMax: 100,
            },
        },
    };

    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '300px',
                color: 'rgba(255, 255, 255, 0.5)'
            }}>
                No match data available for chart
            </div>
        );
    }

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <Radar data={chartData} options={options} />
        </div>
    );
};

export default TeamPerformanceRadar;
