// security.js
// Centralizes response security headers so every route gets them uniformly,
// rather than relying on each route handler to remember.

import helmet from "helmet";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.google.com", "https://maps.google.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
});
