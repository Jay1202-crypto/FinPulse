const chartInstances = {};

function getPalette() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        blue: '#60a5fa',
        violet: '#a78bfa',
        green: isLight ? '#059669' : '#34d399',
        red: isLight ? '#dc2626' : '#f87171',
        orange: isLight ? '#ea580c' : '#fb923c',
        pink: isLight ? '#db2777' : '#f472b6',
        cyan: isLight ? '#0891b2' : '#22d3ee',
        amber: isLight ? '#d97706' : '#fbbf24',
        grid: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
        gridBorder: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
        text: isLight ? '#6b7280' : '#7a8ba8',
        textBright: isLight ? '#111827' : '#f0f2f5',
        tooltipBg: isLight ? '#ffffff' : '#0f1a30',
        tooltipBorder: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)',
        tooltipText: isLight ? '#111827' : '#f0f2f5',
        tooltipBody: isLight ? '#6b7280' : '#7a8ba8',
        doughnutBorder: isLight ? '#ffffff' : '#0d1528',
    };
}

const sectorColors = {
    Banking: '#3b82f6', IT: '#8b5cf6', FMCG: '#10b981',
    'Oil & Gas': '#f59e0b', Telecom: '#ec4899', Automobile: '#ef4444',
    Pharma: '#14b8a6', Infrastructure: '#6366f1', 'Consumer Goods': '#f97316',
    Cement: '#78716c', Power: '#06b6d4', Unknown: '#64748b',
};

function baseOpts() {
    const p = getPalette();
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: p.tooltipBg,
                titleColor: p.tooltipText,
                bodyColor: p.tooltipBody,
                borderColor: p.tooltipBorder,
                borderWidth: 1,
                padding: { top: 10, bottom: 10, left: 14, right: 14 },
                cornerRadius: 10,
                titleFont: { size: 13, weight: '600' },
                bodyFont: { size: 12 },
                displayColors: false,
                boxPadding: 4,
            },
        },
        scales: {
            x: {
                grid: { color: p.grid, drawBorder: false },
                border: { display: false },
                ticks: { color: p.text, maxTicksLimit: 10, font: { size: 11, weight: '500' }, padding: 6 },
            },
            y: {
                grid: { color: p.grid, drawBorder: false },
                border: { display: false },
                ticks: { color: p.text, font: { size: 11, weight: '500' }, padding: 8 },
            },
        },
    };
}

function destroyAllCharts() {
    Object.keys(chartInstances).forEach(k => {
        if (chartInstances[k]) { chartInstances[k].destroy(); delete chartInstances[k]; }
    });
}

function renderPriceChart(canvasId, data, ticker) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const p = getPalette();
    const labels = data.map(d => d.date);
    const closes = data.map(d => d.close);
    const isUp = closes.length >= 2 && closes[closes.length - 1] >= closes[0];
    const lineColor = isUp ? p.green : p.red;
    const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight || 280);
    grad.addColorStop(0, isUp ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ data: closes, borderColor: lineColor, backgroundColor: grad, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: lineColor, pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, borderWidth: 2.5 }] },
        options: {
            ...baseOpts(),
            interaction: { mode: 'index', intersect: false },
            plugins: {
                ...baseOpts().plugins,
                tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (ctx) => `INR ${ctx.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` } },
            },
            scales: {
                ...baseOpts().scales,
                x: { ...baseOpts().scales.x, ticks: { ...baseOpts().scales.x.ticks, callback: function(val) { const l = this.getLabelForValue(val); const p = l.split('-'); return p.length === 3 ? `${p[1]}/${p[2].substring(0,2)}` : l.substring(5); } } },
                y: { ...baseOpts().scales.y, ticks: { ...baseOpts().scales.y.ticks, callback: (v) => '₹' + v.toLocaleString('en-IN') } },
            },
        },
    });
}

function renderSectorChart(canvasId, sectors) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const p = getPalette();
    const labels = sectors.map(s => s.sector);
    const values = sectors.map(s => s.market_cap / 1e10);
    const colors = labels.map(l => sectorColors[l] || '#64748b');

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: p.doughnutBorder, borderWidth: 3, hoverOffset: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            animation: { animateRotate: true, duration: 800 },
            plugins: {
                legend: { position: 'right', labels: { color: p.text, font: { size: 11, weight: '500' }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
                tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (ctx) => ` ${ctx.label}: ₹${ctx.parsed.toFixed(0)}B` } },
            },
        },
    });
}

