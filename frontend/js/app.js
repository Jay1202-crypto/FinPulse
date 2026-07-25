let allStocks = [];
let currentSort = { key: 'market_cap', dir: 'desc' };
let selectedTicker = null;
let currentPeriod = '1y';
let currentChartType = 'candle';
let activeTab = 'overview';
let marketSummary = null;
let _pollTimer = null;

const sectorClassMap = {
    Banking: 'sector-banking', IT: 'sector-it', FMCG: 'sector-fmcg',
    'Oil & Gas': 'sector-oil', Telecom: 'sector-telecom', Automobile: 'sector-auto',
    Pharma: 'sector-pharma', Infrastructure: 'sector-infra', 'Consumer Goods': 'sector-consumer',
    Cement: 'sector-cement', Power: 'sector-power',
};

function getSectorClass(sector) { return sectorClassMap[sector] || 'sector-default'; }
function getInitials(name) { const w = name.split(' '); return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase(); }
function formatNumber(num) { if (num == null) return '--'; if (num >= 1e12) return '₹' + (num / 1e12).toFixed(2) + 'T'; if (num >= 1e9) return '₹' + (num / 1e9).toFixed(2) + 'B'; if (num >= 1e7) return '₹' + (num / 1e7).toFixed(2) + 'Cr'; return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function formatPrice(num) { if (num == null) return '--'; return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatCompact(num) { if (num == null) return '--'; if (num >= 1e12) return '₹' + (num / 1e12).toFixed(1) + 'T'; if (num >= 1e9) return '₹' + (num / 1e9).toFixed(1) + 'B'; if (num >= 1e7) return '₹' + (num / 1e7).toFixed(0) + 'Cr'; return '₹' + num.toLocaleString('en-IN'); }
function formatPercent(num) { if (num == null) return '--'; return (num >= 0 ? '+' : '') + num.toFixed(2) + '%'; }
function getChangeClass(num) { if (num == null || num === 0) return 'flat'; return num > 0 ? 'up' : 'down'; }

function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

function updateMarketStatus() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    const hours = istTime.getHours(), minutes = istTime.getMinutes(), day = istTime.getDay();
    const totalMinutes = hours * 60 + minutes;
    const isWeekday = day >= 1 && day <= 5;
    const marketOpen = totalMinutes >= 555 && totalMinutes <= 930;
    const isOpen = isWeekday && marketOpen;
    const badge = document.getElementById('market-badge');
    const text = document.getElementById('market-status-text');
    if (isOpen) { badge.classList.remove('closed'); text.textContent = 'Market Open'; }
    else { badge.classList.add('closed'); text.textContent = !isWeekday ? 'Market Closed — Weekend' : totalMinutes < 555 ? 'Opens at 9:15 AM IST' : 'Closed — 3:30 PM IST'; }
}

function renderSidebarStocks(stocks) {
    const container = document.getElementById('sidebar-stocks');
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = stocks.filter(s => !query || s.name.toLowerCase().includes(query) || s.ticker.toLowerCase().includes(query));
    container.innerHTML = filtered.map(s => {
        const isActive = s.ticker === selectedTicker;
        return `<div class="sidebar-stock ${isActive ? 'active' : ''}" data-ticker="${s.ticker}">
            <div class="stock-avatar ${getSectorClass(s.sector)}">${getInitials(s.name)}</div>
            <div class="stock-info"><span class="stock-name">${s.name}</span><span class="stock-ticker">${s.ticker.replace('.NS', '')}</span></div>
            <div class="stock-price-col"><span class="stock-price">${s.latest_close != null ? '₹' + s.latest_close.toLocaleString('en-IN', {maximumFractionDigits: 1}) : '--'}</span></div>
        </div>`;
    }).join('');
    container.querySelectorAll('.sidebar-stock').forEach(el => { el.addEventListener('click', () => loadStockDetail(el.dataset.ticker)); });
}

function renderGainersLosers(summary) {
    const gainersEl = document.getElementById('gainers-list');
    const losersEl = document.getElementById('losers-list');
    function renderItem(s) {
        return `<div class="stock-list-item" data-ticker="${s.ticker}">
            <div class="stock-list-avatar ${getSectorClass(s.sector)}">${getInitials(s.name)}</div>
            <div class="stock-list-info"><span class="stock-list-name">${s.name}</span><span class="stock-list-ticker">${s.ticker.replace('.NS', '')}</span></div>
            <span class="stock-list-change ${getChangeClass(s.change_pct)}">${formatPercent(s.change_pct)}</span>
        </div>`;
    }
    gainersEl.innerHTML = summary.top_gainers.map(renderItem).join('');
    losersEl.innerHTML = summary.top_losers.map(renderItem).join('');
    document.querySelectorAll('.stock-list-item').forEach(el => { el.addEventListener('click', () => loadStockDetail(el.dataset.ticker)); });
    if (summary.top_gainers.length > 0) { const g = summary.top_gainers[0]; document.getElementById('top-gainer-val').textContent = formatPercent(g.change_pct); document.getElementById('top-gainer-name').textContent = g.name; }
    if (summary.top_losers.length > 0) { const l = summary.top_losers[0]; document.getElementById('top-loser-val').textContent = formatPercent(l.change_pct); document.getElementById('top-loser-name').textContent = l.name; }
}

function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    const tabEl = document.getElementById('tab-' + tabName);
    if (tabEl) { tabEl.classList.add('active'); }
    document.getElementById('page-title').textContent = {
        overview: 'Market Overview', watchlist: 'Portfolio Watchlist',
        sectors: 'Sector Dashboard', screener: 'Stock Screener', insights: 'AI Insights',
    }[tabName] || 'Market Overview';

    if (tabName === 'watchlist') renderWatchlist();
    if (tabName === 'sectors') renderSectorTab();
    if (tabName === 'screener') populateScreenerSectorFilter();
    if (tabName === 'insights') generateInsights();
}

