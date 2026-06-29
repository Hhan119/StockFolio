import { api } from "./api.js";

export const stockService = {
  search(keyword) {
    return api.get("/api/stocks/search", { params: { keyword } }).then((response) => response.data);
  },
  detail(ticker) {
    return api.get(`/api/stocks/${ticker}`).then((response) => response.data);
  },
  quote(market, ticker) {
    return api.get("/api/market/quote", { params: { market, ticker } }).then((response) => response.data);
  },
};
