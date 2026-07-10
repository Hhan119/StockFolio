import { api } from "./api.js";

export const portfolioService = {
  list() {
    return api.get("/api/portfolios").then((response) => response.data);
  },
  detail(id) {
    return api.get(`/api/portfolios/${id}`).then((response) => response.data);
  },
  create(payload) {
    return api.post("/api/portfolios", payload).then((response) => response.data);
  },
  update(id, payload) {
    return api.put(`/api/portfolios/${id}`, payload).then((response) => response.data);
  },
  remove(id) {
    return api.delete(`/api/portfolios/${id}`);
  },
  addStock(payload) {
    return api.post("/api/portfolio/stocks", payload).then((response) => response.data);
  },
  updatePrice(stockId, currentPrice) {
    return api.patch(`/api/stocks/${stockId}/price`, { currentPrice }).then((response) => response.data);
  },
  updateStock(stockId, payload) {
    return api.put(`/api/stocks/${stockId}`, payload).then((response) => response.data);
  },
  removeStock(stockId) {
    return api.delete(`/api/stocks/${stockId}`);
  },
  addDividend(stockId, payload) {
    return api.post(`/api/stocks/${stockId}/dividends`, payload).then((response) => response.data);
  },
  dividendSummary(portfolioId) {
    return api.get(`/api/portfolios/${portfolioId}/dividends/summary`).then((response) => response.data);
  },
  distributionSummary(portfolioId, includeSpecial = false) {
    return api.get(`/api/portfolios/${portfolioId}/distribution-summary`, { params: { includeSpecial } }).then((response) => response.data);
  },
  distributionCalendar(portfolioId, params = {}) {
    return api.get(`/api/portfolios/${portfolioId}/distribution-calendar`, { params }).then((response) => response.data);
  },
  holdingDistributionSummary(holdingId, includeSpecial = false) {
    return api.get(`/api/holdings/${holdingId}/distribution-summary`, { params: { includeSpecial } }).then((response) => response.data);
  },
  addManualDistribution(holdingId, payload) {
    return api.post(`/api/holdings/${holdingId}/manual-distribution`, payload).then((response) => response.data);
  },
};
