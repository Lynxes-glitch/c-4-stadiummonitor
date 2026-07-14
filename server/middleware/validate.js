// validate.js
// Wraps a Zod schema as Express middleware. On failure, returns a generic
// 422 with no leaked internals (Zod's raw error objects can be verbose and
// occasionally echo back input) — only a flat list of field names is safe
// enough to return to the client.

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = [...new Set(result.error.issues.map((i) => i.path.join(".") || "body"))];
      return res.status(422).json({ error: "Invalid request", fields });
    }
    req.validated = result.data;
    next();
  };
}
