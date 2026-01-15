

import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    provider: "sqlite",
    url: "file:./dev.db",
  },
});
