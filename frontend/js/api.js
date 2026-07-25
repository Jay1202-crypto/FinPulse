const API_BASE = '';

const api = {
    async getStocks() {
        const res = await fetch(`${API_BASE}/api/stocks`);
        if (!res.ok) throw new Error(`Failed to fetch stocks: ${res.statusText}`);
        return res.json();
    },

    async getStock(ticker, period = '1y') {
        const res = await fetch(`${API_BASE}/api/stocks/${ticker}?period=${period}`);
        if (!res.ok) throw new Error(`Failed to fetch stock ${ticker}: ${res.statusText}`);
        return res.json();
    },

    async getMarketSummary() {
        const res = await fetch(`${API_BASE}/api/market-summary`);
        if (!res.ok) throw new Error(`Failed to fetch market summary: ${res.statusText}`);
        return res.json();
    },

    async checkHealth() {
        try {
            const res = await fetch(`${API_BASE}/health`);
            return res.ok;
        } catch {
            return false;
        }
    }
};
