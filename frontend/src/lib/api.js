import axios from "axios";

const rawUrl = import.meta.env.VITE_API_URL || "";
const baseURL = rawUrl
  ? rawUrl.endsWith("/api")
    ? rawUrl
    : `${rawUrl}/api`
  : "/api";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register");

    // Only force a sign-out for genuine session expiry — never for a failed
    // login/register attempt, which would wipe the form and reload the page.
    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
