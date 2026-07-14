import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { securityHeaders } from "./middleware/security.js";
import { wayfindingRouter } from "./routes/wayfinding.js";
import { crowdRouter } from "./routes/crowd.js";
import { incidentRouter } from "./routes/incident.js";
import { translateRouter } from "./routes/translate.js";
import { historyRouter } from "./routes/history.js";
import { auditRouter } from "./routes/audit.js";
import { venueRouter } from "./routes/venues.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(securityHeaders);
  app.use(cors({ origin: config.allowedOrigins }));
  app.use(express.json({ limit: "20kb" })); // small, deliberate payload cap

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      aiConfigured: Boolean(config.aiProvider),
      timestamp: new Date().toISOString()
    });
  });

  app.use(wayfindingRouter);
  app.use(crowdRouter);
  app.use(incidentRouter);
  app.use(translateRouter);
  app.use(historyRouter);
  app.use(auditRouter);
  app.use(venueRouter);

  // Generic error handler: never leak stack traces or raw error internals.
  app.use((err, _req, res, _next) => {
    console.error(err); // server-side log only
    res.status(500).json({ error: "Internal server error." });
  });

  app.use(express.static(path.join(__dirname, "..", "public")));

  return app;
}
