const chartInstances = {};

const palette = {
    blue: '#60a5fa',
    blueFill: 'rgba(96, 165, 250, 0.08)',
    violet: '#a78bfa',
    green: '#34d399',
    red: '#f87171',
    orange: '#fb923c',
    pink: '#f472b6',
    cyan: '#22d3ee',
    amber: '#fbbf24',
    lime: '#a3e635',
    teal: '#2dd4bf',
    indigo: '#818cf8',
    grid: 'rgba(255, 255, 255, 0.04)',
    gridBorder: 'rgba(255, 255, 255, 0.06)',
    text: '#7a8ba8',
    textBright: '#f0f2f5',
    tooltipBg: '#0f1a30',
    tooltipBorder: 'rgba(255, 255, 255, 0.08)',
};

const sectorColors = {
    Banking: '#3b82f6',
    IT: '#8b5cf6',
    FMCG: '#10b981',
    'Oil & Gas': '#f59e0b',
    Telecom: '#ec4899',
    Automobile: '#ef4444',
    Pharma: '#14b8a6',
    Infrastructure: '#6366f1',
    'Consumer Goods': '#f97316',
    Cement: '#78716c',
    Power: '#06b6d4',
    Unknown: '#64748b',
};

function baseOpts() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                titleColor: palette.textBright,
                bodyColor: palette.text,
                borderColor: palette.tooltipBorder,
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
                grid: { color: palette.grid, drawBorder: false },
                border: { display: false },
                ticks: { color: palette.text, maxTicksLimit: 10, font: { size: 11, weight: '500' }, padding: 6 },
            },
            y: {
                grid: { color: palette.grid, drawBorder: false },
                border: { display: false },
                ticks: { color: palette.text, font: { size: 11, weight: '500' }, padding: 8 },
            },
        },
    };
}

function renderPriceChart(canvasId, data, ticker) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');

    const labels = data.map(d => d.date);
    const closes = data.map(d => d.close);

    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight || 280);
    gradient.addColorStop(0, 'rgba(96, 165, 250, 0.18)');
    gradient.addColorStop(0.5, 'rgba(96, 165, 250, 0.05)');
    gradient.addColorStop(1, 'rgba(96, 165, 250, 0)');

    const isUp = closes.length >= 2 && closes[closes.length - 1] >= closes[0];
    const lineColor = isUp ? palette.green : palette.red;
    const fillColor = isUp ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.08)';

    const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight || 280);
    grad.addColorStop(0, isUp ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: closes,
                borderColor: lineColor,
                backgroundColor: grad,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: lineColor,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 2.5,
            }],
        },
        options: {
            ...baseOpts(),
            interaction: { mode: 'index', intersect: false },
            plugins: {
                ...baseOpts().plugins,
                tooltip: {
                    ...baseOpts().plugins.tooltip,
                    callbacks: {
                        title: (items) => {
                            const d = items[0].label;
                            return d.length > 7 ? d : d;
                        },
                        label: (ctx) => `INR ${ctx.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                    },
                },
            },
            scales: {
                ...baseOpts().scales,
                x: {
                    ...baseOpts().scales.x,
                    ticks: {
                        ...baseOpts().scales.x.ticks,
                        callback: function(val) {
                            const label = this.getLabelForValue(val);
                            if (label.length <= 7) return label;
                            const parts = label.split('-');
                            return parts.length === 3 ? `${parts[1]}/${parts[2].substring(0,2)}` : label.substring(5);
                        },
                    },
                },
                y: {
                    ...baseOpts().scales.y,
                    ticks: {
                        ...baseOpts().scales.y.ticks,
                        callback: (v) => '₹' + v.toLocaleString('en-IN'),
                    },
                },
            },
        },
    });
}

function renderSectorChart(canvasId, sectors) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');

    const labels = sectors.map(s => s.sector);
    const values = sectors.map(s => s.market_cap / 1e10);
    const colors = labels.map(l => sectorColors[l] || '#64748b');

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: '#0d1528',
                borderWidth: 3,
                hoverBorderColor: '#0d1528',
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            animation: { animateRotate: true, duration: 800 },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: palette.text,
                        font: { size: 11, weight: '500' },
                        padding: 12,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                    },
                },
                tooltip: {
                    ...baseOpts().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ₹${ctx.parsed.toFixed(0)}B`,
                    },
                },
            },
        },
    });
}

