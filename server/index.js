import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`StadiumMonitor listening on port ${config.port}`);
  console.log(`AI provider configured: ${config.aiProvider ?? "none (fallback mode)"}`);
});
