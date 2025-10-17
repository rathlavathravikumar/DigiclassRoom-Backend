import jwt from "jsonwebtoken";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";

// Extract Bearer token from Authorization header
const extractToken = (req) => {
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (!auth) return null;
  const parts = String(auth).split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") return parts[1];
  return null;
};

const authenticate = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw new ApiErrorResponse(401, "Unauthorized: missing token");

    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = { _id: payload._id, role: payload.role };
    return next();
  } catch (err) {
    return next(new ApiErrorResponse(401, "Unauthorized: invalid token"));
  }
};

const authorizeRoles = (...allowed) => (req, res, next) => {
  if (!req.user || !allowed.includes(req.user.role)) {
    return next(new ApiErrorResponse(403, "Forbidden: insufficient role"));
  }
  next();
};

export { authenticate, authorizeRoles };
