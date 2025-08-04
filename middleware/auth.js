const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // user.id will be available in decoded
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = auth;
