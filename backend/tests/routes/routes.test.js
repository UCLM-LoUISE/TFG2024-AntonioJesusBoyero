/**
 * Tests de las rutas: comprueban que cada endpoint existe, que aplica los
 * middlewares correspondientes y que despacha al controller correcto.
 * Los controllers se sustituyen por stubs que responden con su nombre.
 */
const request = require('supertest');
const express = require('express');

jest.mock('../../middlewares/authMiddleware', () =>
  jest.fn((req, res, next) => next())
);
jest.mock('../../middlewares/cronMiddleware', () =>
  jest.fn((req, res, next) => next())
);

jest.mock('../../controllers/usuariosController', () => ({
  obtenerUsuarioPorEmail: jest.fn((req, res) => res.json({ handler: 'obtenerUsuarioPorEmail' })),
  obtenerInvestigadoresMismoGrupo: jest.fn((req, res) => res.json({ handler: 'obtenerInvestigadoresMismoGrupo' })),
  obtenerUsuariosMismoGrupo: jest.fn((req, res) => res.json({ handler: 'obtenerUsuariosMismoGrupo' })),
}));

jest.mock('../../controllers/estudioController', () => ({
  crearEstudio: jest.fn((req, res) => res.json({ handler: 'crearEstudio' })),
  obtenerEstudiosPorUsuario: jest.fn((req, res) => res.json({ handler: 'obtenerEstudiosPorUsuario' })),
  eliminarEstudio: jest.fn((req, res) => res.json({ handler: 'eliminarEstudio' })),
  guardarEstudio: jest.fn((req, res) => res.json({ handler: 'guardarEstudio' })),
  guardarEstudioZonas: jest.fn((req, res) => res.json({ handler: 'guardarEstudioZonas' })),
  guardarEstudioZonasNuevo: jest.fn((req, res) => res.json({ handler: 'guardarEstudioZonasNuevo' })),
  guardarEstudioTareas: jest.fn((req, res) => res.json({ handler: 'guardarEstudioTareas' })),
  cambiarEstadoEstudio: jest.fn((req, res) => res.json({ handler: 'cambiarEstadoEstudio' })),
  actualizarPermisosEstudio: jest.fn((req, res) => res.json({ handler: 'actualizarPermisosEstudio' })),
  descargarEstudioPorId: jest.fn((req, res) => res.json({ handler: 'descargarEstudioPorId' })),
}));

jest.mock('../../controllers/tareasController', () => ({
  obtenerTareasPorUsuario: jest.fn((req, res) => res.json({ handler: 'obtenerTareasPorUsuario' })),
  obtenerEstudiosPorTareasUsuario: jest.fn((req, res) => res.json({ handler: 'obtenerEstudiosPorTareasUsuario' })),
  obtenerEstudioPorIdParaUsuario: jest.fn((req, res) => res.json({ handler: 'obtenerEstudioPorIdParaUsuario' })),
  guardarArchivosTarea: jest.fn((req, res) => res.json({ handler: 'guardarArchivosTarea' })),
  eliminarArchivoTarea: jest.fn((req, res) => res.json({ handler: 'eliminarArchivoTarea' })),
  leerArchivoTarea: jest.fn((req, res) => res.json({ handler: 'leerArchivoTarea' })),
}));

jest.mock('../../controllers/resendController', () => ({
  enviarCorreoTarea: jest.fn(),
  enviarCorreoPrueba: jest.fn((req, res) => res.json({ handler: 'enviarCorreoPrueba' })),
}));

jest.mock('../../controllers/adminController', () => ({
  obtenerUsuariosNoAdministradores: jest.fn((req, res) => res.json({ handler: 'obtenerUsuariosNoAdministradores' })),
  crearUsuario: jest.fn((req, res) => res.json({ handler: 'crearUsuario' })),
  actualizarEstadoAuth: jest.fn((req, res) => res.json({ handler: 'actualizarEstadoAuth' })),
  eliminarUsuario: jest.fn((req, res) => res.json({ handler: 'eliminarUsuario' })),
}));

jest.mock('../../controllers/gruposController', () => ({
  crearGrupo: jest.fn((req, res) => res.json({ handler: 'crearGrupo' })),
  listarGrupos: jest.fn((req, res) => res.json({ handler: 'listarGrupos' })),
  borrarGrupo: jest.fn((req, res) => res.json({ handler: 'borrarGrupo' })),
}));

jest.mock('../../controllers/cronController', () => ({
  dailyStudyStatus: jest.fn((req, res) => res.json({ handler: 'dailyStudyStatus' })),
}));

