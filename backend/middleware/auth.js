const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Backward compatibility: If no authorization header is sent, allow the request
  // (This ensures the live Windows client application does not break).
  if (!authHeader) {
    // Optionally attach a mock user or system user context so downstream routes don't crash
    req.user = { id: 1, role: 'ADMIN', username: 'desktop_client' };
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'Token missing from bearer format' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jeeva_fallback_secret_key_2026');
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ msg: 'Invalid signature or token' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ msg: 'Access denied: insufficient privileges' });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  requireRole
};
