let allStocks = [];
let currentSort = { key: 'market_cap', dir: 'desc' };
let selectedTicker = null;
let currentPeriod = '1y';
let currentChartType = 'candle';

const sectorClassMap = {
    Banking: 'sector-banking', IT: 'sector-it', FMCG: 'sector-fmcg',
    'Oil & Gas': 'sector-oil', Telecom: 'sector-telecom', Automobile: 'sector-auto',
    Pharma: 'sector-pharma', Infrastructure: 'sector-infra', 'Consumer Goods': 'sector-consumer',
    Cement: 'sector-cement', Power: 'sector-power',
};

function getSectorClass(sector) {
    return sectorClassMap[sector] || 'sector-default';
}

function getInitials(name) {
    const words = name.split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

function formatNumber(num) {
    if (num == null) return '--';
    if (num >= 1e12) return '₹' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '₹' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e7) return '₹' + (num / 1e7).toFixed(2) + 'Cr';
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatPrice(num) {
    if (num == null) return '--';
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(num) {
    if (num == null) return '--';
    if (num >= 1e12) return '₹' + (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return '₹' + (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e7) return '₹' + (num / 1e7).toFixed(0) + 'Cr';
    return '₹' + num.toLocaleString('en-IN');
}

function formatPercent(num) {
    if (num == null) return '--';
    const sign = num >= 0 ? '+' : '';
    return sign + num.toFixed(2) + '%';
}

function getChangeClass(num) {
    if (num == null || num === 0) return 'flat';
    return num > 0 ? 'up' : 'down';
}

function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function updateMarketStatus() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const day = istTime.getDay();
    const totalMinutes = hours * 60 + minutes;

    const isWeekday = day >= 1 && day <= 5;
    const marketOpen = totalMinutes >= 555 && totalMinutes <= 930;
    const isOpen = isWeekday && marketOpen;

    const badge = document.getElementById('market-badge');
    const text = document.getElementById('market-status-text');

    if (isOpen) {
        badge.classList.remove('closed');
        text.textContent = 'Market Open';
    } else {
        badge.classList.add('closed');
        if (!isWeekday) {
            text.textContent = 'Market Closed — Weekend';
        } else if (totalMinutes < 555) {
            text.textContent = 'Opens at 9:15 AM IST';
        } else {
            text.textContent = 'Closed — 3:30 PM IST';
        }
    }
}

function renderSidebarStocks(stocks) {
    const container = document.getElementById('sidebar-stocks');
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = stocks.filter(s =>
        !query || s.name.toLowerCase().includes(query) || s.ticker.toLowerCase().includes(query)
    );

    container.innerHTML = filtered.map(s => {
        const isActive = s.ticker === selectedTicker;
        return `
            <div class="sidebar-stock ${isActive ? 'active' : ''}" data-ticker="${s.ticker}">
                <div class="stock-avatar ${getSectorClass(s.sector)}">${getInitials(s.name)}</div>
                <div class="stock-info">
                    <span class="stock-name">${s.name}</span>
                    <span class="stock-ticker">${s.ticker.replace('.NS', '')}</span>
                </div>
                <div class="stock-price-col">
                    <span class="stock-price">${s.latest_close != null ? '₹' + s.latest_close.toLocaleString('en-IN', {maximumFractionDigits: 1}) : '--'}</span>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.sidebar-stock').forEach(el => {
        el.addEventListener('click', () => loadStockDetail(el.dataset.ticker));
    });
}

function renderGainersLosers(summary) {
    const gainersEl = document.getElementById('gainers-list');
    const losersEl = document.getElementById('losers-list');

    function renderItem(s) {
        return `
            <div class="stock-list-item" data-ticker="${s.ticker}">
                <div class="stock-list-avatar ${getSectorClass(s.sector)}">${getInitials(s.name)}</div>
                <div class="stock-list-info">
                    <span class="stock-list-name">${s.name}</span>
                    <span class="stock-list-ticker">${s.ticker.replace('.NS', '')}</span>
                </div>
                <span class="stock-list-change ${getChangeClass(s.change_pct)}">${formatPercent(s.change_pct)}</span>
            </div>
        `;
    }

    gainersEl.innerHTML = summary.top_gainers.map(renderItem).join('');
    losersEl.innerHTML = summary.top_losers.map(renderItem).join('');

    document.querySelectorAll('.stock-list-item').forEach(el => {
        el.addEventListener('click', () => loadStockDetail(el.dataset.ticker));
    });

    if (summary.top_gainers.length > 0) {
        const g = summary.top_gainers[0];
        document.getElementById('top-gainer-val').textContent = formatPercent(g.change_pct);
        document.getElementById('top-gainer-name').textContent = g.name;
    }
    if (summary.top_losers.length > 0) {
        const l = summary.top_losers[0];
        document.getElementById('top-loser-val').textContent = formatPercent(l.change_pct);
        document.getElementById('top-loser-name').textContent = l.name;
    }
}

async function loadStockDetail(ticker, period) {
    period = period || currentPeriod;
    selectedTicker = ticker;

    const overviewSection = document.getElementById('overview-section');
    const detailSection = document.getElementById('detail-section');
    overviewSection.style.display = 'none';
    detailSection.style.display = 'block';

    document.getElementById('page-title').textContent = 'Stock Detail';

    renderSidebarStocks(allStocks);

    try {
        const data = await api.getStock(ticker, period);

        const heroEl = document.getElementById('detail-hero');
        heroEl.innerHTML = `
            <div class="detail-hero-content">
                <div class="detail-hero-left">
                    <div class="detail-avatar ${getSectorClass(data.sector)}" style="width:60px;height:60px;font-size:20px;border-radius:16px;">${getInitials(data.name)}</div>
                    <div class="detail-hero-info">
                        <h2>${data.name}</h2>
                        <span class="ticker-badge">${data.ticker}</span>
                        <span class="sector-tag">${data.sector || 'N/A'}</span>
                    </div>
                </div>
                <div class="detail-hero-right">
                    <div class="detail-hero-price">${formatPrice(data.latest_close)}</div>
                </div>
            </div>
        `;

        const statsEl = document.getElementById('detail-stats');
        const stats = [
            { label: 'Market Cap', value: formatNumber(data.market_cap), cls: 'blue' },
            { label: 'P/E Ratio', value: data.pe_ratio != null ? data.pe_ratio.toFixed(2) : '--', cls: '' },
            { label: 'EPS', value: data.eps != null ? '₹' + data.eps.toFixed(2) : '--', cls: data.eps > 0 ? 'green' : '' },
            { label: 'Dividend Yield', value: data.dividend_yield != null ? (data.dividend_yield * 100).toFixed(2) + '%' : '--', cls: '' },
            { label: 'Book Value', value: data.book_value != null ? '₹' + data.book_value.toFixed(2) : '--', cls: '' },
            { label: 'Exchange', value: data.exchange, cls: '' },
        ];

        statsEl.innerHTML = stats.map(s => `
            <div class="detail-stat">
                <span class="label">${s.label}</span>
                <span class="value ${s.cls}">${s.value}</span>
            </div>
        `).join('');

        if (data.historical_prices && data.historical_prices.length > 0) {
            document.getElementById('detail-chart-title').textContent = `Price History - ${data.name}`;
            if (currentChartType === 'candle') {
                renderCandlestickChart('detail-price-chart', data.historical_prices);
            } else {
                renderPriceChart('detail-price-chart', data.historical_prices, ticker);
            }
        }

    } catch (err) {
        console.error('Error loading stock detail:', err);
    }
}

function showOverview() {
    document.getElementById('overview-section').style.display = 'block';
    document.getElementById('detail-section').style.display = 'none';
    document.getElementById('page-title').textContent = 'Market Overview';
    selectedTicker = null;
    renderSidebarStocks(allStocks);
}

function populateCompareSelects() {
    const selectA = document.getElementById('compare-a');
    const selectB = document.getElementById('compare-b');
    const opts = allStocks
        .filter(s => s.latest_close != null)
        .map(s => `<option value="${s.ticker}">${s.name} (${s.ticker.replace('.NS', '')})</option>`)
        .join('');
    selectA.innerHTML = opts;
    selectB.innerHTML = opts;
    if (allStocks.length > 1) {
        selectB.selectedIndex = 1;
    }
}

async function runCompare() {
    const tickerA = document.getElementById('compare-a').value;
    const tickerB = document.getElementById('compare-b').value;
    if (!tickerA || !tickerB || tickerA === tickerB) return;

    const placeholder = document.getElementById('compare-placeholder');
    const canvas = document.getElementById('compare-chart');
    placeholder.style.display = 'none';
    canvas.style.display = 'block';

    try {
        const [dataA, dataB] = await Promise.all([
            api.getStock(tickerA, '1y'),
            api.getStock(tickerB, '1y'),
        ]);

        const nameA = dataA.name;
        const nameB = dataB.name;
        const histA = dataA.historical_prices || [];
        const histB = dataB.historical_prices || [];

        renderCompareChart('compare-chart', histA, nameA, histB, nameB);
    } catch (err) {
        console.error('Compare error:', err);
        placeholder.style.display = 'flex';
        canvas.style.display = 'none';
    }
}

async function loadMarketSummary() {
    try {
        const summary = await api.getMarketSummary();
        document.getElementById('total-mcap').textContent = formatCompact(summary.total_market_cap);
        document.getElementById('total-mcap-hero').textContent = formatNumber(summary.total_market_cap);
        document.getElementById('stock-count').textContent = summary.stock_count;
        document.getElementById('tracked-count').textContent = summary.stock_count;
        renderGainersLosers(summary);
        renderSectorChart('sector-chart', summary.sector_breakdown);
    } catch (err) {
        console.error('Error loading market summary:', err);
    }
}

async function loadStocks() {
    try {
        allStocks = await api.getStocks();
        renderSidebarStocks(allStocks);
        populateCompareSelects();
        const metric = document.getElementById('fund-metric').value;
        renderFundChart('fund-chart', allStocks, metric);
        renderHeatmap('heatmap-grid', allStocks);
    } catch (err) {
        console.error('Error loading stocks:', err);
    }
}

function initEventListeners() {
    document.getElementById('search-input').addEventListener('input', () => {
        renderSidebarStocks(allStocks);
    });

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.chart-controls').querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            if (selectedTicker) {
                loadStockDetail(selectedTicker, currentPeriod);
            }
        });
    });

    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.chart-controls').querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartType = btn.dataset.type;
            if (selectedTicker) {
                loadStockDetail(selectedTicker, currentPeriod);
            }
        });
    });

    document.getElementById('fund-metric').addEventListener('change', (e) => {
        renderFundChart('fund-chart', allStocks, e.target.value);
    });

    document.getElementById('btn-back').addEventListener('click', showOverview);

    document.getElementById('btn-compare').addEventListener('click', runCompare);

    document.getElementById('btn-refresh').addEventListener('click', async () => {
        const btn = document.getElementById('btn-refresh');
        btn.classList.add('spinning');
        btn.disabled = true;
        await Promise.all([loadMarketSummary(), loadStocks()]);
        btn.classList.remove('spinning');
        btn.disabled = false;
    });

    document.getElementById('mobile-menu').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
        } else {
            sidebar.style.display = sidebar.style.display === 'none' ? '' : 'none';
            document.getElementById('content').style.marginLeft =
                sidebar.style.display === 'none' ? '0' : 'var(--sidebar-width)';
        }
    });
}

async function init() {
    showLoading();
    initEventListeners();
    updateMarketStatus();
    setInterval(updateMarketStatus, 60000);
    try {
        await Promise.all([loadMarketSummary(), loadStocks()]);
    } catch (err) {
        console.error('Init error:', err);
    }
    hideLoading();
}

document.addEventListener('DOMContentLoaded', init);
