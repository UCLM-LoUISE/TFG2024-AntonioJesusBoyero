// routes/gruposRoutes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');

const { crearGrupo, borrarGrupo, listarGrupos } = require('../controllers/gruposController');

router.use(verifyToken);

router.post('/crear-grupo', crearGrupo);
router.post('/listar-grupos', listarGrupos);
router.post('/borrar-grupo', borrarGrupo);

module.exports = router;
