import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(config.port, () => {
  logger.info(`StadiumMonitor listening on port ${config.port}`);
  logger.info(`AI provider configured: ${config.aiProvider ?? "none (fallback mode)"}`);
});