async function loadStockDetail(ticker, period) {
    period = period || currentPeriod;
    selectedTicker = ticker;
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-detail').classList.add('active');
    document.getElementById('page-title').textContent = 'Stock Detail';
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    renderSidebarStocks(allStocks);

    try {
        const data = await api.getStock(ticker, period);
        document.getElementById('detail-hero').innerHTML = `
            <div class="detail-hero-content">
                <div class="detail-hero-left">
                    <div class="detail-avatar ${getSectorClass(data.sector)}">${getInitials(data.name)}</div>
                    <div class="detail-hero-info"><h2>${data.name}</h2><span class="ticker-badge">${data.ticker}</span><span class="sector-tag">${data.sector || 'N/A'}</span></div>
                </div>
                <div class="detail-hero-right"><div class="detail-hero-price">${formatPrice(data.latest_close)}</div></div>
            </div>`;

        const stats = [
            { label: 'Market Cap', value: formatNumber(data.market_cap), cls: 'blue' },
            { label: 'P/E Ratio', value: data.pe_ratio != null ? data.pe_ratio.toFixed(2) : '--', cls: '' },
            { label: 'EPS', value: data.eps != null ? '₹' + data.eps.toFixed(2) : '--', cls: data.eps > 0 ? 'green' : '' },
            { label: 'Dividend Yield', value: data.dividend_yield != null ? (data.dividend_yield * 100).toFixed(2) + '%' : '--', cls: '' },
            { label: 'Book Value', value: data.book_value != null ? '₹' + data.book_value.toFixed(2) : '--', cls: '' },
            { label: 'Exchange', value: data.exchange, cls: '' },
        ];
        document.getElementById('detail-stats').innerHTML = stats.map(s => `<div class="detail-stat"><span class="label">${s.label}</span><span class="value ${s.cls}">${s.value}</span></div>`).join('');

        if (data.historical_prices && data.historical_prices.length > 0) {
            document.getElementById('detail-chart-title').textContent = `Price History - ${data.name}`;
            if (currentChartType === 'candle') renderCandlestickChart('detail-price-chart', data.historical_prices);
            else renderPriceChart('detail-price-chart', data.historical_prices, ticker);
        }

        document.getElementById('detail-ai-insight').innerHTML = generateStockInsight(data);
    } catch (err) { console.error('Error loading stock detail:', err); }
}

function goBack() {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-overview').classList.add('active');
    activeTab = 'overview';
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'overview'));
    document.getElementById('page-title').textContent = 'Market Overview';
    selectedTicker = null;
    renderSidebarStocks(allStocks);
}

function populateCompareSelects() {
    const selectA = document.getElementById('compare-a');
    const selectB = document.getElementById('compare-b');
    const opts = allStocks.filter(s => s.latest_close != null).map(s => `<option value="${s.ticker}">${s.name} (${s.ticker.replace('.NS', '')})</option>`).join('');
    selectA.innerHTML = opts; selectB.innerHTML = opts;
    if (allStocks.length > 1) selectB.selectedIndex = 1;
}

