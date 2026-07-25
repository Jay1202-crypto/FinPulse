CREATE DATABASE IF NOT EXISTS finpulse;
USE finpulse;

CREATE TABLE IF NOT EXISTS companies (
    ticker VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sector VARCHAR(100),
    exchange VARCHAR(20) DEFAULT 'NSE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    open DECIMAL(12,2),
    high DECIMAL(12,2),
    low DECIMAL(12,2),
    close DECIMAL(12,2),
    volume BIGINT,
    UNIQUE KEY unique_ticker_date (ticker, trade_date),
    FOREIGN KEY (ticker) REFERENCES companies(ticker)
);

CREATE TABLE IF NOT EXISTS fundamentals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    data_date DATE NOT NULL,
    market_cap DECIMAL(18,2),
    pe_ratio DECIMAL(10,2),
    eps DECIMAL(10,2),
    dividend_yield DECIMAL(6,4),
    book_value DECIMAL(10,2),
    UNIQUE KEY unique_ticker_date (ticker, data_date),
    FOREIGN KEY (ticker) REFERENCES companies(ticker)
);

CREATE INDEX idx_prices_ticker_date ON stock_prices(ticker, trade_date DESC);
CREATE INDEX idx_fundamentals_ticker_date ON fundamentals(ticker, data_date DESC);
