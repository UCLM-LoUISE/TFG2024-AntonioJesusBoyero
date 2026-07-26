const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');

const {
  obtenerUsuariosNoAdministradores,
  crearUsuario,
  actualizarEstadoAuth,
  eliminarUsuario,
} = require('../controllers/adminController');

router.use(verifyToken);

router.get('/usuarios/listar', obtenerUsuariosNoAdministradores);
router.post('/usuarios/crear', crearUsuario);
router.post('/usuarios/estado', actualizarEstadoAuth);
router.post('/usuarios/eliminar', eliminarUsuario);

module.exports = router;
