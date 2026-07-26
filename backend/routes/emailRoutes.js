const express = require('express');
const router = express.Router();
const { enviarCorreoPrueba } = require('../controllers/resendController');

// Ruta para enviar un correo de prueba
router.post('/enviar-prueba', enviarCorreoPrueba);

module.exports = router;