jest.mock('../../controllers/momentosController', () => ({
  verificarMomentosEnTareas: jest.fn((req, res) => res.json({ handler: 'verificarMomentosEnTareas' })),
  actualizarMomentosYTareas: jest.fn((req, res) => res.json({ handler: 'actualizarMomentosYTareas' })),
}));

const verifyToken = require('../../middlewares/authMiddleware');
const verifyCronToken = require('../../middlewares/cronMiddleware');

// Montamos las rutas igual que en index.js
const app = express();
app.use(express.json());
app.use('/usuarios', require('../../routes/usuariosRoutes'));
app.use('', require('../../routes/estudiosRoutes'));
app.use('', require('../../routes/tareasRoutes'));
app.use('/email', require('../../routes/emailRoutes'));
app.use('/admin', require('../../routes/adminRoutes'));
app.use('/grupos', require('../../routes/gruposRoutes'));
app.use('/cron', require('../../routes/cronRoutes'));
app.use('/momentos', require('../../routes/momentosRoutes'));

describe('rutas de la API', () => {
  const endpoints = [
    // usuariosRoutes
    ['post', '/usuarios/obtener/email', 'obtenerUsuarioPorEmail'],
    ['post', '/usuarios/obtener/investigadores-mismo-grupo', 'obtenerInvestigadoresMismoGrupo'],
    ['post', '/usuarios/obtener/usuarios-mismo-grupo', 'obtenerUsuariosMismoGrupo'],
    // estudiosRoutes
    ['post', '/crear', 'crearEstudio'],
    ['post', '/getEstudios', 'obtenerEstudiosPorUsuario'],
    ['post', '/eliminar', 'eliminarEstudio'],
    ['post', '/crearEstudio', 'guardarEstudio'],
    ['post', '/crearEstudioZonas', 'guardarEstudioZonas'],
    ['post', '/crearEstudioZonasNuevo', 'guardarEstudioZonasNuevo'],
    ['post', '/crearEstudioTareas', 'guardarEstudioTareas'],
    ['post', '/cambiarEstadoEstudio', 'cambiarEstadoEstudio'],
    ['post', '/actualizarPermisosEstudio', 'actualizarPermisosEstudio'],
    ['post', '/descargar', 'descargarEstudioPorId'],
    // tareasRoutes
    ['post', '/getTareasUsuario', 'obtenerTareasPorUsuario'],
    ['post', '/getEstudiosPorTareasUsuario', 'obtenerEstudiosPorTareasUsuario'],
    ['post', '/getEstudioPorIdParaUsuario', 'obtenerEstudioPorIdParaUsuario'],
    ['post', '/guardar-archivos-tarea', 'guardarArchivosTarea'],
    ['post', '/eliminar-archivo-tarea', 'eliminarArchivoTarea'],
    ['post', '/leer-archivo-tarea', 'leerArchivoTarea'],
    // emailRoutes
    ['post', '/email/enviar-prueba', 'enviarCorreoPrueba'],
    // adminRoutes
    ['get', '/admin/usuarios/listar', 'obtenerUsuariosNoAdministradores'],
    ['post', '/admin/usuarios/crear', 'crearUsuario'],
    ['post', '/admin/usuarios/estado', 'actualizarEstadoAuth'],
    ['post', '/admin/usuarios/eliminar', 'eliminarUsuario'],
    // gruposRoutes
    ['post', '/grupos/crear-grupo', 'crearGrupo'],
    ['post', '/grupos/listar-grupos', 'listarGrupos'],
    ['post', '/grupos/borrar-grupo', 'borrarGrupo'],
    // cronRoutes
    ['get', '/cron/daily-study-status', 'dailyStudyStatus'],
    // momentosRoutes
    ['post', '/momentos/verificar', 'verificarMomentosEnTareas'],
    ['post', '/momentos/actualizar', 'actualizarMomentosYTareas'],
  ];

  test.each(endpoints)('%s %s despacha a %s', async (method, path, handler) => {
    const response = await request(app)[method](path).send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ handler });
  });

  test('las rutas protegidas pasan por el middleware de autenticación', async () => {
    await request(app).post('/grupos/crear-grupo').send({});
    expect(verifyToken).toHaveBeenCalled();
  });

  test('la ruta de cron pasa por el middleware de cron', async () => {
    await request(app).get('/cron/daily-study-status');
    expect(verifyCronToken).toHaveBeenCalled();
  });

  test('una ruta inexistente devuelve 404', async () => {
    const response = await request(app).get('/no-existe');
    expect(response.status).toBe(404);
  });
});
