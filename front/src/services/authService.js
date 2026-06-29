import { api } from "./api.js";

export const authService = {
  login(payload) {
    return api.post("/api/auth/login", payload).then((response) => response.data);
  },
  signup(payload) {
    return api.post("/api/auth/signup", payload).then((response) => response.data);
  },
  checkUsername(username) {
    return api.get("/api/auth/check-username", { params: { username } }).then((response) => response.data);
  },
};