function renderFundChart(canvasId, stocks, metric) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const p = getPalette();
    const filtered = stocks.filter(s => s[metric] != null).sort((a, b) => b[metric] - a[metric]);
    const labels = filtered.map(s => s.ticker.replace('.NS', ''));
    const values = filtered.map(s => metric === 'market_cap' ? s[metric] / 1e9 : s[metric]);
    const barColors = filtered.map((s, i) => {
        const ratio = i / Math.max(filtered.length - 1, 1);
        return `rgba(${Math.round(96 + (167-96)*ratio)}, ${Math.round(165 + (139-165)*ratio)}, ${Math.round(250)}, 0.75)`;
    });
    const metricLabels = { market_cap: 'Market Cap (INR B)', pe_ratio: 'P/E Ratio', eps: 'EPS (INR)', dividend_yield: 'Dividend Yield (%)' };

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: metricLabels[metric] || metric, data: values, backgroundColor: barColors, borderColor: barColors.map(c => c.replace('0.75', '1')), borderWidth: 1, borderRadius: 6, borderSkipped: false }] },
        options: {
            ...baseOpts(), indexAxis: 'y', barThickness: 16,
            plugins: {
                ...baseOpts().plugins,
                tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (ctx) => { const v = ctx.parsed.x; if (metric === 'market_cap') return ` ₹${v.toFixed(0)}B`; if (metric === 'dividend_yield') return ` ${v.toFixed(2)}%`; return ` ₹${v.toFixed(2)}`; } } },
            },
            scales: {
                ...baseOpts().scales,
                x: { ...baseOpts().scales.x, ticks: { ...baseOpts().scales.x.ticks, callback: function(val) { if (metric === 'market_cap') return val.toFixed(0) + 'B'; if (metric === 'dividend_yield') return val.toFixed(1) + '%'; return val.toFixed(1); } } },
                y: { ...baseOpts().scales.y, ticks: { ...baseOpts().scales.y.ticks, font: { size: 11, weight: '600' }, color: p.textBright } },
            },
        },
    });
}

