(function () {
  'use strict';

  class SwiggyOrderTracker {
    constructor() {
      this.isActive = false;
      this.interceptedCount = 0;
      this.stats = this.getDefaultStats();
      this.ui = null;
      this.lastScrapedOrderIds = new Set();
      this.isClearingData = false; // Flag to prevent re-scraping after clear

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.start());
      } else {
        this.start();
      }
    }

    async start() {
      console.log('Swiggy Order Tracker starting...');
      this.injectPageBridge();
      this.setupMessageListener();

      this.createFloatingButton();

      // Wait for dependencies before creating dashboard
      await this.waitForDependencies();
      this.createDashboard();

      await this.loadStats();
      this.isActive = true;
      this.setMonitoringStatus(true); // Set status to active
      this.startDOMMonitoring();

      setTimeout(() => this.scrapeOrdersFromDOM(), 1500);
      setTimeout(() => this.updateUI(), 2000);
    }

    injectPageBridge() {
      try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('page-bridge.js');
        (document.head || document.documentElement).appendChild(script);
      } catch (error) {
        console.error('Failed to inject page bridge:', error);
      }
    }

    setupMessageListener() {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.__SWG_EVT === 'SWG_API_ORDERS') {
          this.handleApiResponse(event.data.payload);
        }
      });
    }

    async waitForDependencies() {
      console.log('Waiting for Chart.js and SwiggyChartsUI to load...');

      const TIMEOUT_MS = 10000; // 10 second timeout

      // Wait for Chart.js to be loaded with timeout
      if (typeof Chart === 'undefined' && typeof window.ChartJSLib === 'undefined') {
        await Promise.race([
          new Promise((resolve) => {
            const checkChart = () => {
              if (typeof Chart !== 'undefined' || typeof window.ChartJSLib !== 'undefined') {
                console.log('Chart.js loaded successfully');
                resolve();
              } else {
                setTimeout(checkChart, 100);
              }
            };

            // Also listen for chartjs-loaded event
            window.addEventListener('chartjs-loaded', () => {
              console.log('Chart.js loaded via event');
              resolve();
            }, { once: true });

            checkChart();
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Chart.js loading timeout')), TIMEOUT_MS)
          )
        ]).catch(error => {
          console.warn('Chart.js loading failed, proceeding without it:', error.message);
        });
      }

      // Wait for SwiggyChartsUI to be available with timeout
      if (typeof window.SwiggyChartsUI === 'undefined') {
        await Promise.race([
          new Promise((resolve) => {
            const checkUI = () => {
              if (typeof window.SwiggyChartsUI !== 'undefined') {
                console.log('SwiggyChartsUI loaded successfully');
                resolve();
              } else {
                setTimeout(checkUI, 50);
              }
            };
            checkUI();
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SwiggyChartsUI loading timeout')), TIMEOUT_MS)
          )
        ]).catch(error => {
          console.error('SwiggyChartsUI loading failed:', error.message);
        });
      }

      console.log('Dependency loading completed (with or without success)');
    }

    startDOMMonitoring() {
      const observer = new MutationObserver(() => {
        clearTimeout(this.scrapeTimeout);
        this.scrapeTimeout = setTimeout(() => this.scrapeOrdersFromDOM(), 500);
      });
      const startObserving = () => {
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        } else { setTimeout(startObserving, 100); }
      };
      startObserving();
    }

    scrapeOrdersFromDOM() {
      // FIX: Check the flag to prevent scraping during a data clear
      if (this.isClearingData) return;

      try {
        let ordersFound = 0;
        const buttons = document.querySelectorAll('button, [role="button"], a');
        const orderButtons = Array.from(buttons).filter(btn => /VIEW DETAILS|REORDER/i.test(btn.textContent || ''));
        const processedContainers = new Set();

        orderButtons.forEach(btn => {
          let container = btn.parentElement;
          for (let i = 0; i < 8 && container; i++) {
            if (container.querySelector('img')) {
              if (processedContainers.has(container)) return;
              const orderData = this.extractOrderFromElement(container);
              if (orderData && orderData.id && !this.lastScrapedOrderIds.has(orderData.id)) {
                console.log(`✅ Scraped: ${orderData.restaurant} (₹${orderData.total})`);
                this.saveScrapedOrder(orderData);
                this.lastScrapedOrderIds.add(orderData.id);
                processedContainers.add(container);
                ordersFound++;
                return;
              }
            }
            container = container.parentElement;
          }
        });

        if (ordersFound > 0) {
          this.updateUI();
          this.toast(`Scraped ${ordersFound} order${ordersFound > 1 ? 's' : ''} from page`);
        }
      } catch (e) { console.error('❌ DOM scraping error:', e); }
    }

    extractOrderFromElement(element) {
      try {
        const text = element.textContent || '';
        const orderIdMatch = text.match(/ORDER #(\d{10,})/i);
        if (!orderIdMatch) return null;
        const orderId = orderIdMatch[1];

        let restaurant = 'Unknown Restaurant';
        const textElements = element.querySelectorAll('div, p');
        for (const el of textElements) {
            const potentialName = el.textContent.trim();
            if (potentialName &&
                !potentialName.match(/ORDER #|Delivered on|Total Paid|REORDER|HELP|VIEW DETAILS/i) &&
                potentialName.length > 2 && potentialName.length < 50 &&
                el.children.length === 0) {
                restaurant = potentialName;
                break;
            }
        }

        let date = new Date().toISOString();
        let timeData = {};

        // Try to extract delivery date and time
        const dateMatch = text.match(/Delivered on ([\s\S]*?\d{4})/i);
        if (dateMatch && dateMatch[1]) {
            const dateTimeText = dateMatch[1].replace(/\|/g, '').trim();

            // Try to extract time if available (look for patterns like "at 7:30 PM" or "7:30 PM")
            const timeMatch = dateTimeText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
            if (timeMatch) {
                const fullDateTimeStr = dateTimeText.replace(timeMatch[1], '').trim() + ' ' + timeMatch[1];
                const parsed = new Date(fullDateTimeStr);
                if (!isNaN(parsed)) {
                    date = parsed.toISOString();
                    timeData.deliveryTime = parsed.toISOString();
                    timeData.deliveryTimestamp = parsed.getTime();
                    console.log(`⏰ DOM scraped delivery time for order ${orderId}:`, timeMatch[1]);
                }
            } else {
                const parsed = new Date(dateTimeText);
                if (!isNaN(parsed)) date = parsed.toISOString();
            }
        }

        // Look for order time patterns in the text
        const orderTimeMatch = text.match(/(?:Ordered|Placed)\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
        if (orderTimeMatch && orderTimeMatch[1]) {
            // If we have a date, combine it with the order time
            const baseDate = new Date(date);
            const timeStr = orderTimeMatch[1];
            const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);

            if (timeParts) {
                let hours = parseInt(timeParts[1]);
                const minutes = parseInt(timeParts[2]);
                const ampm = timeParts[3];

                // Convert to 24-hour format if needed
                if (ampm && ampm.toLowerCase() === 'pm' && hours !== 12) {
                    hours += 12;
                } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
                    hours = 0;
                }

                baseDate.setHours(hours, minutes, 0, 0);
                timeData.orderTime = baseDate.toISOString();
                timeData.orderTimestamp = baseDate.getTime();
                console.log(`⏰ DOM scraped order time for order ${orderId}:`, timeStr);
            }
        }

        let total = 0;
        const totalMatch = text.match(/Total Paid[:\s]+([\d,]+)/i);
        if (totalMatch && totalMatch[1]) {
            total = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
        }

        const items = [];
        const itemsText = text.split(/REORDER|HELP|VIEW DETAILS/i)[1];
        if(itemsText && itemsText.includes('Total Paid')) {
            const itemsPortion = itemsText.split('Total Paid')[0];
            items.push({name: itemsPortion.trim()});
        }

        return {
            id: orderId,
            date: date,
            restaurant: restaurant,
            total: total,
            status: 'delivered',
            items: items,
            timeData: timeData,
            source: 'dom_scrape'
        };
      } catch (e) { console.debug('Extract order error:', e); return null; }
    }

    async handleApiResponse(payload) {
      try {
        if (payload?.orders && Array.isArray(payload.orders)) {
          this.interceptedCount++;
          await this.processApiOrders(payload.orders);
        }
      } catch (err) { console.debug('API response parse error:', err); }
    }

    async processApiOrders(orders) {
        let newOrUpdatedCount = 0;
        for (const o of orders) {
            if (await this.saveApiOrder(o)) newOrUpdatedCount++;
        }
        if (newOrUpdatedCount > 0) {
            this.toast(`Synced ${newOrUpdatedCount} orders from API`);
            this.updateUI();
        }
    }

    async saveScrapedOrder(orderData) {
        if (!orderData || !orderData.id) return false;
        const existingRaw = await window.gmStorage.gmGet(`order_${orderData.id}`);
        if(existingRaw){
            const existing = JSON.parse(existingRaw);
            if(existing.source === 'api') return false;
        }
        const record = {
            id: orderData.id,
            date: orderData.date,
            timestamp: new Date(orderData.date).getTime(),
            restaurant: orderData.restaurant,
            total: orderData.total,
            status: orderData.status,
            items: orderData.items,
            timeData: orderData.timeData || {},
            savedAt: new Date().toISOString(),
            source: 'dom_scrape'
        };
        await window.gmStorage.gmSet(`order_${orderData.id}`, JSON.stringify(record));
        return true;
    }

    async saveApiOrder(apiOrder) {
        const id = apiOrder.order_id;
        if (!id) return false;

        // Capture all available time fields from the API
        const timeData = {};
        if (apiOrder.order_time) {
            timeData.orderTime = new Date(apiOrder.order_time).toISOString();
            timeData.orderTimestamp = new Date(apiOrder.order_time).getTime();
        }
        if (apiOrder.delivery_time) {
            timeData.deliveryTime = new Date(apiOrder.delivery_time).toISOString();
            timeData.deliveryTimestamp = new Date(apiOrder.delivery_time).getTime();
        }
        if (apiOrder.order_placed_time) {
            timeData.placedTime = new Date(apiOrder.order_placed_time).toISOString();
            timeData.placedTimestamp = new Date(apiOrder.order_placed_time).getTime();
        }
        if (apiOrder.estimated_delivery_time) {
            timeData.estimatedDeliveryTime = new Date(apiOrder.estimated_delivery_time).toISOString();
            timeData.estimatedDeliveryTimestamp = new Date(apiOrder.estimated_delivery_time).getTime();
        }

        const record = {
            id: id,
            // Use order_time as the primary date (backwards compatibility)
            date: timeData.orderTime || new Date().toISOString(),
            timestamp: timeData.orderTimestamp || Date.now(),
            restaurant: apiOrder.restaurant_name,
            total: apiOrder.order_total,
            status: apiOrder.order_status,
            items: (apiOrder.order_items || []).map(i => ({name: i.name, quantity: i.quantity})),
            // Enhanced time data
            timeData: timeData,
            savedAt: new Date().toISOString(),
            source: 'api'
        };

        // Log enhanced time data for debugging
        if (Object.keys(timeData).length > 0) {
            console.log(`⏰ Enhanced time data for order ${id}:`, timeData);
        }

        await window.gmStorage.gmSet(`order_${id}`, JSON.stringify(record));
        return true;
    }

    async getAllOrders() {
      const keys = await window.gmStorage.gmListKeys('order_');
      const out = [];
      for (const k of keys) {
        try {
          const data = await window.gmStorage.gmGet(k);
          if (data) out.push(JSON.parse(data));
        } catch (e) { console.debug('Parse order error:', e); }
      }
      out.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return out;
    }

    async updateStats() {
      const orders = await this.getAllOrders();
      const vals = orders.map(o => o.total || 0).filter(t => t > 0).sort((a, b) => a - b);
      const stats = { totalOrders: orders.length, totalSpent: orders.reduce((s, o) => s + (o.total || 0), 0), averageOrderValue: 0, medianOrderValue: 0, highestOrderValue: vals[vals.length - 1] || 0, lowestOrderValue: vals[0] || 0, ordersThisMonth: 0, ordersThisYear: 0, lastSync: new Date().toISOString(), interceptedAPIs: this.interceptedCount };
      if (vals.length) {
        stats.averageOrderValue = stats.totalSpent / vals.length;
        const mid = Math.floor(vals.length / 2);
        stats.medianOrderValue = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
      }
      const now = new Date(); const m = now.getMonth(); const y = now.getFullYear();
      for (const o of orders) { const d = new Date(o.date); if (d.getFullYear() === y) { stats.ordersThisYear++; if (d.getMonth() === m) stats.ordersThisMonth++; } }
      this.stats = stats;
      await window.gmStorage.gmSet('swiggy_stats', JSON.stringify(stats));
    }

    async loadStats() {
      try {
        const s = await window.gmStorage.gmGet('swiggy_stats');
        if (s) this.stats = JSON.parse(s);
      } catch (e) { console.debug('Load stats error:', e); }
    }

    createFloatingButton() {
        const b = document.createElement('button');
        b.id = 'swg-btn';
        b.title = 'Swiggy Order Tracker';

        // Prefer inline SVG for reliability across blockers/CSP
        const wrap = document.createElement('span');
        wrap.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h16v16H4z" fill="none"/><path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 13h4v4h-4z"/></svg>';
        b.appendChild(wrap.firstChild);

        // Also attempt to load the packaged PNG, but keep hidden
        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('icons/icon48.png');
        icon.alt = 'Swiggy Tracker';
        icon.decoding = 'sync';
        icon.loading = 'eager';
        icon.style.display = 'none';
        b.appendChild(icon);

        b.addEventListener('click', () => this.toggleDrawer());
        document.body.appendChild(b);
    }

    createDashboard() {
        const d = document.createElement('div');
        d.id = 'swg-drawer';
        d.innerHTML = `<div class=swg-hdr><div><div class=swg-title>Swiggy Tracker</div><div class=swg-status><span>Monitoring</span><span class=swg-status-indicator id=swg-status-indicator aria-hidden=true></span></div></div><button class=swg-close id=swg-close aria-label=Close>×</button></div><div class=swg-section><div class=swg-stats><div class=swg-card><div class=swg-kpi><span class=lbl>Total Orders</span><span class=num id=st-total-orders>0</span></div></div><div class=swg-card><div class=swg-kpi><span class=lbl>Total Spent</span><span class=num id=st-total-spent>₹0</span></div></div><div class=swg-card><div class=swg-kpi><span class=lbl>Average Order</span><span class=num id=st-avg>₹0</span></div></div><div class=swg-card><div class=swg-kpi><span class=lbl>Median Order</span><span class=num id=st-med>₹0</span></div></div></div></div><div class=swg-section><div class=swg-trio><div class=swg-chip><div class=num id=st-high>₹0</div><div class=lbl>Highest</div></div><div class=swg-chip><div class=num id=st-low>₹0</div><div class=lbl>Lowest</div></div><div class=swg-chip><div class=num id=st-month>0</div><div class=lbl>This Month</div></div></div></div><div class=swg-section><div class=swg-actions><button class="swg-btn alt" id=swg-sync>Full Sync</button> <button class="swg-btn alt" id=swg-export>Export CSV</button> <button class="swg-btn primary" id=swg-clear>Clear Data</button></div></div><div class="swg-section swg-orders"><h3>Recent Orders</h3><div class=swg-list id=swg-list><div style="text-align:center;color:#666;padding:12px">No orders yet. Open your order history to sync.</div></div></div>`;
        
        // Add charts section
        const chartsSection = this.createChartsSection();
        d.appendChild(chartsSection);

        // Append simplified footer at the very end (centered)
        const foot = document.createElement('div');
        foot.className = 'swg-foot';
        foot.innerHTML = `Last sync: <span id=st-last>Never</span>`;
        d.appendChild(foot);
        
        d.addEventListener('click', (e) => {
            const id = e.target.id;
            if (id === 'swg-sync') this.performFullSync();
            if (id === 'swg-export') this.exportData();
            if (id === 'swg-clear') this.clearAllData();
            if (id === 'swg-close') this.toggleDrawer();
        });
        document.body.appendChild(d);
        this.ui = d;

        // Mount AI assistant button (disabled until we have orders)
        try {
            const actions = d.querySelector('.swg-actions');
            if (window.SwiggyAIAssist && actions) {
                this.aiAssist = new window.SwiggyAIAssist();
                this.aiAssist.setEnabled(false);
                this.aiAssist.mount(actions);
            }
        } catch (e) { console.debug('AI assist mount error:', e); }
    }

    createChartsSection() {
        // Double-check dependencies are available
        if (!window.SwiggyChartsUI) {
            console.error('SwiggyChartsUI not available, charts will not be displayed');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'swg-section';
            errorDiv.innerHTML = `
                <h3>📊 Charts</h3>
                <div style="text-align:center;color:#666;padding:12px;border:1px dashed #ccc;border-radius:8px;">
                    <div style="font-size:24px;margin-bottom:8px;">📈</div>
                    <div>Charts temporarily unavailable</div>
                    <div style="font-size:12px;margin-top:4px;">Please refresh the page if charts don't load</div>
                </div>
            `;
            return errorDiv;
        }

        try {
            const chartsUI = new window.SwiggyChartsUI();
            this.chartsUI = chartsUI;
            return chartsUI.createChartsSection();
        } catch (error) {
            console.error('Error creating charts section:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'swg-section';
            errorDiv.innerHTML = `
                <h3>📊 Charts</h3>
                <div style="text-align:center;color:#f44336;padding:12px;border:1px solid #f44336;border-radius:8px;">
                    <div style="font-size:24px;margin-bottom:8px;">⚠️</div>
                    <div>Error loading charts</div>
                    <div style="font-size:12px;margin-top:4px;">${error.message}</div>
                </div>
            `;
            return errorDiv;
        }
    }
    
    setMonitoringStatus(isActive) {
        const indicator = document.getElementById('swg-status-indicator');
        if (indicator) {
            if (isActive) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }
    }

    toggleDrawer() {
        if (!this.ui) return;
        const show = this.ui.style.display !== 'block';
        this.ui.style.display = show ? 'block' : 'none';
        if (show) {
            this.updateUI();
        }
    }

    async updateUI() {
        try {
            if (!this.ui) return;
            await this.updateStats();
            const s = this.stats;
            const $ = (id) => document.getElementById(id);
            const updates = [
                ['st-total-orders', s.totalOrders],
                ['st-total-spent', `₹${this.num(s.totalSpent)}`],
                ['st-avg', `₹${this.num(s.averageOrderValue)}`],
                ['st-med', `₹${this.num(s.medianOrderValue)}`],
                ['st-high', `₹${this.num(s.highestOrderValue)}`],
                ['st-low', `₹${this.num(s.lowestOrderValue)}`],
                ['st-month', s.ordersThisMonth],
                ['st-last', this.prettyDate(s.lastSync)]
            ];
            updates.forEach(([id, value]) => {
                const el = $(id);
                if (el) el.textContent = value;
            });
            this.renderOrders();
            
            // Update charts if available
            if (this.chartsUI) {
                setTimeout(() => {
                    try {
                        this.chartsUI.refreshCharts();
                    } catch (error) {
                        console.error('Error refreshing charts:', error);
                    }
                }, 2000); // Increased from 1000ms to 2000ms
            }

            // Enable AI button when we have orders
            try {
                if (this.aiAssist) {
                    const orders = await this.getAllOrders();
                    this.aiAssist.setEnabled(orders.length > 0);
                }
            } catch (_) {}
        } catch (e) { console.debug('UpdateUI error:', e); }
    }

    async renderOrders() {
        const list = document.getElementById('swg-list');
        const orders = await this.getAllOrders();
        if (!orders.length) {
            list.innerHTML = `<div style="text-align:center;color:#666;padding:12px">No orders yet. Navigate to your order history to sync.</div>`;
            return;
        }
        list.innerHTML = orders.slice(0, 10).map(o => `<div class=swg-item><div class=top><div class=name title="${this.escape(o.restaurant)}">${this.escape(o.restaurant)}</div><div class=total>${o.total > 0 ? '₹' + this.num(o.total) : ''}</div></div><div class=date>${this.prettyDate(o.date)}</div></div>`).join('');
    }
    
    num(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
    escape(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    prettyDate(ds) { if (!ds || ds === 'Never') return 'Never'; const d = new Date(ds); if (isNaN(d)) return 'Unknown'; const diff = Date.now() - d.getTime(); const m = Math.floor(diff / 60000); if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.floor(m / 60)}h ago`; const days = Math.floor(m / 1440); if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`; return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

    // Try to augment item names and time for a specific order from the visible DOM
    tryAugmentOrderFromDOM(orderId) {
        if (!orderId) return null;
        const buttons = document.querySelectorAll('button, [role="button"], a');
        const orderButtons = Array.from(buttons).filter(btn => /VIEW DETAILS|REORDER/i.test(btn.textContent || ''));
        for (const btn of orderButtons) {
            let container = btn.parentElement;
            for (let i = 0; i < 8 && container; i++) {
                const text = container.textContent || '';
                if (text.includes(`ORDER #${orderId}`)) {
                    const ex = this.extractOrderFromElement(container);
                    return ex;
                }
                container = container.parentElement;
            }
        }
        return null;
    }
    
    performFullSync() {
        if (this._syncRunning) {
            this.toast('Full sync already running…');
            return;
        }
        this._syncRunning = true;
        this.toast('Starting full sync…');
        this.scrapeOrdersFromDOM();

        let lastCount = 0;
        let stableCycles = 0;
        let i = 0;
        const maxCycles = 60; // cap runtime

        const checkProgress = async () => {
            try {
                const orders = await this.getAllOrders();
                const count = orders.length;
                if (count > lastCount) { stableCycles = 0; lastCount = count; }
                else { stableCycles++; }
            } catch (_) {}
        };

        const tick = setInterval(async () => {
            window.scrollTo(0, document.body.scrollHeight);
            setTimeout(() => { this.scrapeOrdersFromDOM(); }, 700);
            await checkProgress();
            i++;
            if (stableCycles >= 3 || i >= maxCycles) {
                clearInterval(tick);
                this._syncRunning = false;
                this.toast('Full sync completed');
                try { this.chartsUI && this.chartsUI.refreshCharts(); } catch (_) {}
            }
        }, 1300);
    }

    async exportData() {
        const orders = await this.getAllOrders();
        if (!orders.length) return this.toast('No data to export');

        // CSV columns in requested order (removed Item Count)
        const head = 'Order ID,Order Date,Order Time,Restaurant,Total,Items\n';

        const rows = orders.map(o => {
            const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const timeData = o.timeData || {};
            let bestISO = timeData.orderTime || timeData.placedTime || timeData.deliveryTime || null;
            if (!bestISO && o.timestamp) bestISO = new Date(o.timestamp).toISOString();
            if (!bestISO && o.date) bestISO = o.date;
            let orderDateTime = bestISO ? new Date(bestISO) : null;
            // If still midnight, try timestamp as last resort
            if (orderDateTime && orderDateTime.getHours() === 0 && orderDateTime.getMinutes() === 0 && o.timestamp) {
                orderDateTime = new Date(o.timestamp);
            }
            const formatDate = (date) => date ? date.toLocaleDateString('en-IN') : '';
            const formatTime = (date) => date ? date.toLocaleTimeString('en-IN', {hour12: false}) : '';
            let items = Array.isArray(o.items) ? o.items : [];
            let itemsList = items
                .map(it => `${it.name}${it.quantity?` x${it.quantity}`:''}`)
                .join('; ')
                .replace(/\s+/g, ' ')
                .trim();
            // If items missing, try to augment from current DOM (visible orders)
            if (!itemsList) {
                try {
                    const aug = this.tryAugmentOrderFromDOM(o.id);
                    if (aug) {
                        if (aug.items && aug.items.length) {
                            itemsList = aug.items.map(it => `${it.name}${it.quantity?` x${it.quantity}`:''}`).join('; ');
                        }
                        if (!timeData.orderTime && (aug.timeData?.orderTime || aug.date)) {
                            orderDateTime = new Date(aug.timeData?.orderTime || aug.date);
                        }
                    }
                } catch (_) {}
            }
            // Preserve large numeric IDs as text for Excel
            const safeId = "\u200C" + (o.id ?? '');

            return [
                esc(safeId),
                esc(formatDate(orderDateTime)),      // Order Date
                esc(formatTime(orderDateTime)),      // Order Time
                esc(o.restaurant),
                esc(o.total),
                esc(itemsList)                      // Items
            ].join(',');
        }).join('\n');
        const content = '\ufeff' + head + rows; // BOM for Excel
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `swiggy-orders-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.toast(`Exported ${orders.length} orders`);
    }

    async clearAllData() {
        if (!confirm('This will permanently delete all saved Swiggy order data. Are you sure?')) return;
        
        this.isClearingData = true; // FIX: Set the flag to true

        const keys = await window.gmStorage.gmListKeys();
        for (const k of keys) {
            if (k.startsWith('order_') || k === 'swiggy_stats') {
                await window.gmStorage.gmDelete(k);
            }
        }
        this.stats = this.getDefaultStats();
        this.interceptedCount = 0;
        this.lastScrapedOrderIds.clear();
        this.updateUI();
        this.toast('All data cleared');
        
        // FIX: Set the flag back to false after a short delay
        setTimeout(() => { this.isClearingData = false; }, 1000);
    }

    getDefaultStats() {
        return { totalOrders: 0, totalSpent: 0, averageOrderValue: 0, medianOrderValue: 0, highestOrderValue: 0, lowestOrderValue: 0, ordersThisMonth: 0, ordersThisYear: 0, lastSync: 'Never', interceptedAPIs: 0 };
    }

    toast(msg) {
        const id = 'swg-toast';
        const old = document.getElementById(id);
        if (old) old.remove();
        const n = document.createElement('div');
        n.id = id;
        n.className = 'swg-toast';
        n.textContent = msg;
        document.body.appendChild(n);
        requestAnimationFrame(() => n.classList.add('show'));
        setTimeout(() => {
            n.classList.remove('show');
            setTimeout(() => n.remove(), 250);
        }, 2600);
    }
  }

  // Make tracker globally available for charts
  window.swiggyTracker = new SwiggyOrderTracker();
})();
