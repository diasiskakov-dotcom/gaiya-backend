// Minimal admin auth — checks a static bearer token from the environment.
// Fine for a demo; replace with real session/JWT-based auth (Medusa
// provides this out of the box) before anything resembling production.

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  const expected = process.env.ADMIN_TOKEN || "dev-admin-token";

  if (token !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

module.exports = { requireAdmin };