async function runCompare() {
    const tickerA = document.getElementById('compare-a').value;
    const tickerB = document.getElementById('compare-b').value;
    if (!tickerA || !tickerB || tickerA === tickerB) return;
    document.getElementById('compare-placeholder').style.display = 'none';
    document.getElementById('compare-chart').style.display = 'block';
    try {
        const [dataA, dataB] = await Promise.all([api.getStock(tickerA, '1y'), api.getStock(tickerB, '1y')]);
        renderCompareChart('compare-chart', dataA.historical_prices || [], dataA.name, dataB.historical_prices || [], dataB.name);
    } catch (err) {
        console.error('Compare error:', err);
        document.getElementById('compare-placeholder').style.display = 'flex';
        document.getElementById('compare-chart').style.display = 'none';
    }
}

async function loadMarketSummary() {
    try {
        marketSummary = await api.getMarketSummary();
        document.getElementById('total-mcap').textContent = formatCompact(marketSummary.total_market_cap);
        document.getElementById('total-mcap-hero').textContent = formatNumber(marketSummary.total_market_cap);
        document.getElementById('stock-count').textContent = marketSummary.stock_count;
        document.getElementById('tracked-count').textContent = marketSummary.stock_count;
        renderGainersLosers(marketSummary);
        renderSectorChart('sector-chart', marketSummary.sector_breakdown);
    } catch (err) { console.error('Error loading market summary:', err); }
}

async function loadStocks() {
    try {
        allStocks = await api.getStocks();
        renderSidebarStocks(allStocks);
        populateCompareSelects();
        renderFundChart('fund-chart', allStocks, document.getElementById('fund-metric').value);
        renderHeatmap('heatmap-grid', allStocks);
    } catch (err) { console.error('Error loading stocks:', err); }
}

/* ─── Watchlist ─── */
function getWatchlist() { try { return JSON.parse(localStorage.getItem('finpulse_watchlist')) || []; } catch { return []; } }
function saveWatchlist(list) { localStorage.setItem('finpulse_watchlist', JSON.stringify(list)); }
function isInWatchlist(ticker) { return getWatchlist().includes(ticker); }
function toggleWatchlist(ticker) {
    let list = getWatchlist();
    if (list.includes(ticker)) list = list.filter(t => t !== ticker);
    else list.push(ticker);
    saveWatchlist(list);
    return list.includes(ticker);
}

function renderWatchlist() {
    const container = document.getElementById('watchlist-container');
    const list = getWatchlist();
    if (list.length === 0) {
        container.innerHTML = '<div class="watchlist-empty"><p>Your watchlist is empty. Add stocks from the sidebar or overview.</p></div>';
        document.getElementById('portfolio-placeholder').style.display = 'flex';
        document.getElementById('portfolio-chart').style.display = 'none';
        return;
    }
    const watchStocks = allStocks.filter(s => list.includes(s.ticker));
    container.innerHTML = watchStocks.map(s => `
        <div class="watchlist-item" data-ticker="${s.ticker}">
            <div class="stock-avatar ${getSectorClass(s.sector)}">${getInitials(s.name)}</div>
            <div class="watchlist-item-info">
                <div class="watchlist-item-name">${s.name}</div>
                <div class="watchlist-item-ticker">${s.ticker.replace('.NS', '')} · ${s.sector || 'N/A'}</div>
            </div>
            <div style="text-align:right;">
                <div class="watchlist-item-price">${formatPrice(s.latest_close)}</div>
                <div class="watchlist-item-change ${getChangeClass(s.change_pct)}">${formatPercent(s.change_pct)}</div>
            </div>
            <button class="btn-remove-watch" data-ticker="${s.ticker}" title="Remove from watchlist">&times;</button>
        </div>`).join('');

    container.querySelectorAll('.watchlist-item').forEach(el => {
        el.addEventListener('click', (e) => { if (!e.target.closest('.btn-remove-watch')) loadStockDetail(el.dataset.ticker); });
    });
    container.querySelectorAll('.btn-remove-watch').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); toggleWatchlist(btn.dataset.ticker); renderWatchlist(); });
    });

    document.getElementById('portfolio-placeholder').style.display = 'none';
    document.getElementById('portfolio-chart').style.display = 'block';
    renderPortfolioChart('portfolio-chart', allStocks, list);
}

