import { api } from "./api.js";

const hasPrice = (item) => Number(item?.currentPrice || 0) > 0;

const mergeResults = (...groups) => {
  const results = new Map();
  groups.flat().forEach((item) => {
    if (!item?.ticker) return;
    const key = `${item.market}-${item.ticker}`.toUpperCase();
    const current = results.get(key);
    if (!current) {
      results.set(key, item);
      return;
    }
    results.set(key, {
      ...current,
      ...item,
      name: current.name || item.name,
      currentPrice: hasPrice(current) ? current.currentPrice : item.currentPrice,
      dividendAvailable: Boolean(current.dividendAvailable || item.dividendAvailable),
      source: hasPrice(current) ? current.source : item.source,
    });
  });
  return [...results.values()];
};

const searchMarket = async (keyword, market) => {
  const [stocks, etfs] = await Promise.all([
    api.get("/api/market/search", { params: { market, keyword } }).then((response) => response.data).catch(() => []),
    api.get("/api/market/etfs/search", { params: { market, keyword, limit: 80 } }).then((response) => response.data).catch(() => []),
  ]);
  return mergeResults(stocks, etfs);
};

async function enrichMissingPrices(items = []) {
  return Promise.all(items.map(async (item) => {
    if (hasPrice(item) || !item?.ticker) return item;
    try {
      const market = item.market || (/^\d{5}[0-9A-Z]$/i.test(String(item.ticker)) ? "KR" : "US");
      const quote = await api.get("/api/market/quote", { params: { market, ticker: item.ticker } }).then((response) => response.data);
      if (!hasPrice(quote)) return item;
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
      return item;
    }
  }));
}

export const stockService = {
  async search(keyword, market = "AUTO") {
    const markets = market === "KR" || market === "US" ? [market] : ["KR", "US"];
    const groups = await Promise.all(markets.map((targetMarket) => searchMarket(keyword, targetMarket)));
    return enrichMissingPrices(mergeResults(...groups));
  },
  detail(ticker) {
    return api.get(`/api/stocks/${ticker}`).then((response) => response.data);
  },
  quote(market, ticker) {
    return api.get("/api/market/quote", { params: { market, ticker } }).then((response) => response.data);
  },
  instrument(market, ticker) {
    return api.get(`/api/market/instruments/${encodeURIComponent(ticker)}`, { params: { market } }).then((response) => response.data);
  },
  topEtfs(market = "ALL", limit = 5) {
    return api.get("/api/market/etfs/top", { params: { market, limit } }).then((response) => response.data);
  },
};
