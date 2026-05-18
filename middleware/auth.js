const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || 'falkor_secret_2026');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
