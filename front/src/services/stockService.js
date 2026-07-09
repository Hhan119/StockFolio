import { api } from "./api.js";
import { etfs } from "../data/publicContent.js";

const hasPrice = (item) => Number(item?.currentPrice || 0) > 0;
const extraInstrumentPrices = [
  { ticker: "TLT", name: "iShares 20+ Year Treasury Bond ETF", market: "US", exchange: "Nasdaq", currency: "USD", price: 92.4, dividendYield: 3.7 },
  { ticker: "IEF", name: "iShares 7-10 Year Treasury Bond ETF", market: "US", exchange: "Nasdaq", currency: "USD", price: 94.8, dividendYield: 3.2 },
  { ticker: "SHY", name: "iShares 1-3 Year Treasury Bond ETF", market: "US", exchange: "Nasdaq", currency: "USD", price: 82.1, dividendYield: 4.1 },
  { ticker: "BND", name: "Vanguard Total Bond Market ETF", market: "US", exchange: "Nasdaq", currency: "USD", price: 72.5, dividendYield: 3.6 },
  { ticker: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", market: "US", exchange: "NYSE Arca", currency: "USD", price: 98.8, dividendYield: 3.5 },
  { ticker: "HYG", name: "iShares iBoxx $ High Yield Corporate Bond ETF", market: "US", exchange: "NYSE Arca", currency: "USD", price: 78.6, dividendYield: 5.9 },
  { ticker: "LQD", name: "iShares iBoxx $ Investment Grade Corporate Bond ETF", market: "US", exchange: "NYSE Arca", currency: "USD", price: 109.2, dividendYield: 4.1 },
  { ticker: "TQQQ", name: "ProShares UltraPro QQQ", market: "US", exchange: "Nasdaq", currency: "USD", price: 73.5, dividendYield: 0 },
  { ticker: "SQQQ", name: "ProShares UltraPro Short QQQ", market: "US", exchange: "Nasdaq", currency: "USD", price: 7.9, dividendYield: 0 },
  { ticker: "QLD", name: "ProShares Ultra QQQ", market: "US", exchange: "NYSE Arca", currency: "USD", price: 104.3, dividendYield: 0 },
  { ticker: "SSO", name: "ProShares Ultra S&P500", market: "US", exchange: "NYSE Arca", currency: "USD", price: 88.2, dividendYield: 0 },
  { ticker: "UPRO", name: "ProShares UltraPro S&P500", market: "US", exchange: "NYSE Arca", currency: "USD", price: 78.4, dividendYield: 0 },
  { ticker: "SPXL", name: "Direxion Daily S&P 500 Bull 3X Shares", market: "US", exchange: "NYSE Arca", currency: "USD", price: 146.2, dividendYield: 0 },
  { ticker: "SOXL", name: "Direxion Daily Semiconductor Bull 3X Shares", market: "US", exchange: "NYSE Arca", currency: "USD", price: 41.8, dividendYield: 0 },
  { ticker: "AVGO", name: "Broadcom Inc.", market: "US", exchange: "Nasdaq", currency: "USD", price: 171.0, dividendYield: 1.2 },
  { ticker: "LLY", name: "Eli Lilly and Co.", market: "US", exchange: "NYSE", currency: "USD", price: 905.0, dividendYield: 0.6 },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", market: "US", exchange: "NYSE", currency: "USD", price: 210.0, dividendYield: 2.1 },
  { ticker: "V", name: "Visa Inc.", market: "US", exchange: "NYSE", currency: "USD", price: 275.0, dividendYield: 0.8 },
  { ticker: "MA", name: "Mastercard Inc.", market: "US", exchange: "NYSE", currency: "USD", price: 470.0, dividendYield: 0.6 },
  { ticker: "WMT", name: "Walmart Inc.", market: "US", exchange: "NYSE", currency: "USD", price: 68.0, dividendYield: 1.1 },
  { ticker: "PG", name: "Procter & Gamble Co.", market: "US", exchange: "NYSE", currency: "USD", price: 165.0, dividendYield: 2.3 },
  { ticker: "XOM", name: "Exxon Mobil Corp.", market: "US", exchange: "NYSE", currency: "USD", price: 115.0, dividendYield: 3.3 },
  { ticker: "UNH", name: "UnitedHealth Group Inc.", market: "US", exchange: "NYSE", currency: "USD", price: 520.0, dividendYield: 1.6 },
  { ticker: "HD", name: "Home Depot Inc.", market: "US", exchange: "NYSE", currency: "USD", price: 360.0, dividendYield: 2.4 },
  { ticker: "COST", name: "Costco Wholesale Corp.", market: "US", exchange: "Nasdaq", currency: "USD", price: 850.0, dividendYield: 0.5 },
  { ticker: "NFLX", name: "Netflix Inc.", market: "US", exchange: "Nasdaq", currency: "USD", price: 650.0, dividendYield: 0 },
  { ticker: "AMD", name: "Advanced Micro Devices Inc.", market: "US", exchange: "Nasdaq", currency: "USD", price: 160.0, dividendYield: 0 },
  { ticker: "INTC", name: "Intel Corp.", market: "US", exchange: "Nasdaq", currency: "USD", price: 31.0, dividendYield: 1.6 },
  { ticker: "ORCL", name: "Oracle Corp.", market: "US", exchange: "NYSE", currency: "USD", price: 135.0, dividendYield: 1.2 },
  { ticker: "CRM", name: "Salesforce Inc.", market: "US", exchange: "NYSE", currency: "USD", price: 260.0, dividendYield: 0 },
  { ticker: "305080", name: "TIGER 미국채10년선물", market: "KR", exchange: "KRX", currency: "KRW", price: 11920, dividendYield: 2.4 },
  { ticker: "148070", name: "KOSEF 국고채10년", market: "KR", exchange: "KRX", currency: "KRW", price: 112300, dividendYield: 2.6 },
  { ticker: "252670", name: "KODEX 200선물인버스2X", market: "KR", exchange: "KRX", currency: "KRW", price: 2150, dividendYield: 0 },
  { ticker: "233740", name: "KODEX 코스닥150레버리지", market: "KR", exchange: "KRX", currency: "KRW", price: 10450, dividendYield: 0 },
  { ticker: "122630", name: "KODEX 레버리지", market: "KR", exchange: "KRX", currency: "KRW", price: 17800, dividendYield: 0 },
];

const localPriceMap = new Map([
  ...etfs.map((etf) => [
    etf.ticker.toUpperCase(),
    {
      ticker: etf.ticker,
      name: etf.name,
      market: etf.currency === "KRW" ? "KR" : "US",
      exchange: etf.market,
      currency: etf.currency,
      price: etf.price,
      dividendYield: etf.dividendYield,
    },
  ]),
  ...extraInstrumentPrices.map((item) => [item.ticker.toUpperCase(), item]),
]);

const withLocalEtfPrice = (item) => {
  if (hasPrice(item) || !item?.ticker) return item;
  const fallback = localPriceMap.get(String(item.ticker).toUpperCase());
  if (!fallback || Number(fallback.price || 0) <= 0) return item;
  return {
    ...item,
    currentPrice: fallback.price,
    currency: item.currency || fallback.currency,
    exchange: item.exchange || fallback.exchange,
    market: item.market || fallback.market,
    name: item.name || fallback.name,
    dividendAvailable: Number(fallback.dividendYield || 0) > 0 || item.dividendAvailable,
    source: item.source || "local-price-fallback",
  };
};

async function enrichMissingPrices(items = []) {
  return Promise.all(items.map(async (item) => {
    if (hasPrice(item) || !item?.ticker) return item;

    try {
      const market = item.market || (String(item.ticker).match(/^\d{5}[0-9A-Z]$/i) ? "KR" : "US");
      const quote = await api.get("/api/market/quote", { params: { market, ticker: item.ticker } }).then((response) => response.data);
      if (!hasPrice(quote)) return withLocalEtfPrice(item);
      return {
        ...item,
        market: item.market || quote.market,
        name: item.name || quote.name,
        currency: item.currency || quote.currency,
        currentPrice: quote.currentPrice,
        dividendAvailable: Number(quote.dividendYield || 0) > 0 || item.dividendAvailable,
        source: quote.source || item.source,
      };
    } catch {
      return withLocalEtfPrice(item);
    }
  }));
}

export const stockService = {
  async search(keyword, market = "AUTO") {
    if (market === "ALL") {
      const [domestic, overseas] = await Promise.all([
        api.get("/api/market/search", { params: { market: "KR", keyword } }).then((response) => response.data),
        api.get("/api/market/search", { params: { market: "US", keyword } }).then((response) => response.data),
      ]);
      const seen = new Set();
      const deduped = [...domestic, ...overseas].filter((item) => {
        const key = `${item.market}-${item.ticker}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return enrichMissingPrices(deduped);
    }
    if (market === "KR" || market === "US") {
      const data = await api.get("/api/market/search", { params: { market, keyword } }).then((response) => response.data);
      return enrichMissingPrices(data);
    }
    const data = await api.get("/api/stocks/search", { params: { keyword } }).then((response) => response.data);
    return enrichMissingPrices(data);
  },
  detail(ticker) {
    return api.get(`/api/stocks/${ticker}`).then((response) => response.data);
  },
  quote(market, ticker) {
    return api.get("/api/market/quote", { params: { market, ticker } }).then((response) => response.data);
  },
};
