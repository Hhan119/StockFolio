import { create } from "zustand";
import { clearSession, getSession, saveSession } from "../services/api.js";
import { authService } from "../services/authService.js";

export const useAuthStore = create((set) => ({
  ...getSession(),
  loading: false,
  error: "",
  login: async (payload) => {
    set({ loading: true, error: "" });
    try {
      const data = await authService.login(payload);
      saveSession(data);
      set({ token: data.token, user: { userId: data.userId, username: data.username, role: data.role }, loading: false });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || "로그인에 실패했습니다.";
      set({ loading: false, error: message });
      throw error;
    }
  },
  signup: async (payload) => {
    set({ loading: true, error: "" });
    try {
      const data = await authService.signup(payload);
      saveSession(data);
      set({ token: data.token, user: { userId: data.userId, username: data.username, role: data.role }, loading: false });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || "회원가입에 실패했습니다.";
      set({ loading: false, error: message });
      throw error;
    }
  },
  logout: () => {
    clearSession();
    set({ token: null, user: null, error: "" });
  },
}));
