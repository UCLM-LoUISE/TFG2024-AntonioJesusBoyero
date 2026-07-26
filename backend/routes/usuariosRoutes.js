const express = require('express');
const router = express.Router();
const { obtenerUsuarioPorEmail, obtenerInvestigadoresMismoGrupo, obtenerUsuariosMismoGrupo } = require('../controllers/usuariosController');
const verifyToken = require('../middlewares/authMiddleware');

router.post('/obtener/email', obtenerUsuarioPorEmail);
router.post('/obtener/investigadores-mismo-grupo', verifyToken, obtenerInvestigadoresMismoGrupo);
router.post('/obtener/usuarios-mismo-grupo', verifyToken, obtenerUsuariosMismoGrupo);

module.exports = router;
