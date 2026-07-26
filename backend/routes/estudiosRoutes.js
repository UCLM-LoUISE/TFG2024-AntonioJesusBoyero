// routes/estudios.js
const express = require('express');
const router = express.Router();
const { crearEstudio, obtenerEstudiosPorUsuario, eliminarEstudio, guardarEstudio,
     guardarEstudioZonas, guardarEstudioTareas, cambiarEstadoEstudio, 
     guardarEstudioZonasNuevo, actualizarPermisosEstudio, descargarEstudioPorId  } = require('../controllers/estudioController');
const verifyToken = require('../middlewares/authMiddleware');

// Ruta para crear un nuevo estudio
router.post('/crear', verifyToken, crearEstudio);

router.post('/getEstudios', verifyToken, obtenerEstudiosPorUsuario);

router.post('/eliminar', verifyToken, eliminarEstudio);

router.post('/crearEstudio', verifyToken, guardarEstudio);

router.post('/crearEstudioZonas', verifyToken, guardarEstudioZonas);

router.post('/crearEstudioZonasNuevo', verifyToken, guardarEstudioZonasNuevo);

router.post('/crearEstudioTareas', verifyToken, guardarEstudioTareas);

router.post('/cambiarEstadoEstudio', verifyToken, cambiarEstadoEstudio);

router.post('/actualizarPermisosEstudio', verifyToken, actualizarPermisosEstudio);

router.post('/descargar', descargarEstudioPorId);


module.exports = router;
