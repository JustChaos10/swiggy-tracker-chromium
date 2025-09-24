// Load bundled Chart.js
(function() {
    'use strict';
    
    // Check if Chart.js is already loaded
    if (typeof Chart !== 'undefined') {
        console.log('Chart.js already loaded');
        window.dispatchEvent(new CustomEvent('chartjs-loaded'));
        return;
    }
    
    // Simple fallback Chart.js implementation
    const createFallbackChart = () => {
        console.log('Creating fallback Chart.js implementation');
        
        window.Chart = class FallbackChart {
            constructor(ctx, config) {
                this.ctx = ctx;
                this.config = config;
                this.data = config.data;
                this.type = config.type;
                this.canvas = ctx.canvas;
                this.renderFallback();
            }
            
            renderFallback() {
                const canvas = this.canvas;
                const ctx = this.ctx;
                const data = this.data;
                
                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Set canvas size
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                
                // Draw fallback message
                ctx.fillStyle = '#666';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Chart data available', canvas.width / 2, canvas.height / 2 - 10);
                ctx.fillText(`${data.labels ? data.labels.length : 0} data points`, canvas.width / 2, canvas.height / 2 + 10);
                
                // Draw a simple bar chart if we have data
                if (data.labels && data.datasets && data.datasets[0] && data.datasets[0].data) {
                    this.drawSimpleChart();
                }
            }
            
            drawSimpleChart() {
                const canvas = this.canvas;
                const ctx = this.ctx;
                const data = this.data;
                const labels = data.labels;
                const values = data.datasets[0].data;
                
                const padding = 40;
                const chartWidth = canvas.width - 2 * padding;
                const chartHeight = canvas.height - 2 * padding;
                
                // Find max value
                const maxValue = Math.max(...values);
                
                // Draw bars
                const barWidth = chartWidth / labels.length;
                ctx.fillStyle = '#ff6b35';
                
                labels.forEach((label, index) => {
                    const barHeight = (values[index] / maxValue) * chartHeight;
                    const x = padding + index * barWidth;
                    const y = canvas.height - padding - barHeight;
                    
                    ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
                });
            }
            
            destroy() {
                // Cleanup if needed
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        };
        
        window.dispatchEvent(new CustomEvent('chartjs-loaded'));
    };
    
    // Load bundled Chart.js (ensure it registers global Chart on this page)
    const loadChartJS = () => {
        const script = document.createElement('script');
        // If Chart already exists (e.g., preloaded via manifest), just emit event
        if (typeof window.Chart !== 'undefined') {
            console.log('Chart.js already present (preloaded)');
            window.ChartJSLib = window.Chart;
            window.dispatchEvent(new CustomEvent('chartjs-loaded'));
            return;
        }
        script.src = chrome.runtime.getURL('chart.js');
        script.async = false; // Load synchronously to ensure Chart is available immediately

        script.onload = function() {
            console.log('Chart.js loaded successfully from bundle');

            // Ensure Chart is available globally
            if (typeof window.Chart === 'undefined') {
                console.error('Chart.js loaded but Chart constructor not found');
                createFallbackChart();
                return;
            }

            // Dispatch event and also set a global flag
            window.ChartJSLib = window.Chart;
            window.dispatchEvent(new CustomEvent('chartjs-loaded'));
        };

        script.onerror = function() {
            console.error('Failed to load bundled Chart.js, using fallback');
            createFallbackChart();
        };

        document.head.appendChild(script);
    };
    
    // Load immediately if document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChartJS);
    } else {
        loadChartJS();
    }
})();
