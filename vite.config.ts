import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/sapready-aidata-mapper/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      jszip: path.resolve(__dirname, "./vendor/jszip"),
      papaparse: path.resolve(__dirname, "./vendor/papaparse"),
      "file-saver": path.resolve(__dirname, "./vendor/file-saver"),
    },
  },
});
