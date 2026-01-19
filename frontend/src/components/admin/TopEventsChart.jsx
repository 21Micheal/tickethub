// frontend/src/components/admin/TopEventsChart.jsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TopEventsChart = ({ events }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Top Events by Revenue',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'KES ' + value.toLocaleString();
          }
        }
      }
    }
  };

  const data = {
    labels: events.map(event => event.title.substring(0, 20) + (event.title.length > 20 ? '...' : '')),
    datasets: [
      {
        label: 'Revenue',
        data: events.map(event => event.revenue),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
      },
      {
        label: 'Bookings',
        data: events.map(event => event.bookings_count),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      }
    ]
  };

  return <Bar options={options} data={data} />;
};

export default TopEventsChart;