function showAddWatchModal() {
    const stocks = allStocks.filter(s => !isInWatchlist(s.ticker));
    if (stocks.length === 0) return;
    const name = prompt('Enter stock name to add:\n' + stocks.map(s => s.name).join(', '));
    if (!name) return;
    const found = stocks.find(s => s.name.toLowerCase() === name.toLowerCase() || s.ticker.toLowerCase().includes(name.toLowerCase()));
    if (found) { toggleWatchlist(found.ticker); renderWatchlist(); }
    else alert('Stock not found. Try exact name.');
}

/* ─── Sector Dashboard ─── */
function renderSectorTab() {
    if (!marketSummary) return;
    const sectors = marketSummary.sector_breakdown;
    renderSectorBarChart('sector-bar-chart', sectors);
    renderSectorChart('sector-pie', sectors);
    const metric = document.getElementById('sector-compare-metric').value;
    renderSectorCompareChart('sector-compare-chart', sectors, metric);
}

/* ─── Screener ─── */
function populateScreenerSectorFilter() {
    const select = document.getElementById('filter-sector');
    const sectors = [...new Set(allStocks.map(s => s.sector).filter(Boolean))].sort();
    select.innerHTML = '<option value="">All Sectors</option>' + sectors.map(s => `<option value="${s}">${s}</option>`).join('');
}

function runScreener() {
    const mcapMin = parseFloat(document.getElementById('filter-mcap-min').value) * 1e7 || 0;
    const mcapMax = parseFloat(document.getElementById('filter-mcap-max').value) * 1e7 || Infinity;
    const peMin = parseFloat(document.getElementById('filter-pe-min').value) || 0;
    const peMax = parseFloat(document.getElementById('filter-pe-max').value) || Infinity;
    const epsMin = parseFloat(document.getElementById('filter-eps-min').value) || -Infinity;
    const sector = document.getElementById('filter-sector').value;

    let results = allStocks.filter(s => {
        const mc = s.market_cap || 0;
        const pe = s.pe_ratio != null ? s.pe_ratio : -1;
        const eps = s.eps != null ? s.eps : -Infinity;
        if (mc < mcapMin || mc > mcapMax) return false;
        if (pe >= 0 && (pe < peMin || pe > peMax)) return false;
        if (eps < epsMin) return false;
        if (sector && s.sector !== sector) return false;
        return true;
    });

    const container = document.getElementById('screener-results');
    if (results.length === 0) { container.innerHTML = '<div class="empty-state"><p>No stocks match your criteria</p></div>'; return; }
    container.innerHTML = results.map(s => `
        <div class="stock-list-item" data-ticker="${s.ticker}">
            <div class="stock-list-avatar ${getSectorClass(s.sector)}">${getInitials(s.name)}</div>
            <div class="stock-list-info">
                <span class="stock-list-name">${s.name}</span>
                <span class="stock-list-ticker">${s.ticker.replace('.NS', '')} · ${s.sector || 'N/A'}</span>
            </div>
            <div style="text-align:right;">
                <div class="stock-list-name">${formatPrice(s.latest_close)}</div>
                <div class="stock-list-ticker">MCap: ${formatCompact(s.market_cap)} · PE: ${s.pe_ratio != null ? s.pe_ratio.toFixed(1) : '--'}</div>
            </div>
            <span class="stock-list-change ${getChangeClass(s.change_pct)}">${formatPercent(s.change_pct)}</span>
        </div>`).join('');
    container.querySelectorAll('.stock-list-item').forEach(el => { el.addEventListener('click', () => loadStockDetail(el.dataset.ticker)); });
}

