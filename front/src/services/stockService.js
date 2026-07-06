import { api } from "./api.js";

export const stockService = {
  async search(keyword, market = "AUTO") {
    if (market === "ALL") {
      const [domestic, overseas] = await Promise.all([
        api.get("/api/market/search", { params: { market: "KR", keyword } }).then((response) => response.data),
        api.get("/api/market/search", { params: { market: "US", keyword } }).then((response) => response.data),
      ]);
      const seen = new Set();
      return [...domestic, ...overseas].filter((item) => {
        const key = `${item.market}-${item.ticker}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (market === "KR" || market === "US") {
      return api.get("/api/market/search", { params: { market, keyword } }).then((response) => response.data);
    }
    return api.get("/api/stocks/search", { params: { keyword } }).then((response) => response.data);
  },
  detail(ticker) {
    return api.get(`/api/stocks/${ticker}`).then((response) => response.data);
  },
  quote(market, ticker) {
    return api.get("/api/market/quote", { params: { market, ticker } }).then((response) => response.data);
  },
};
