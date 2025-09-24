// Charts UI Components with clean design
class SwiggyChartsUI {
    constructor() {
        this.chartGenerator = new SwiggyChartGenerator();
        this.charts = {};
        this.currentView = 'grid'; // 'grid' or 'fullscreen'
        this._gridHtml = `
                <div class="swg-chart-container" data-chart="monthly-orders">
                    <div class="swg-chart-header">
                        <h4>📈 Monthly Orders</h4>
                        <button class="swg-chart-expand" title="Expand Chart">⤢</button>
                    </div>
                    <div class="swg-chart-content">
                        <canvas id="chart-monthly-orders"></canvas>
                        <div class="swg-chart-loading">Loading...</div>
                    </div>
                </div>
                <div class="swg-chart-container" data-chart="monthly-spend">
                    <div class="swg-chart-header">
                        <h4>💰 Monthly Spend</h4>
                        <button class="swg-chart-expand" title="Expand Chart">⤢</button>
                    </div>
                    <div class="swg-chart-content">
                        <canvas id="chart-monthly-spend"></canvas>
                        <div class="swg-chart-loading">Loading...</div>
                    </div>
                </div>
                <div class="swg-chart-container" data-chart="top-restaurants">
                    <div class="swg-chart-header">
                        <h4>🏪 Top Restaurants</h4>
                        <button class="swg-chart-expand" title="Expand Chart">⤢</button>
                    </div>
                    <div class="swg-chart-content">
                        <canvas id="chart-top-restaurants"></canvas>
                        <div class="swg-chart-loading">Loading...</div>
                    </div>
                </div>
                <div class="swg-chart-container" data-chart="weekday-orders">
                    <div class="swg-chart-header">
                        <h4>📅 Orders by Weekday</h4>
                        <button class="swg-chart-expand" title="Expand Chart">⤢</button>
                    </div>
                    <div class="swg-chart-content">
                        <canvas id="chart-weekday-orders"></canvas>
                        <div class="swg-chart-loading">Loading...</div>
                    </div>
                </div>
                <div class="swg-chart-container" data-chart="time-ordered">
                    <div class="swg-chart-header">
                        <h4>⏰ Most Ordered Times</h4>
                        <button class="swg-chart-expand" title="Expand Chart">⤢</button>
                    </div>
                    <div class="swg-chart-content">
                        <canvas id="chart-time-ordered"></canvas>
                        <div class="swg-chart-loading">Loading...</div>
                    </div>
                </div>`;
    }

    createChartsSection() {
        const section = document.createElement('div');
        section.className = 'swg-charts-section';
        section.innerHTML = `
            <div class="swg-charts-header">
                <h3>📊 Analytics Dashboard</h3>
                <div class="swg-charts-controls">
                    <button class="swg-btn alt" id="swg-refresh-charts" title="Refresh Charts">
                        <span>🔄</span>
                    </button>
                    <button class="swg-btn alt" id="swg-debug-charts" title="Debug Charts">
                        <span>🐛</span>
                    </button>
                    <button class="swg-btn alt" id="swg-toggle-view" title="Toggle View">
                        <span>📱</span>
                    </button>
                </div>
            </div>
            <div class="swg-charts-grid" id="swg-charts-grid">${this._gridHtml}</div>
        `;

        this.setupChartEventListeners(section);
        return section;
    }

