import React from 'react';
import { Scatter } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const FuelVsClimbScatterChart = ({ chartData, title = "Element Points vs Climb Points" }) => {
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
                callbacks: {
                    label: function(context) {
                        const point = context.raw;
                        return `Match ${point.match}: (${point.x} pts, ${point.y} pts)`;
                    },
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Element Points (Coral/Algae)',
                    color: 'rgba(255, 255, 255, 0.7)',
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Climb Points',
                    color: 'rgba(255, 255, 255, 0.7)',
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
            },
        },
    };

    if (!chartData || !chartData.datasets || chartData.datasets[0].data.length === 0) {
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
            <Scatter data={chartData} options={options} />
        </div>
    );
};

export default FuelVsClimbScatterChart;
