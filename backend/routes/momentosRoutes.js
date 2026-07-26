const express = require('express');
const router = express.Router();
const { 
  verificarMomentosEnTareas, 
  actualizarMomentosYTareas 
} = require('../controllers/momentosController');
const verifyToken = require('../middlewares/authMiddleware');

// 🔍 Verificar si hay tareas afectadas antes de eliminar momentos
router.post('/verificar', verifyToken, verificarMomentosEnTareas);

// 🔄 Actualizar momentos y limpiar tareas huérfanas
router.post('/actualizar', verifyToken, actualizarMomentosYTareas);

module.exports = router;