function renderFundChart(canvasId, stocks, metric) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');

    const filtered = stocks.filter(s => s[metric] != null).sort((a, b) => b[metric] - a[metric]);
    const labels = filtered.map(s => s.ticker.replace('.NS', ''));
    const values = filtered.map(s => {
        if (metric === 'market_cap') return s[metric] / 1e9;
        return s[metric];
    });

    const barColors = filtered.map((s, i) => {
        const ratio = i / Math.max(filtered.length - 1, 1);
        const r = Math.round(96 + (167 - 96) * ratio);
        const g = Math.round(165 + (139 - 165) * ratio);
        const b = Math.round(250 + (250 - 250) * ratio);
        return `rgba(${r}, ${g}, ${b}, 0.75)`;
    });

    const metricLabels = {
        market_cap: 'Market Cap (INR B)',
        pe_ratio: 'P/E Ratio',
        eps: 'EPS (INR)',
        dividend_yield: 'Dividend Yield (%)',
    };

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: metricLabels[metric] || metric,
                data: values,
                backgroundColor: barColors,
                borderColor: barColors.map(c => c.replace('0.75', '1')),
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            ...baseOpts(),
            indexAxis: 'y',
            barThickness: 16,
            plugins: {
                ...baseOpts().plugins,
                tooltip: {
                    ...baseOpts().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => {
                            const v = ctx.parsed.x;
                            if (metric === 'market_cap') return ` ₹${v.toFixed(0)}B`;
                            if (metric === 'dividend_yield') return ` ${v.toFixed(2)}%`;
                            return ` ₹${v.toFixed(2)}`;
                        },
                    },
                },
            },
            scales: {
                ...baseOpts().scales,
                x: {
                    ...baseOpts().scales.x,
                    ticks: {
                        ...baseOpts().scales.x.ticks,
                        callback: function(val) {
                            if (metric === 'market_cap') return val.toFixed(0) + 'B';
                            if (metric === 'dividend_yield') return val.toFixed(1) + '%';
                            return val.toFixed(1);
                        },
                    },
                },
                y: {
                    ...baseOpts().scales.y,
                    ticks: {
                        ...baseOpts().scales.y.ticks,
                        font: { size: 11, weight: '600' },
                        color: palette.textBright,
                    },
                },
            },
        },
    });
}

