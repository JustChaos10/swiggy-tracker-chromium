// Build compact, privacy-first analytics JSON for AI prompts
(function() {
  'use strict';

  function monthKey(d) { return d.toISOString().slice(0, 7); }

  function lastNMonths(n = 12) {
    const now = new Date();
    const list = [];
    for (let i = n - 1; i >= 0; i--) {
      list.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    return list;
  }

  function timeBucket(date) {
    const h = date.getHours();
    if (h >= 6 && h < 9) return '6-9 AM';
    if (h >= 9 && h < 12) return '9-12 PM';
    if (h >= 12 && h < 15) return '12-3 PM';
    if (h >= 15 && h < 18) return '3-6 PM';
    if (h >= 18 && h < 21) return '6-9 PM';
    return '9-12 AM';
  }

  function normalizeItemName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/\([^\)]*\)/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function quantize(n) {
    const v = Number(n || 0);
    return Math.round(v);
  }

  function median(vals) {
    if (!vals.length) return 0;
    const arr = [...vals].sort((a,b)=>a-b);
    const m = Math.floor(arr.length/2);
    return arr.length % 2 ? arr[m] : (arr[m-1] + arr[m]) / 2;
  }

  window.buildAIContext = function(orders) {
    orders = Array.isArray(orders) ? orders : [];
    const totals = orders.map(o => Number(o.total || 0));
    const totalSpent = totals.reduce((a,b)=>a+b,0);
    const highest = totals.length ? Math.max(...totals) : 0;
    const lowest = totals.length ? Math.min(...totals) : 0;
    const avg = totals.length ? totalSpent / totals.length : 0;
    const med = median(totals);

    // Monthly buckets (last 12)
    const months = lastNMonths(12);
    const monthly = months.map(d => ({ key: monthKey(d), orders: 0, spend: 0 }));
    const mIndex = Object.fromEntries(monthly.map((m,i)=>[m.key,i]));

    // Weekday/time buckets
    const weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const weekday = Object.fromEntries(weekdays.map(w=>[w,0]));
    const times = { '6-9 AM':0,'9-12 PM':0,'12-3 PM':0,'3-6 PM':0,'6-9 PM':0,'9-12 AM':0 };

    // Top restaurants/items
    const restSpend = {};
    const restCount = {};
    const itemCount = {};

    const recentOutliers = [...orders]
      .sort((a,b) => (b.total||0) - (a.total||0))
      .slice(0,3)
      .map(o => ({ id: o.id, restaurant: o.restaurant, total: quantize(o.total), date: o.date }));

    for (const o of orders) {
      const total = Number(o.total || 0);
      const dt = new Date(o.timeData?.orderTime || o.timeData?.placedTime || o.date || o.timestamp || Date.now());
      const mk = monthKey(new Date(dt.getFullYear(), dt.getMonth(), 1));
      if (mIndex[mk] !== undefined) {
        monthly[mIndex[mk]].orders++;
        monthly[mIndex[mk]].spend += total;
      }
      const wd = dt.toLocaleDateString('en-US', { weekday: 'long' });
      if (weekday[wd] !== undefined) weekday[wd]++;
      const tb = timeBucket(dt);
      times[tb]++;

      const r = o.restaurant || 'Unknown';
      restSpend[r] = (restSpend[r] || 0) + total;
      restCount[r] = (restCount[r] || 0) + 1;

      const items = Array.isArray(o.items) ? o.items : [];
      let names = items.map(it => it?.name).filter(Boolean);
      // If a single item with semicolon-separated names
      if (names.length === 1 && names[0] && names[0].includes(';')) {
        names = names[0].split(';').map(s => s.trim());
      }
      for (const n of names) {
        const norm = normalizeItemName(n);
        if (!norm) continue;
        itemCount[norm] = (itemCount[norm] || 0) + 1;
      }
    }

    const topRestaurants = Object.entries(restSpend)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map(([name, spend]) => ({ name, spend: quantize(spend), count: restCount[name] || 0 }));

    const topItems = Object.entries(itemCount)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,15)
      .map(([name, count]) => ({ name, count }));

    return {
      sampleCount: orders.length,
      stats: {
        totalOrders: orders.length,
        totalSpent: quantize(totalSpent),
        averageOrderValue: quantize(avg),
        medianOrderValue: quantize(med),
        highestOrderValue: quantize(highest),
        lowestOrderValue: quantize(lowest)
      },
      monthly,
      weekday,
      times,
      topRestaurants,
      topItems,
      recentOutliers
    };
  };
})();

