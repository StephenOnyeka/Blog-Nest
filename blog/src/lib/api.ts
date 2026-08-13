import axios from "axios";
import { toast } from "sonner";

const rawApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:8080/api";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

// Base instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Handle 401 and surface network/server errors as toasts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Always log the full error so clients can inspect it in the console
    console.error("[API error]", error);

    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;

    if (status === 401) {
      localStorage.removeItem("token");
    }

    // 400 (validation) and 401 (bad credentials) are shown inline by the
    // forms that trigger them, so don't double up with a toast.
    const handledInline = status === 400 || status === 401;

    if (!handledInline) {
      let message: string;
      if (!error.response) {
        // No response = network failure, CORS, or server unreachable
        message =
          "Network error — could not reach the server. Check your connection.";
      } else if (status >= 500) {
        message =
          serverMessage || "Internal server error. Please try again later.";
      } else if (status === 404) {
        message = serverMessage || "Not found (404).";
      } else if (status === 403) {
        message = serverMessage || "You do not have permission to do that.";
      } else {
        message = serverMessage || `Request failed (${status}).`;
      }

      toast.error(message, {
        description: "See the browser console for the full error details.",
      });
    }

    return Promise.reject(error);
  },
);