function renderCompareChart(canvasId, dataA, nameA, dataB, nameB) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');

    const closesA = dataA.map(d => d.close);
    const closesB = dataB.map(d => d.close);

    const baseA = closesA[0] || 1;
    const baseB = closesB[0] || 1;
    const normA = closesA.map(c => ((c / baseA) - 1) * 100);
    const normB = closesB.map(c => ((c / baseB) - 1) * 100);

    const labelsA = dataA.map(d => d.date);
    const labelsB = dataB.map(d => d.date);
    const allDates = [...new Set([...labelsA, ...labelsB])].sort();
    const mapA = {};
    const mapB = {};
    labelsA.forEach((d, i) => mapA[d] = normA[i]);
    labelsB.forEach((d, i) => mapB[d] = normB[i]);
    const mergedA = allDates.map(d => mapA[d] != null ? mapA[d] : null);
    const mergedB = allDates.map(d => mapB[d] != null ? mapB[d] : null);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allDates,
            datasets: [
                {
                    label: nameA,
                    data: mergedA,
                    borderColor: palette.blue,
                    backgroundColor: 'rgba(96, 165, 250, 0.08)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2.5,
                    spanGaps: true,
                },
                {
                    label: nameB,
                    data: mergedB,
                    borderColor: palette.violet,
                    backgroundColor: 'rgba(167, 139, 250, 0.08)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2.5,
                    spanGaps: true,
                },
            ],
        },
        options: {
            ...baseOpts(),
            interaction: { mode: 'index', intersect: false },
            plugins: {
                ...baseOpts().plugins,
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: palette.text,
                        font: { size: 12, weight: '600' },
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        padding: 16,
                    },
                },
                tooltip: {
                    ...baseOpts().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}%`,
                    },
                },
            },
            scales: {
                ...baseOpts().scales,
                x: {
                    ...baseOpts().scales.x,
                    ticks: {
                        ...baseOpts().scales.x.ticks,
                        callback: function(val) {
                            const label = this.getLabelForValue(val);
                            const parts = label.split('-');
                            return parts.length === 3 ? `${parts[1]}/${parts[2].substring(0,2)}` : label.substring(5);
                        },
                    },
                },
                y: {
                    ...baseOpts().scales.y,
                    ticks: {
                        ...baseOpts().scales.y.ticks,
                        callback: (v) => (v >= 0 ? '+' : '') + v.toFixed(0) + '%',
                    },
                },
            },
        },
    });
}

function renderCandlestickChart(canvasId, data) {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');

    const labels = data.map(d => d.date);
    const opens = data.map(d => d.open);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    const candleData = data.map((d, i) => ({
        x: i,
        o: d.open,
        h: d.high,
        l: d.low,
        c: d.close,
    }));

    const maxVol = Math.max(...volumes.filter(v => v != null));
    const volScale = maxVol > 0 ? 0.2 : 0;

    const candleColors = data.map(d => d.close >= d.open ? palette.green : palette.red);

    const candlePlugin = {
        id: 'candlestick',
        afterDatasetsDraw(chart) {
            const { ctx: c, chartArea, scales } = chart;
            const xScale = scales.x;
            const yScale = scales.y;
            const barWidth = Math.max(2, Math.min(8, (chartArea.right - chartArea.left) / data.length * 0.6));

            candleData.forEach((d, i) => {
                const xPos = xScale.getPixelForValue(i);
                const isUp = d.c >= d.o;
                const color = isUp ? palette.green : palette.red;

                const bodyTop = yScale.getPixelForValue(Math.max(d.o, d.c));
                const bodyBottom = yScale.getPixelForValue(Math.min(d.o, d.c));
                const bodyHeight = Math.max(1, bodyBottom - bodyTop);

                c.save();
                c.strokeStyle = color;
                c.lineWidth = 1;

                c.beginPath();
                c.moveTo(xPos, yScale.getPixelForValue(d.h));
                c.lineTo(xPos, bodyTop);
                c.stroke();

                c.beginPath();
                c.moveTo(xPos, bodyBottom);
                c.lineTo(xPos, yScale.getPixelForValue(d.l));
                c.stroke();

                c.fillStyle = color;
                c.fillRect(xPos - barWidth / 2, bodyTop, barWidth, bodyHeight);

                c.restore();
            });
        }
    };

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Volume',
                    data: volumes,
                    backgroundColor: candleColors.map(c => c + '25'),
                    borderColor: candleColors.map(c => c + '40'),
                    borderWidth: 0,
                    yAxisID: 'volume',
                    barPercentage: 0.8,
                    categoryPercentage: 0.9,
                    order: 2,
                },
                {
                    label: 'Close',
                    data: closes,
                    type: 'line',
                    borderColor: palette.blue,
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    tension: 0.3,
                    order: 1,
                    yAxisID: 'y',
                },
            ],
        },
        options: {
            ...baseOpts(),
            interaction: { mode: 'index', intersect: false },
            plugins: {
                ...baseOpts().plugins,
                legend: { display: false },
                tooltip: {
                    ...baseOpts().plugins.tooltip,
                    callbacks: {
                        title: (items) => items[0].label,
                        label: (ctx) => {
                            const i = ctx.dataIndex;
                            const d = data[i];
                            if (!d) return '';
                            const chg = d.close - d.open;
                            const chgPct = d.open ? ((chg / d.open) * 100).toFixed(2) : '0.00';
                            return [
                                `Open:  ₹${d.open?.toLocaleString('en-IN')}`,
                                `High:  ₹${d.high?.toLocaleString('en-IN')}`,
                                `Low:   ₹${d.low?.toLocaleString('en-IN')}`,
                                `Close: ₹${d.close?.toLocaleString('en-IN')}`,
                                `Vol:   ${d.volume?.toLocaleString('en-IN')}`,
                                `Chg:   ${chg >= 0 ? '+' : ''}${chgPct}%`,
                            ];
                        },
                    },
                },
            },
            scales: {
                ...baseOpts().scales,
                x: {
                    ...baseOpts().scales.x,
                    ticks: {
                        ...baseOpts().scales.x.ticks,
                        callback: function(val) {
                            const label = this.getLabelForValue(val);
                            const parts = label.split('-');
                            return parts.length === 3 ? `${parts[1]}/${parts[2].substring(0,2)}` : label.substring(5);
                        },
                    },
                },
                y: {
                    ...baseOpts().scales.y,
                    position: 'right',
                    ticks: {
                        ...baseOpts().scales.y.ticks,
                        callback: (v) => '₹' + v.toLocaleString('en-IN'),
                    },
                },
                volume: {
                    display: false,
                    position: 'left',
                    beginAtZero: true,
                    max: maxVol * (1 / volScale) || 1,
                    grid: { display: false },
                },
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
            if (isLowerBetter) {
                if (val <= q1) return 'hm-excellent';
                if (val <= q2) return 'hm-good';
                if (val <= q3) return 'hm-weak';
                return 'hm-poor';
            } else {
                if (val >= q3) return 'hm-excellent';
                if (val >= q2) return 'hm-good';
                if (val >= q1) return 'hm-weak';
                return 'hm-poor';
            }
        };
    }

    const classFns = {};
    metrics.forEach(m => {
        classFns[m.key] = getClassForMetric(validStocks, m.key);
    });

    let html = `<div class="heatmap-header corner">Stock</div>`;
    metrics.forEach(m => {
        html += `<div class="heatmap-header">${m.label}</div>`;
    });

    validStocks.forEach(s => {
        html += `<div class="heatmap-ticker">
            <div class="mini-avatar ${getSectorClass(s.sector)}">${getInitials(s.name)}</div>
            ${s.ticker.replace('.NS', '')}
        </div>`;
        metrics.forEach(m => {
            const val = s[m.key];
            const cls = classFns[m.key](val);
            html += `<div class="heatmap-cell ${cls}">${m.format(val)}</div>`;
        });
    });

    container.innerHTML = html;
}