/* ─── AI Insights ─── */
function generateStockInsight(data) {
    const signals = [];
    let sentiment = 'neutral';
    if (data.change_pct > 2) signals.push(`${data.name} is up ${data.change_pct.toFixed(2)}% today, showing strong bullish momentum.`);
    else if (data.change_pct < -2) signals.push(`${data.name} is down ${Math.abs(data.change_pct).toFixed(2)}% today, indicating selling pressure.`);
    else signals.push(`${data.name} is relatively flat today at ${formatPercent(data.change_pct)}.`);

    if (data.pe_ratio != null) {
        if (data.pe_ratio > 30) { signals.push(`High P/E ratio of ${data.pe_ratio.toFixed(1)} suggests the stock may be overvalued relative to earnings.`); sentiment = 'bearish'; }
        else if (data.pe_ratio < 15) { signals.push(`Low P/E ratio of ${data.pe_ratio.toFixed(1)} suggests potential value opportunity.`); sentiment = 'bullish'; }
    }
    if (data.dividend_yield != null && data.dividend_yield > 0.03) { signals.push(`Strong dividend yield of ${(data.dividend_yield * 100).toFixed(2)}% makes this attractive for income investors.`); }
    if (data.market_cap > 1e12) { signals.push('Large-cap stock with stable market position and lower volatility risk.'); }
    else if (data.market_cap < 2e11) { signals.push('Smaller-cap stock with higher growth potential but increased risk.'); }

    const cls = sentiment === 'bullish' ? 'ai-insight-card ai-insight-bullish' : sentiment === 'bearish' ? 'ai-insight-card ai-insight-bearish' : 'ai-insight-card';
    return `<div class="${cls}"><h4>${sentiment === 'bullish' ? 'Bullish Signal' : sentiment === 'bearish' ? 'Bearish Signal' : 'Neutral'}</h4><p>${signals.join(' ')}</p></div>`;
}

function generateInsights() {
    const container = document.getElementById('ai-insights');
    if (!allStocks.length) { container.innerHTML = '<p class="ai-loading">Loading data...</p>'; return; }
    const insights = [];

    const sorted = [...allStocks].filter(s => s.change_pct != null).sort((a, b) => b.change_pct - a.change_pct);
    if (sorted.length > 0) {
        const top = sorted[0], bottom = sorted[sorted.length - 1];
        insights.push({ title: 'Market Momentum', text: `Today's market is led by ${top.name} (+${top.change_pct?.toFixed(2)}%) while ${bottom.name} (${bottom.change_pct?.toFixed(2)}%) is the weakest performer. This suggests ${top.change_pct > 1 ? 'broad-based buying in ' + (top.sector || 'certain') + ' sector' : 'cautious market sentiment'}.`, type: top.change_pct > 1 ? 'ai-insight-card ai-insight-bullish' : 'ai-insight-card' });
    }

    const highPe = allStocks.filter(s => s.pe_ratio != null && s.pe_ratio > 30);
    if (highPe.length > 0) {
        insights.push({ title: 'Valuation Alert', text: `${highPe.length} stock(s) have P/E ratios above 30: ${highPe.map(s => `${s.name} (${s.pe_ratio.toFixed(1)})`).join(', ')}. These may be overvalued or reflect high growth expectations.`, type: 'ai-insight-card ai-insight-bearish' });
    }

    const valueStocks = allStocks.filter(s => s.pe_ratio != null && s.pe_ratio > 0 && s.pe_ratio < 15);
    if (valueStocks.length > 0) {
        insights.push({ title: 'Value Opportunities', text: `${valueStocks.length} stock(s) appear undervalued with P/E under 15: ${valueStocks.map(s => `${s.name} (${s.pe_ratio.toFixed(1)})`).join(', ')}. Consider researching these for potential value plays.`, type: 'ai-insight-card ai-insight-bullish' });
    }

    const dividendStocks = allStocks.filter(s => s.dividend_yield != null && s.dividend_yield > 0.02);
    if (dividendStocks.length > 0) {
        insights.push({ title: 'Dividend Champions', text: `Top dividend payers: ${dividendStocks.sort((a, b) => b.dividend_yield - a.dividend_yield).slice(0, 5).map(s => `${s.name} (${(s.dividend_yield * 100).toFixed(2)}%)`).join(', ')}. These provide steady income potential.`, type: 'ai-insight-card' });
    }

    if (marketSummary && marketSummary.sector_breakdown) {
        const sectors = marketSummary.sector_breakdown;
        if (sectors.length > 0) {
            const biggest = sectors[0];
            insights.push({ title: 'Sector Analysis', text: `${biggest.sector} dominates with ₹${(biggest.market_cap / 1e9).toFixed(0)}B market cap. The top 3 sectors control ${((sectors.slice(0, 3).reduce((a, s) => a + s.market_cap, 0) / sectors.reduce((a, s) => a + s.market_cap, 0)) * 100).toFixed(1)}% of total tracked market cap.`, type: 'ai-insight-card' });
        }
    }

    const largeCaps = allStocks.filter(s => s.market_cap > 5e11);
    const smallCaps = allStocks.filter(s => s.market_cap > 0 && s.market_cap < 2e11);
    if (largeCaps.length > 0 && smallCaps.length > 0) {
        const largeAvg = largeCaps.reduce((a, s) => a + (s.change_pct || 0), 0) / largeCaps.length;
        const smallAvg = smallCaps.reduce((a, s) => a + (s.change_pct || 0), 0) / smallCaps.length;
        insights.push({ title: 'Size Factor', text: `Large-caps averaging ${largeAvg >= 0 ? '+' : ''}${largeAvg.toFixed(2)}% vs small-caps at ${smallAvg >= 0 ? '+' : ''}${smallAvg.toFixed(2)}%. ${largeAvg > smallAvg ? 'Flight to quality — large-caps outperforming.' : 'Risk-on sentiment — small-caps leading.'}`, type: 'ai-insight-card' });
    }

    if (insights.length === 0) insights.push({ title: 'No Insights', text: 'Insufficient data to generate insights. Please wait for market data to load.', type: 'ai-insight-card' });
    container.innerHTML = insights.map(i => `<div class="${i.type}"><h4>${i.title}</h4><p>${i.text}</p></div>`).join('');
}

