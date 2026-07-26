// routes/tareas.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');
const { obtenerTareasPorUsuario, obtenerEstudiosPorTareasUsuario, obtenerEstudioPorIdParaUsuario, guardarArchivosTarea, eliminarArchivoTarea, leerArchivoTarea } = require('../controllers/tareasController');

// Ruta para crear un nuevo estudio
router.post('/getTareasUsuario', verifyToken, obtenerTareasPorUsuario);

router.post('/getEstudiosPorTareasUsuario', obtenerEstudiosPorTareasUsuario);

router.post('/getEstudioPorIdParaUsuario', verifyToken, obtenerEstudioPorIdParaUsuario);

// Nueva ruta para guardar archivos de tarea
router.post('/guardar-archivos-tarea', verifyToken, guardarArchivosTarea);

router.post('/eliminar-archivo-tarea', verifyToken, eliminarArchivoTarea);

router.post('/leer-archivo-tarea', verifyToken, leerArchivoTarea);



module.exports = router;
