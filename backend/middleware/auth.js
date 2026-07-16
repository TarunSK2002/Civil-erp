const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ msg: 'No authorization header provided' });
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