/* ─── PDF Export ─── */
function exportPDF() { window.print(); }

/* ─── Theme ─── */
function initTheme() {
    const saved = localStorage.getItem('finpulse_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('finpulse_theme', next);
    destroyAllCharts();
    if (activeTab === 'overview') {
        renderFundChart('fund-chart', allStocks, document.getElementById('fund-metric').value);
        if (marketSummary) renderSectorChart('sector-chart', marketSummary.sector_breakdown);
    }
    if (selectedTicker) loadStockDetail(selectedTicker, currentPeriod);
}

/* ─── Event Listeners ─── */
function initEventListeners() {
    document.getElementById('search-input').addEventListener('input', () => renderSidebarStocks(allStocks));

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.chart-controls').querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            if (selectedTicker) loadStockDetail(selectedTicker, currentPeriod);
        });
    });

    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.chart-controls').querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartType = btn.dataset.type;
            if (selectedTicker) loadStockDetail(selectedTicker, currentPeriod);
        });
    });

    document.getElementById('fund-metric').addEventListener('change', (e) => renderFundChart('fund-chart', allStocks, e.target.value));
    document.getElementById('btn-back').addEventListener('click', goBack);
    document.getElementById('btn-compare').addEventListener('click', runCompare);

    document.getElementById('btn-refresh').addEventListener('click', async () => {
        const btn = document.getElementById('btn-refresh');
        btn.classList.add('spinning'); btn.disabled = true;
        await Promise.all([loadMarketSummary(), loadStocks()]);
        btn.classList.remove('spinning'); btn.disabled = false;
    });

    document.getElementById('mobile-menu').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('sidebar-close').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
    });

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    document.getElementById('btn-export').addEventListener('click', exportPDF);

    document.getElementById('btn-add-watch').addEventListener('click', showAddWatchModal);

    document.getElementById('btn-screen').addEventListener('click', runScreener);

    document.getElementById('sector-compare-metric').addEventListener('change', () => {
        if (marketSummary) renderSectorCompareChart('sector-compare-chart', marketSummary.sector_breakdown, document.getElementById('sector-compare-metric').value);
    });
}

async function init() {
    showLoading();
    initEventListeners();
    updateMarketStatus();
    setInterval(updateMarketStatus, 60000);
    try { await Promise.all([loadMarketSummary(), loadStocks()]); } catch (err) { console.error('Init error:', err); }
    hideLoading();
    startDataPoll();
}

function startDataPoll() {
    if (_pollTimer) return;
    const hasData = allStocks.some(s => s.latest_close != null);
    if (hasData) return;
    const statusEl = document.getElementById('market-status-text');
    const origText = statusEl ? statusEl.textContent : '';
    if (statusEl) statusEl.textContent = 'Loading market data...';
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.querySelector('.loading-text').textContent = 'Fetching market data from Yahoo Finance...';
    document.querySelector('.loading-sub').textContent = 'This may take up to a minute on first load';
    _pollTimer = setInterval(async () => {
        try {
            await Promise.all([loadMarketSummary(), loadStocks()]);
            const nowHasData = allStocks.some(s => s.latest_close != null);
            if (nowHasData) {
                clearInterval(_pollTimer); _pollTimer = null;
                hideLoading();
                if (statusEl) statusEl.textContent = origText;
            }
        } catch (e) { /* retry */ }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init();
});
