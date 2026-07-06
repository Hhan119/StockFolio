import { api } from "./api.js";

const hasPrice = (item) => Number(item?.currentPrice || 0) > 0;

async function enrichMissingPrices(items = []) {
  return Promise.all(items.map(async (item) => {
    if (hasPrice(item) || !item?.ticker) return item;

    try {
      const market = item.market || (String(item.ticker).match(/^\d{5}[0-9A-Z]$/i) ? "KR" : "US");
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