function renderCompareChart(canvasId, dataA, nameA, dataB, nameB) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const p = getPalette();
    const closesA = dataA.map(d => d.close), closesB = dataB.map(d => d.close);
    const baseA = closesA[0] || 1, baseB = closesB[0] || 1;
    const normA = closesA.map(c => ((c / baseA) - 1) * 100);
    const normB = closesB.map(c => ((c / baseB) - 1) * 100);
    const labelsA = dataA.map(d => d.date), labelsB = dataB.map(d => d.date);
    const allDates = [...new Set([...labelsA, ...labelsB])].sort();
    const mapA = {}, mapB = {};
    labelsA.forEach((d, i) => mapA[d] = normA[i]);
    labelsB.forEach((d, i) => mapB[d] = normB[i]);
    const mergedA = allDates.map(d => mapA[d] != null ? mapA[d] : null);
    const mergedB = allDates.map(d => mapB[d] != null ? mapB[d] : null);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels: allDates, datasets: [
            { label: nameA, data: mergedA, borderColor: p.blue, fill: false, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2.5, spanGaps: true },
            { label: nameB, data: mergedB, borderColor: p.violet, fill: false, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2.5, spanGaps: true },
        ] },
        options: {
            ...baseOpts(), interaction: { mode: 'index', intersect: false },
            plugins: {
                ...baseOpts().plugins,
                legend: { display: true, position: 'top', align: 'end', labels: { color: p.text, font: { size: 12, weight: '600' }, usePointStyle: true, pointStyleWidth: 10, padding: 16 } },
                tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}%` } },
            },
            scales: {
                ...baseOpts().scales,
                x: { ...baseOpts().scales.x, ticks: { ...baseOpts().scales.x.ticks, callback: function(val) { const l = this.getLabelForValue(val); const p = l.split('-'); return p.length === 3 ? `${p[1]}/${p[2].substring(0,2)}` : l.substring(5); } } },
                y: { ...baseOpts().scales.y, ticks: { ...baseOpts().scales.y.ticks, callback: (v) => (v >= 0 ? '+' : '') + v.toFixed(0) + '%' } },
            },
        },
    });
}

function renderCandlestickChart(canvasId, data) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const p = getPalette();
    const labels = data.map(d => d.date);
    const opens = data.map(d => d.open), highs = data.map(d => d.high), lows = data.map(d => d.low), closes = data.map(d => d.close), volumes = data.map(d => d.volume);
    const candleData = data.map((d, i) => ({ x: i, o: d.open, h: d.high, l: d.low, c: d.close }));
    const maxVol = Math.max(...volumes.filter(v => v != null));
    const volScale = maxVol > 0 ? 0.2 : 0;
    const candleColors = data.map(d => d.close >= d.open ? p.green : p.red);

    const candlePlugin = {
        id: 'candlestick',
        afterDatasetsDraw(chart) {
            const { ctx: c, chartArea, scales } = chart;
            const xScale = scales.x, yScale = scales.y;
            const barWidth = Math.max(2, Math.min(8, (chartArea.right - chartArea.left) / data.length * 0.6));
            candleData.forEach((d, i) => {
                const xPos = xScale.getPixelForValue(i);
                const isUp = d.c >= d.o;
                const color = isUp ? p.green : p.red;
                const bodyTop = yScale.getPixelForValue(Math.max(d.o, d.c));
                const bodyBottom = yScale.getPixelForValue(Math.min(d.o, d.c));
                const bodyHeight = Math.max(1, bodyBottom - bodyTop);
                c.save(); c.strokeStyle = color; c.lineWidth = 1;
                c.beginPath(); c.moveTo(xPos, yScale.getPixelForValue(d.h)); c.lineTo(xPos, bodyTop); c.stroke();
                c.beginPath(); c.moveTo(xPos, bodyBottom); c.lineTo(xPos, yScale.getPixelForValue(d.l)); c.stroke();
                c.fillStyle = color; c.fillRect(xPos - barWidth / 2, bodyTop, barWidth, bodyHeight);
                c.restore();
            });
        }
    };

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [
            { label: 'Volume', data: volumes, backgroundColor: candleColors.map(c => c + '25'), borderColor: candleColors.map(c => c + '40'), borderWidth: 0, yAxisID: 'volume', barPercentage: 0.8, categoryPercentage: 0.9, order: 2 },
            { label: 'Close', data: closes, type: 'line', borderColor: p.blue, backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, tension: 0.3, order: 1, yAxisID: 'y' },
        ] },
        options: {
            ...baseOpts(), interaction: { mode: 'index', intersect: false },
            plugins: {
                ...baseOpts().plugins, legend: { display: false },
                tooltip: {
                    ...baseOpts().plugins.tooltip,
                    callbacks: {
                        title: (items) => items[0].label,
                        label: (ctx) => {
                            const i = ctx.dataIndex; const d = data[i]; if (!d) return '';
                            const chg = d.close - d.open;
                            const chgPct = d.open ? ((chg / d.open) * 100).toFixed(2) : '0.00';
                            return [`Open:  ₹${d.open?.toLocaleString('en-IN')}`, `High:  ₹${d.high?.toLocaleString('en-IN')}`, `Low:   ₹${d.low?.toLocaleString('en-IN')}`, `Close: ₹${d.close?.toLocaleString('en-IN')}`, `Vol:   ${d.volume?.toLocaleString('en-IN')}`, `Chg:   ${chg >= 0 ? '+' : ''}${chgPct}%`];
                        },
                    },
                },
            },
            scales: {
                ...baseOpts().scales,
                x: { ...baseOpts().scales.x, ticks: { ...baseOpts().scales.x.ticks, callback: function(val) { const l = this.getLabelForValue(val); const p = l.split('-'); return p.length === 3 ? `${p[1]}/${p[2].substring(0,2)}` : l.substring(5); } } },
                y: { ...baseOpts().scales.y, position: 'right', ticks: { ...baseOpts().scales.y.ticks, callback: (v) => '₹' + v.toLocaleString('en-IN') } },
                volume: { display: false, position: 'left', beginAtZero: true, max: maxVol * (1 / volScale) || 1, grid: { display: false } },
            },
        },
        plugins: [candlePlugin],
    });
}

function renderHeatmap(containerId, stocks) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const metrics = [
        { key: 'pe_ratio', label: 'P/E', format: v => v != null ? v.toFixed(1) : '--' },
        { key: 'eps', label: 'EPS', format: v => v != null ? '₹' + v.toFixed(1) : '--' },
        { key: 'dividend_yield', label: 'Div Yield', format: v => v != null ? (v * 100).toFixed(2) + '%' : '--' },
        { key: 'book_value', label: 'Book Val', format: v => v != null ? '₹' + v.toFixed(0) : '--' },
    ];
    const validStocks = stocks.filter(s => s.latest_close != null).sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));

    function getClassForMetric(values, metricKey) {
        const nums = values.map(v => v[metricKey]).filter(v => v != null && v !== 0);
        if (nums.length === 0) return () => 'hm-na';
        const sorted = [...nums].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q2 = sorted[Math.floor(sorted.length * 0.5)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const isLowerBetter = metricKey === 'pe_ratio';
        return function(val) {
            if (val == null) return 'hm-na';
            if (isLowerBetter) { if (val <= q1) return 'hm-excellent'; if (val <= q2) return 'hm-good'; if (val <= q3) return 'hm-weak'; return 'hm-poor'; }
            else { if (val >= q3) return 'hm-excellent'; if (val >= q2) return 'hm-good'; if (val >= q1) return 'hm-weak'; return 'hm-poor'; }
        };
    }

    const classFns = {};
    metrics.forEach(m => { classFns[m.key] = getClassForMetric(validStocks, m.key); });

    let html = `<div class="heatmap-header corner">Stock</div>`;
    metrics.forEach(m => { html += `<div class="heatmap-header">${m.label}</div>`; });
    validStocks.forEach(s => {
        html += `<div class="heatmap-ticker"><div class="mini-avatar ${getSectorClass(s.sector)}">${getInitials(s.name)}</div>${s.ticker.replace('.NS', '')}</div>`;
        metrics.forEach(m => {
            const val = s[m.key]; const cls = classFns[m.key](val);
            html += `<div class="heatmap-cell ${cls}">${m.format(val)}</div>`;
        });
    });
    container.innerHTML = html;
}

function renderSectorBarChart(canvasId, sectorData) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const p = getPalette();
    const labels = sectorData.map(s => s.sector);
    const values = sectorData.map(s => s.market_cap / 1e9);
    const colors = labels.map(l => sectorColors[l] || '#64748b');

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Market Cap (B)', data: values, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 1, borderRadius: 8, borderSkipped: false }] },
        options: {
            ...baseOpts(), indexAxis: 'y', barThickness: 24,
            plugins: { ...baseOpts().plugins, tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (ctx) => ` ₹${ctx.parsed.x.toFixed(0)}B` } } },
            scales: {
                ...baseOpts().scales,
                x: { ...baseOpts().scales.x, ticks: { ...baseOpts().scales.x.ticks, callback: (v) => v.toFixed(0) + 'B' } },
                y: { ...baseOpts().scales.y, ticks: { ...baseOpts().scales.y.ticks, font: { size: 12, weight: '600' }, color: p.textBright } },
            },
        },
    });
}

function renderSectorCompareChart(canvasId, sectorData, metric) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const p = getPalette();
    const sectorStats = {};
    sectorData.forEach(s => { sectorStats[s.sector] = { total: 0, count: 0, market_cap: s.market_cap }; });

    allStocks.forEach(s => {
        if (!sectorStats[s.sector]) return;
        sectorStats[s.sector].count++;
        if (metric === 'market_cap') { sectorStats[s.sector].total += s.market_cap || 0; }
        else if (metric === 'pe_ratio' && s.pe_ratio != null) { sectorStats[s.sector].total += s.pe_ratio; }
        else if (metric === 'eps' && s.eps != null) { sectorStats[s.sector].total += s.eps; }
    });

    const labels = Object.keys(sectorStats);
    const values = labels.map(s => {
        const st = sectorStats[s];
        if (metric === 'market_cap') return st.total / 1e9;
        return st.count > 0 ? st.total / st.count : 0;
    });
    const colors = labels.map(l => sectorColors[l] || '#64748b');

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: metric === 'market_cap' ? 'MCap (B)' : metric === 'pe_ratio' ? 'Avg P/E' : 'Avg EPS', data: values, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 1, borderRadius: 8, borderSkipped: false }] },
        options: {
            ...baseOpts(),
            plugins: { ...baseOpts().plugins, tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (ctx) => metric === 'market_cap' ? ` ₹${ctx.parsed.y.toFixed(0)}B` : ` ${ctx.parsed.y.toFixed(2)}` } } },
            scales: {
                ...baseOpts().scales,
                y: { ...baseOpts().scales.y, ticks: { ...baseOpts().scales.y.ticks, callback: (v) => metric === 'market_cap' ? v.toFixed(0) + 'B' : v.toFixed(1) } },
                x: { ...baseOpts().scales.x, ticks: { ...baseOpts().scales.x.ticks, font: { size: 11, weight: '600' }, color: p.textBright } },
            },
        },
    });
}

function renderPortfolioChart(canvasId, stocks, watchlist) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const p = getPalette();
    const watchStocks = stocks.filter(s => watchlist.includes(s.ticker));
    if (watchStocks.length === 0) return;

    const labels = watchStocks.map(s => s.ticker.replace('.NS', ''));
    const values = watchStocks.map(s => s.latest_close || 0);
    const changes = watchStocks.map(s => s.change_pct || 0);
    const colors = changes.map(c => c >= 0 ? p.green : p.red);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Current Price (₹)', data: values, backgroundColor: colors.map(c => c + '66'), borderColor: colors, borderWidth: 2, borderRadius: 8, borderSkipped: false }] },
        options: {
            ...baseOpts(),
            plugins: { ...baseOpts().plugins, tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (ctx) => ` ₹${ctx.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${changes[ctx.dataIndex] >= 0 ? '+' : ''}${changes[ctx.dataIndex].toFixed(2)}%)` } } },
            scales: {
                ...baseOpts().scales,
                y: { ...baseOpts().scales.y, ticks: { ...baseOpts().scales.y.ticks, callback: (v) => '₹' + v.toLocaleString('en-IN') } },
            },
        },
    });
}