    setupChartEventListeners(section) {
        // Set up icons for buttons
        this.setupButtonIcons(section);

        // Refresh charts button
        section.querySelector('#swg-refresh-charts').addEventListener('click', () => {
            this.refreshAllCharts();
        });

        // Debug charts button
        section.querySelector('#swg-debug-charts').addEventListener('click', () => {
            this.debugCharts();
            this.toast('Check console for debug info');
        });

        // Toggle view button
        section.querySelector('#swg-toggle-view').addEventListener('click', () => {
            this.toggleView();
        });

        // Chart expand buttons
        section.querySelectorAll('.swg-chart-expand').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const container = e.target.closest('.swg-chart-container');
                const chartType = container.dataset.chart;
                this.expandChart(chartType);
            });
        });
    }

    setupButtonIcons(section) {
        try {
            const svg = (p) => `\n<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" style="vertical-align:middle">${p}</svg>`;
            const PATHS = {
                refresh: '<path d="M17.65 6.35A7.958 7.958 0 0012 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 01-9.9 1h-2.02A7 7 0 1019 12c0-1.61-.55-3.09-1.35-4.35z"/>',
                // Simpler debug icon path to ensure visibility
                bug: '<path d="M19 8h-1.28a6 6 0 00-2.22-2.22L16 4h-2l-.5 1.5a6 6 0 00-3 0L10 4H8l.5 1.78A6 6 0 006.28 8H5v2h1v1H5v2h1v1H5v2h2.05A7 7 0 0011 21v-5H9v-2h2v-2H9V9h2V6.9a7 7 0 013 0V9h2v2h-2v2h2v2h-2v5a7 7 0 003.95-3H19v-2h-1v-1h1v-2h-1v-1h1V8z"/>',
                view: '<path d="M4 4h16v16H4z" fill="none"/><path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 13h4v4h-4z"/>'
            };

            const setBtn = (selector, which, label) => {
                const btn = section.querySelector(selector);
                if (!btn) return;
                btn.setAttribute('aria-label', label);
                btn.setAttribute('title', label);
                btn.innerHTML = svg(PATHS[which]);
            };

            setBtn('#swg-refresh-charts', 'refresh', 'Refresh');
            setBtn('#swg-debug-charts', 'bug', 'Debug');
            setBtn('#swg-toggle-view', 'view', 'Toggle View');

            // Replace expand icons on each card with an inline SVG
            section.querySelectorAll('.swg-chart-expand').forEach(btn => {
                btn.innerHTML = svg('<path d="M7 14H5v5h5v-2H7v-3zm12-9h-5v2h3v3h2V5zM7 7h3V5H5v5h2V7zm12 12h-3v2h5v-5h-2v3z"/>');
                btn.setAttribute('aria-label', 'Expand');
                btn.setAttribute('title', 'Expand Chart');
                btn.style.display = 'inline-flex';
                btn.style.alignItems = 'center';
                btn.style.justifyContent = 'center';
                btn.style.width = '28px';
                btn.style.height = '28px';
            });
        } catch (error) {
            console.warn('Failed to set up button icons:', error);
            // Fallback to emoji/text if SVG fails
            try {
                const dbg = section.querySelector('#swg-debug-charts');
                if (dbg && !dbg.innerHTML.trim()) dbg.textContent = '🐛';
            } catch (_) {}
        }
    }

    async refreshAllCharts() {
        try {
            if (!window.swiggyTracker) {
                console.error('swiggyTracker not available');
                this.toast('Tracker not ready, please refresh page');
                return;
            }
            
            const orders = await window.swiggyTracker.getAllOrders();
            if (!orders.length) {
                this.showNoDataMessage();
                return;
            }

            this.toast('Generating charts...');
            
            // Ensure grid exists and remove any no-data banner
            const grid = document.getElementById('swg-charts-grid');
            if (grid) {
                if (!grid.querySelector('.swg-chart-container')) {
                    grid.innerHTML = this._gridHtml;
                }
                const nd = grid.querySelector('.swg-no-data');
                if (nd) nd.remove();
            }

            const chartTypes = ['monthly-orders', 'monthly-spend', 'top-restaurants', 'weekday-orders', 'time-ordered'];
            
            for (const chartType of chartTypes) {
                await this.generateChart(orders, chartType);
            }
            
            this.toast('Charts updated!');
        } catch (error) {
            console.error('Error in refreshAllCharts:', error);
            this.toast('Error updating charts');
        }
    }

    // Method to manually refresh charts (can be called from outside)
    async refreshCharts() {
        try {
            // Wait for Chart.js to be loaded
            if (typeof Chart === 'undefined') {
                console.log('Waiting for Chart.js to load...');
                await new Promise((resolve) => {
                    const checkChart = () => {
                        if (typeof Chart !== 'undefined') {
                            resolve();
                        } else {
                            setTimeout(checkChart, 100);
                        }
                    };
                    checkChart();
                });
            }
            
            await this.refreshAllCharts();
        } catch (error) {
            console.error('Error refreshing charts:', error);
            this.toast('Error refreshing charts');
        }
    }

    async generateChart(orders, chartType) {
        let container = document.querySelector(`[data-chart="${chartType}"]`);
        if (!container) {
            // Rebuild grid if it was replaced by a no-data message
            const grid = document.getElementById('swg-charts-grid');
            if (grid) {
                console.warn(`Chart container missing for ${chartType}, rebuilding grid`);
                grid.innerHTML = this._gridHtml;
                this.setupChartEventListeners(grid.closest('.swg-charts-section') || document);
                container = document.querySelector(`[data-chart="${chartType}"]`);
            }
            if (!container) {
                console.warn(`Chart container not found for ${chartType}`);
                return;
            }
        }

        const canvas = container.querySelector('canvas');
        const loading = container.querySelector('.swg-chart-loading');
        
        if (!canvas || !loading) {
            console.warn(`Canvas or loading element not found for ${chartType}`);
            return;
        }
        
        // Show loading
        loading.style.display = 'block';
        canvas.style.display = 'none';

        try {
            let chartData;
            
            // Generate chart data using local methods (Groq API is unreliable)
            if (chartType === 'monthly-orders' || chartType === 'monthly-spend') {
                chartData = this.chartGenerator.generateFallbackChart(orders, chartType);
            } else if (chartType === 'top-restaurants') {
                chartData = this.chartGenerator.generateRestaurantChart(orders);
            } else if (chartType === 'weekday-orders') {
                chartData = this.chartGenerator.generateWeekdayChart(orders);
            } else if (chartType === 'time-ordered') {
                chartData = this.chartGenerator.generateTimeChart(orders);
            }

            if (chartData && chartData.labels && chartData.datasets) {
                this.renderChart(canvas, chartData, chartType);
            } else {
                console.error(`Invalid chart data for ${chartType}:`, chartData);
                this.showChartError(container);
            }
        } catch (error) {
            console.error(`Error generating ${chartType} chart:`, error);
            this.showChartError(container);
        } finally {
            loading.style.display = 'none';
            canvas.style.display = 'block';
        }
    }

    renderChart(canvas, data, chartType, store = true) {
        // Validate inputs
        if (!canvas || !data || !chartType) {
            console.error('Invalid parameters for renderChart:', { canvas, data, chartType });
            return;
        }
        
        // Wait for Chart.js to be loaded with improved retry logic
        if (typeof Chart === 'undefined' && typeof window.ChartJSLib === 'undefined') {
            // Add retry counter to prevent infinite loops
            if (!this.chartRetryCount) this.chartRetryCount = 0;
            if (this.chartRetryCount < 100) { // Max 10 seconds of retries
                this.chartRetryCount++;

                // Listen for Chart.js loaded event
                const handleChartJSLoaded = () => {
                    window.removeEventListener('chartjs-loaded', handleChartJSLoaded);
                    this.chartRetryCount = 0;
                    console.log(`Chart.js loaded after ${this.chartRetryCount} retries`);
                    this.renderChart(canvas, data, chartType);
                };

                window.addEventListener('chartjs-loaded', handleChartJSLoaded);

                setTimeout(() => {
                    window.removeEventListener('chartjs-loaded', handleChartJSLoaded);
                    if (typeof Chart === 'undefined' && typeof window.ChartJSLib === 'undefined') {
                        this.renderChart(canvas, data, chartType);
                    }
                }, 100);
                return;
            } else {
                console.error('Chart.js failed to load after multiple retries, using fallback');
                const container = canvas.closest('.swg-chart-container');
                if (container) {
                    // Continue with fallback chart implementation
                    this.renderFallbackChart(container, data, chartType);
                }
                return;
            }
        }

        // Use Chart from global scope or fallback to ChartJSLib
        let ChartConstructor = typeof Chart !== 'undefined' ? Chart : window.ChartJSLib;

        // If neither is available, create a fallback chart constructor
        if (!ChartConstructor) {
            console.warn('Chart.js not available, creating fallback chart constructor');
            ChartConstructor = class FallbackChart {
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
        }
        
        // Reset retry counter on success
        this.chartRetryCount = 0;

        // Destroy existing chart if it exists (only if we're updating the mini chart)
        if (store && this.charts[chartType]) {
            try {
                this.charts[chartType].destroy();
            } catch (e) {
                console.warn('Error destroying existing chart:', e);
            }
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get canvas context');
            return;
        }
        
        const config = {
            type: chartType.includes('monthly') ? 'line' : 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#ff6b35',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#222',
                            maxRotation: 0,
                            autoSkip: true,
                            autoSkipPadding: 8
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#222',
                            precision: 0
                        }
                    }
                }
            }
        };

        // Improve line charts visuals
        if (config.type === 'line') {
            config.data.datasets.forEach(ds => {
                ds.fill = false;
                ds.borderColor = ds.borderColor || '#ff6b35';
                ds.backgroundColor = ds.backgroundColor || 'rgba(255,107,53,0.2)';
                ds.tension = 0.25;
                ds.pointRadius = 2;
            });
        }

        try {
            const instance = new ChartConstructor(ctx, config);
            if (store) this.charts[chartType] = instance;
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showChartError(canvas.closest('.swg-chart-container'));
        }
    }

    showNoDataMessage() {
        const grid = document.getElementById('swg-charts-grid');
        if (!grid) return;
        // Keep containers to avoid breaking future renders
        if (!grid.querySelector('.swg-chart-container')) {
            grid.innerHTML = this._gridHtml;
        }
        if (!grid.querySelector('.swg-no-data')) {
            const wrap = document.createElement('div');
            wrap.className = 'swg-no-data';
            wrap.innerHTML = `
                <div class="swg-no-data-icon">📊</div>
                <h4>No Data Available</h4>
                <p>Sync some orders first to see analytics</p>
            `;
            grid.appendChild(wrap);
        }
    }

    showChartError(container) {
        const content = container.querySelector('.swg-chart-content');
        content.innerHTML = `
            <div class="swg-chart-error">
                <span>⚠️</span>
                <p>Failed to load chart</p>
            </div>
        `;
    }

    // Cleanup method to prevent memory leaks
    cleanup() {
        if (this.charts) {
            Object.values(this.charts).forEach(chart => {
                try {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                } catch (e) {
                    console.warn('Error destroying chart during cleanup:', e);
                }
            });
            this.charts = {};
        }
    }

    toggleView() {
        const grid = document.getElementById('swg-charts-grid');
        const toggleBtn = document.querySelector('#swg-toggle-view');
        
        if (this.currentView === 'grid') {
            grid.classList.add('swg-charts-fullscreen');
            if (toggleBtn) toggleBtn.setAttribute('aria-pressed', 'true');
            this.currentView = 'fullscreen';
        } else {
            grid.classList.remove('swg-charts-fullscreen');
            if (toggleBtn) toggleBtn.setAttribute('aria-pressed', 'false');
            this.currentView = 'grid';
        }
    }

    expandChart(chartType) {
        const container = document.querySelector(`[data-chart="${chartType}"]`);
        if (!container) return;

        // Create fullscreen modal
        const modal = document.createElement('div');
        modal.className = 'swg-chart-modal';
        modal.innerHTML = `
            <div class="swg-chart-modal-content">
                <div class="swg-chart-modal-header">
                    <h3>${container.querySelector('h4').textContent}</h3>
                    <button class="swg-chart-modal-close">×</button>
                </div>
                <div class="swg-chart-modal-body">
                    <canvas id="modal-chart-${chartType}"></canvas>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal
        modal.querySelector('.swg-chart-modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Re-render chart in modal without affecting the mini chart instance
        const canvas = modal.querySelector('canvas');
        const existing = this.charts[chartType];
        if (existing) {
            const chartData = existing.data;
            this.renderChart(canvas, chartData, chartType, /*store*/ false);
        }
    }

    toast(message) {
        if (window.swiggyTracker && window.swiggyTracker.toast) {
            window.swiggyTracker.toast(message);
        } else {
            console.log(message);
        }
    }

    renderFallbackChart(container, data, chartType) {
        const canvas = container.querySelector('canvas');
        const loading = container.querySelector('.swg-chart-loading');

        if (!canvas) {
            console.error('No canvas found for fallback chart');
            this.showChartError(container);
            return;
        }

        // Hide loading and show canvas
        if (loading) loading.style.display = 'none';
        canvas.style.display = 'block';

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get canvas context for fallback chart');
            this.showChartError(container);
            return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set canvas size
        canvas.width = canvas.offsetWidth || 400;
        canvas.height = canvas.offsetHeight || 200;

        // Draw fallback message
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📊 Chart Unavailable', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`Data: ${data.labels ? data.labels.length : 0} points`, canvas.width / 2, canvas.height / 2);
        ctx.fillText('Chart.js failed to load', canvas.width / 2, canvas.height / 2 + 20);

        // Draw a simple data visualization if we have data
        if (data.labels && data.datasets && data.datasets[0] && data.datasets[0].data) {
            this.drawSimpleFallbackVisualization(ctx, canvas, data);
        }

        console.log(`Rendered fallback chart for ${chartType}`);
    }

    drawSimpleFallbackVisualization(ctx, canvas, data) {
        const labels = data.labels;
        const values = data.datasets[0].data;

        if (!labels.length || !values.length) return;

        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;

        // Find max value
        const maxValue = Math.max(...values);

        // Draw axes
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // Draw bars
        ctx.fillStyle = '#ff6b35';
        const barWidth = Math.max(10, chartWidth / labels.length - 2);

        labels.forEach((label, index) => {
            if (index >= values.length) return;

            const barHeight = maxValue > 0 ? (values[index] / maxValue) * chartHeight : 0;
            const x = padding + (chartWidth / labels.length) * index + 1;
            const y = canvas.height - padding - barHeight;

            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw value on top of bar
            if (barHeight > 20) {
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(values[index].toString(), x + barWidth / 2, y + 15);
                ctx.fillStyle = '#ff6b35';
            }
        });

        // Draw labels
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            if (index >= 10) return; // Limit labels to prevent overcrowding
            const x = padding + (chartWidth / labels.length) * index + barWidth / 2;
            const y = canvas.height - padding + 15;
            ctx.fillText(label.substring(0, 8), x, y);
        });
    }

    // Debug method to check chart status
    debugCharts() {
        console.log('=== Chart Debug Info ===');
        console.log('Chart.js loaded (global):', typeof Chart !== 'undefined');
        console.log('Chart.js loaded (ChartJSLib):', typeof window.ChartJSLib !== 'undefined');
        console.log('Charts object:', this.charts);
        console.log('Chart retry count:', this.chartRetryCount);
        console.log('swiggyTracker available:', !!window.swiggyTracker);

        // Check if chart containers exist
        const containers = document.querySelectorAll('.swg-chart-container');
        console.log('Chart containers found:', containers.length);

        containers.forEach((container, index) => {
            const chartType = container.dataset.chart;
            const canvas = container.querySelector('canvas');
            const loading = container.querySelector('.swg-chart-loading');
            console.log(`Container ${index}:`, {
                chartType,
                hasCanvas: !!canvas,
                loadingVisible: loading ? loading.style.display !== 'none' : 'N/A',
                canvasDisplay: canvas ? canvas.style.display : 'N/A'
            });
        });

        // Check Chart.js version if available
        if (typeof Chart !== 'undefined') {
            console.log('Chart.js version (global):', Chart.version);
        }
        if (typeof window.ChartJSLib !== 'undefined') {
            console.log('Chart.js version (ChartJSLib):', window.ChartJSLib.version);
        }

        // Check if Groq API is accessible
        if (window.swiggyTracker) {
            window.swiggyTracker.getAllOrders().then(orders => {
                console.log('Available orders:', orders.length);
                if (orders.length > 0) {
                    console.log('Sample order:', orders[0]);
                }
            }).catch(err => {
                console.error('Error getting orders:', err);
            });
        }
    }
}

// Make it globally available
window.SwiggyChartsUI = SwiggyChartsUI;
