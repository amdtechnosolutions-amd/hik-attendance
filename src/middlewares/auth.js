import jwt from 'jsonwebtoken';

export const requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (roles) => (req, res, next) => {
  if (!roles) return next();
  const roleArray = Array.isArray(roles) ? roles : [roles];
  if (!req.user || !roleArray.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};