import { api } from "./api.js";

export const analysisService = {
  ai(prompt) {
    return api.post("/api/analysis/ai", { prompt }).then((response) => response.data);
  },
};
