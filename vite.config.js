import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        auth: resolve(__dirname, "auth.html"),
        create: resolve(__dirname, "create.html"),
        diagnosis: resolve(__dirname, "diagnosis.html"),
        plan: resolve(__dirname, "create/plan.html"),
        question: resolve(__dirname, "diagnosis/question.html"),
      },
    },
  },
});
