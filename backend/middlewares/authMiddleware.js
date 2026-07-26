// middlewares/authMiddleware.js
const admin = require('firebase-admin');

// Middleware para verificar el token de Firebase
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Almacena la información del usuario en req.user
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token no válido', error });
  }
};

module.exports = verifyToken;
