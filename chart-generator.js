// Chart Generator using LangGraph and Groq Cloud API
class SwiggyChartGenerator {
    constructor() {
        this.baseUrl = 'https://api.groq.com/openai/v1';
        this.charts = {};
    }

    async generateChartData(orders, chartType) {
        try {
            const prompt = this.buildChartPrompt(orders, chartType);
            const response = await this.callGroqAPI(prompt);
            const parsedResponse = this.parseChartResponse(response, chartType);
            
            // If Groq API fails or returns invalid data, use fallback
            if (!parsedResponse) {
                console.log(`Groq API failed for ${chartType}, using fallback`);
                return this.generateFallbackChart(orders, chartType);
            }
            
            return parsedResponse;
        } catch (error) {
            console.error('Chart generation error:', error);
            // Always fallback to local generation on any error
            return this.generateFallbackChart(orders, chartType);
        }
    }

    buildChartPrompt(orders, chartType) {
        const orderData = orders.map(o => ({
            id: o.id,
            date: o.date,
            restaurant: o.restaurant,
            total: o.total,
            timeData: o.timeData || {}
        }));

        const prompts = {
            'monthly-orders': `Generate a line chart data for monthly orders. Orders: ${JSON.stringify(orderData)}. Return JSON with x-axis (months) and y-axis (order count).`,
            'monthly-spend': `Generate a line chart data for monthly spending. Orders: ${JSON.stringify(orderData)}. Return JSON with x-axis (months) and y-axis (total spend).`,
            'top-restaurants': `Generate a bar chart data for top 15 restaurants by spend. Orders: ${JSON.stringify(orderData)}. Return JSON with x-axis (restaurant names) and y-axis (total spend).`,
            'weekday-orders': `Generate a bar chart data for orders by weekday. Orders: ${JSON.stringify(orderData)}. Return JSON with x-axis (weekdays) and y-axis (order count).`,
            'time-ordered': `Generate a bar chart data for most common order times. Orders: ${JSON.stringify(orderData)}. Return JSON with x-axis (time slots) and y-axis (order count).`
        };

        return prompts[chartType] || prompts['monthly-orders'];
    }

    async callGroqAPI(prompt) {
        // Proxy through background service worker to avoid CORS/CSP and hide key from page context
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage({
                    type: 'SWG_GROQ_CHART',
                    payload: { prompt }
                }, (resp) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError.message);
                        return;
                    }
                    if (!resp || !resp.ok) {
                        reject(resp?.error || 'Unknown error');
                        return;
                    }
                    resolve(resp.content);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    parseChartResponse(response, chartType) {
        try {
            if (!response || typeof response !== 'string') {
                console.warn('Invalid response format:', response);
                return null;
            }
            
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Validate chart data structure
                if (parsed && parsed.labels && parsed.datasets && Array.isArray(parsed.labels) && Array.isArray(parsed.datasets)) {
                    return parsed;
                } else {
                    console.warn('Invalid chart data structure:', parsed);
                    return null;
                }
            }
            throw new Error('No valid JSON found in response');
        } catch (error) {
            console.error('Failed to parse chart response:', error);
            return null;
        }
    }

    generateFallbackChart(orders, chartType) {
        const now = new Date();
        const months = [];
        const data = {};

        // Generate last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = date.toISOString().slice(0, 7);
            months.push(monthKey);
            data[monthKey] = 0;
        }

        orders.forEach(order => {
            const orderDate = new Date(order.date);
            const monthKey = orderDate.toISOString().slice(0, 7);
            
            if (data[monthKey] !== undefined) {
                if (chartType === 'monthly-orders') {
                    data[monthKey]++;
                } else if (chartType === 'monthly-spend') {
                    data[monthKey] += order.total || 0;
                }
            }
        });

        // Ensure we have at least some data
        const hasData = Object.values(data).some(val => val > 0);
        if (!hasData) {
            // Generate sample data if no real data exists
            data[months[months.length - 1]] = chartType === 'monthly-orders' ? 1 : 500;
        }

        return {
            labels: months,
            datasets: [{
                label: chartType === 'monthly-orders' ? 'Orders' : 'Spend (₹)',
                data: months.map(month => data[month]),
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                tension: 0.4
            }]
        };
    }

    generateRestaurantChart(orders) {
        const restaurantData = {};
        orders.forEach(order => {
            const restaurant = order.restaurant || 'Unknown';
            restaurantData[restaurant] = (restaurantData[restaurant] || 0) + (order.total || 0);
        });

        const sortedRestaurants = Object.entries(restaurantData)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15);

        // Ensure we have at least some data
        if (sortedRestaurants.length === 0) {
            sortedRestaurants.push(['Sample Restaurant', 1000]);
        }

        return {
            labels: sortedRestaurants.map(([name]) => name),
            datasets: [{
                label: 'Spend (₹)',
                data: sortedRestaurants.map(([,spend]) => spend),
                backgroundColor: '#ff6b35',
                borderColor: '#e65c2f',
                borderWidth: 1
            }]
        };
    }

    generateWeekdayChart(orders) {
        const weekdayData = {
            'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
            'Friday': 0, 'Saturday': 0, 'Sunday': 0
        };

        orders.forEach(order => {
            const orderDate = new Date(order.date);
            const weekday = orderDate.toLocaleDateString('en-US', { weekday: 'long' });
            weekdayData[weekday]++;
        });

        // Ensure we have at least some data
        const hasData = Object.values(weekdayData).some(val => val > 0);
        if (!hasData) {
            weekdayData['Friday'] = 1; // Add sample data
        }

        return {
            labels: Object.keys(weekdayData),
            datasets: [{
                label: 'Orders',
                data: Object.values(weekdayData),
                backgroundColor: '#ff6b35',
                borderColor: '#e65c2f',
                borderWidth: 1
            }]
        };
    }

    generateTimeChart(orders) {
        const timeSlots = {
            '6-9 AM': 0, '9-12 PM': 0, '12-3 PM': 0, '3-6 PM': 0,
            '6-9 PM': 0, '9-12 AM': 0
        };

        orders.forEach(order => {
            if (order.timeData && order.timeData.orderTime) {
                const orderTime = new Date(order.timeData.orderTime);
                const hour = orderTime.getHours();
                
                if (hour >= 6 && hour < 9) timeSlots['6-9 AM']++;
                else if (hour >= 9 && hour < 12) timeSlots['9-12 PM']++;
                else if (hour >= 12 && hour < 15) timeSlots['12-3 PM']++;
                else if (hour >= 15 && hour < 18) timeSlots['3-6 PM']++;
                else if (hour >= 18 && hour < 21) timeSlots['6-9 PM']++;
                else timeSlots['9-12 AM']++;
            }
        });

        // Ensure we have at least some data
        const hasData = Object.values(timeSlots).some(val => val > 0);
        if (!hasData) {
            timeSlots['6-9 PM'] = 1; // Add sample data
        }

        return {
            labels: Object.keys(timeSlots),
            datasets: [{
                label: 'Orders',
                data: Object.values(timeSlots),
                backgroundColor: '#ff6b35',
                borderColor: '#e65c2f',
                borderWidth: 1
            }]
        };
    }
}

// Make it globally available
window.SwiggyChartGenerator = SwiggyChartGenerator;
