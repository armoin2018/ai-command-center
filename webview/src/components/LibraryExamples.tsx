/**
 * Library Usage Examples
 * 
 * This file demonstrates how to use the bundled libraries
 * (jQuery, Bootstrap, Lodash, Moment, Chart.js, Tabulator)
 * in your React components.
 */

import React, { useEffect, useRef } from 'react';
import { $, _, moment, Chart, Tabulator } from '../utils/libraries';

/**
 * Example Component demonstrating library usage
 */
export const LibraryExamplesComponent: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ========================================
    // jQuery Example - DOM manipulation
    // ========================================
    $('.demo-button').on('click', function() {
      $(this).toggleClass('active');
    });

    // ========================================
    // Lodash Example - Data manipulation
    // ========================================
    const data = [
      { id: 1, name: 'Epic 1', status: 'open', points: 13 },
      { id: 2, name: 'Story 1', status: 'done', points: 5 },
      { id: 3, name: 'Task 1', status: 'in-progress', points: 3 }
    ];

    // Group by status
    const groupedByStatus = _.groupBy(data, 'status');
    console.log('Grouped by status:', groupedByStatus);

    // Sum points
    const totalPoints = _.sumBy(data, 'points');
    console.log('Total points:', totalPoints);

    // ========================================
    // Moment.js Example - Date formatting
    // ========================================
    const now = moment();
    const formatted = now.format('MMMM Do YYYY, h:mm:ss a');
    const relativeTime = moment('2025-01-01').fromNow();
    console.log('Current time:', formatted);
    console.log('Relative time:', relativeTime);

    // ========================================
    // Chart.js Example - Create a chart
    // ========================================
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Epic', 'Story', 'Task', 'Bug'],
            datasets: [{
              label: 'Item Count',
              data: [12, 19, 8, 5],
              backgroundColor: [
                'rgba(59, 130, 246, 0.5)',  // Blue
                'rgba(168, 85, 247, 0.5)',   // Purple
                'rgba(34, 197, 94, 0.5)',    // Green
                'rgba(239, 68, 68, 0.5)'     // Red
              ],
              borderColor: [
                'rgb(59, 130, 246)',
                'rgb(168, 85, 247)',
                'rgb(34, 197, 94)',
                'rgb(239, 68, 68)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }
    }

    // ========================================
    // Tabulator Example - Create a data table
    // ========================================
    if (tableRef.current) {
      new Tabulator(tableRef.current, {
        data: data,
        layout: 'fitColumns',
        pagination: true,
        paginationSize: 10,
        columns: [
          { title: 'ID', field: 'id', width: 70 },
          { title: 'Name', field: 'name', editor: 'input' },
          { 
            title: 'Status', 
            field: 'status',
            formatter: (cell: any) => {
              const value = cell.getValue();
              const colors: Record<string, string> = {
                'todo': '#eab308',
                'open': '#3b82f6',
                'done': '#22c55e',
                'in-progress': '#14b8a6',
                'ready': '#f97316',
                'hold': '#6b7280'
              };
              return `<span style="color: ${colors[value]}">${value}</span>`;
            }
          },
          { title: 'Points', field: 'points', align: 'right' }
        ]
      });
    }

    // ========================================
    // Bootstrap Components - Initialize
    // ========================================
    // Bootstrap components are automatically initialized
    // You can use data attributes in your JSX:
    // <button data-bs-toggle="modal" data-bs-target="#myModal">

    // Cleanup
    return () => {
      $('.demo-button').off('click');
    };
  }, []);

  return (
    <div className="container mt-4">
      <h2>Library Usage Examples</h2>

      {/* Bootstrap Example - Card */}
      <div className="card mb-4">
        <div className="card-header">
          Bootstrap Card Component
        </div>
        <div className="card-body">
          <button className="btn btn-primary demo-button">
            Click me (jQuery)
          </button>
        </div>
      </div>

      {/* Chart.js Example */}
      <div className="card mb-4">
        <div className="card-header">
          Chart.js - Item Distribution
        </div>
        <div className="card-body">
          <canvas ref={chartRef} height="100"></canvas>
        </div>
      </div>

      {/* Tabulator Example */}
      <div className="card mb-4">
        <div className="card-header">
          Tabulator - Data Table
        </div>
        <div className="card-body">
          <div ref={tableRef}></div>
        </div>
      </div>

      {/* Bootstrap Modal Example */}
      <button 
        type="button" 
        className="btn btn-primary" 
        data-bs-toggle="modal" 
        data-bs-target="#exampleModal"
      >
        Launch Bootstrap Modal
      </button>

      <div className="modal fade" id="exampleModal" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Bootstrap Modal</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <p>This modal is powered by Bootstrap 5!</p>
              <p>Current time: {moment().format('LLL')}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Utility functions using bundled libraries
 */
export const LibraryUtils = {
  /**
   * Format a date using moment
   */
  formatDate: (date: Date | string, format = 'YYYY-MM-DD HH:mm:ss'): string => {
    return moment(date).format(format);
  },

  /**
   * Get relative time using moment
   */
  getRelativeTime: (date: Date | string): string => {
    return moment(date).fromNow();
  },

  /**
   * Deep clone object using lodash
   */
  deepClone: (obj: any): any => {
    return _.cloneDeep(obj);
  },

  /**
   * jQuery AJAX wrapper
   */
  ajax: (url: string, options: any = {}) => {
    return $.ajax(url, options);
  }
};
