import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Δεν υπάρχει token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const verifyCoach = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'coach') {
      return res.status(403).json({ error: 'Μόνο coaches έχουν πρόσβαση' });
    }
    next();
  });
};

const verifyAthlete = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'athlete') {
      return res.status(403).json({ error: 'Μόνο athletes έχουν πρόσβαση' });
    }
    next();
  });
};

export { verifyToken, verifyCoach, verifyAthlete };
