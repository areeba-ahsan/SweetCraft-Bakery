import jwt from 'jsonwebtoken';

// Verifies the JWT sent in the Authorization header ("Bearer <token>").
// On success, attaches the decoded payload ({ id, name, email, role }) to req.user.
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid. Please log in again.' });
  }
}

// Use after verifyToken to restrict a route to ADMIN accounts only.
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}