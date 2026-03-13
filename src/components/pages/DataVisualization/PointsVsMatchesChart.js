import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const PointsVsMatchesChart = ({ chartData, title = "Points vs Matches" }) => {
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
            x: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                title: {
                    display: true,
                    text: 'Points',
                    color: 'rgba(255, 255, 255, 0.7)',
                },
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
            <Line data={chartData} options={options} />
        </div>
    );
};

export default PointsVsMatchesChart;
