const jwt = require('jsonwebtoken');
//const JWT_SECRET = 'mon_super_secret_token';
const JWT_SECRET = process.env.JWT_SECRET;


function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token manquant' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });

    req.user = decoded; // => { id, email }
    next();
  });
}

module.exports = verifyToken;
