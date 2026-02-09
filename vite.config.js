import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // Bất cứ request nào bắt đầu bằng /api sẽ được chuyển sang Backend thật
      "/api": {
        target: "http://10.2.22.54:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    global: "window",
  },
});