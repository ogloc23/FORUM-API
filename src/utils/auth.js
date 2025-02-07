import jwt from 'jsonwebtoken';

// Generate JWT Token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '168h',
  });
};

// Middleware to protect routes
export const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]; // Get token from "Bearer token"

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded.userId;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};
