import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("stockfolio.token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function saveSession(data) {
  localStorage.setItem("stockfolio.token", data.token);
  localStorage.setItem(
    "stockfolio.user",
    JSON.stringify({ userId: data.userId, username: data.username, role: data.role }),
  );
}

export function getSession() {
  return {
    token: localStorage.getItem("stockfolio.token"),
    user: JSON.parse(localStorage.getItem("stockfolio.user") || "null"),
  };
}

export function clearSession() {
  localStorage.removeItem("stockfolio.token");
  localStorage.removeItem("stockfolio.user");
}
