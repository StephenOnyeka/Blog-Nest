import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL;
  const proxyTarget = apiBaseUrl.replace(/\/api\/?$/, "");

  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1600,
    },
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          // secure: false,
        },
      },
    },
  };
});
