import { TestBed } from '@angular/core/testing';
import { BackService } from './back.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AngularFireAuth } from '@angular/fire/compat/auth';

describe('BackService', () => {
  const BASE = 'https://tfg-terr-app-back.vercel.app';

  let service: BackService;
  let httpMock: HttpTestingController;

  // Mock de AngularFireAuth: currentUser se lee en cada llamada
  const mockAngularFireAuth: any = {
    currentUser: Promise.resolve({
      getIdToken: () => Promise.resolve('mocked-token'),
    }),
  };

  // Deja que se resuelvan las microtareas (currentUser + getIdToken) antes de expectOne
  const flush = () => new Promise<void>((r) => setTimeout(r));

  beforeEach(() => {
    mockAngularFireAuth.currentUser = Promise.resolve({
      getIdToken: () => Promise.resolve('mocked-token'),
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BackService,
        { provide: AngularFireAuth, useValue: mockAngularFireAuth },
      ],
    });

    service = TestBed.inject(BackService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // #region USUARIOS

  it('obtenerUsuarioPorEmail should POST email without auth header', () => {
    let result: any;
    service.obtenerUsuarioPorEmail('a@a.com').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${BASE}/usuarios/obtener/email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@a.com' });
    expect(req.request.headers.has('Authorization')).toBeFalse();

    req.flush({ nombre: 'Test', rol: 'investigador' });
    expect(result).toEqual({ nombre: 'Test', rol: 'investigador' });
  });

  it('obtenerInvestigadoresMismoGrupo should normalize email, send token and return data when ok', async () => {
    const promise = service.obtenerInvestigadoresMismoGrupo('  User@Mail.COM ');
    await flush();

    const req = httpMock.expectOne(`${BASE}/usuarios/obtener/investigadores-mismo-grupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@mail.com' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer mocked-token');

    req.flush({ ok: true, data: [{ email: 'inv@mail.com' }] });
    expect(await promise).toEqual([{ email: 'inv@mail.com' }]);
  });

  it('obtenerInvestigadoresMismoGrupo should return [] when response is not ok', async () => {
    const promise = service.obtenerInvestigadoresMismoGrupo('a@a.com');
    await flush();

    const req = httpMock.expectOne(`${BASE}/usuarios/obtener/investigadores-mismo-grupo`);
    req.flush({ ok: false, data: [] });
    expect(await promise).toEqual([]);
  });

  it('obtenerUsuariosMismoGrupo should POST and return data when ok', async () => {
    const promise = service.obtenerUsuariosMismoGrupo('a@a.com');
    await flush();

    const req = httpMock.expectOne(`${BASE}/usuarios/obtener/usuarios-mismo-grupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@a.com' });

    req.flush({ ok: true, data: [{ email: 'b@b.com' }, { email: 'c@c.com' }] });
    expect(await promise).toEqual([{ email: 'b@b.com' }, { email: 'c@c.com' }]);
  });

  it('obtenerUsuariosMismoGrupo should return [] when ok is true but data is null', async () => {
    const promise = service.obtenerUsuariosMismoGrupo('a@a.com');
    await flush();

    const req = httpMock.expectOne(`${BASE}/usuarios/obtener/usuarios-mismo-grupo`);
    req.flush({ ok: true, data: null });
    expect(await promise).toEqual([]);
  });

  // #endregion

  // #region ADMIN

  it('obtenerUsuariosNoAdministradores should GET the user list with auth header', async () => {
    const promise = service.obtenerUsuariosNoAdministradores();
    await flush();

    const req = httpMock.expectOne(`${BASE}/admin/usuarios/listar`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mocked-token');

    const usuarios = [{ email: 'u@u.com', rol: 'trabajador' }] as any;
    req.flush(usuarios);
    expect(await promise).toEqual(usuarios);
  });

  it('crearUsuario should POST the payload', async () => {
    const payload = {
      email: 'nuevo@mail.com',
      nombre: 'Nuevo',
      apellidos: 'Usuario',
      telefono: '600000000',
      rol: 'trabajador' as any,
      grupo: 'grupo1',
    };
    const promise = service.crearUsuario(payload);
    await flush();

    const req = httpMock.expectOne(`${BASE}/admin/usuarios/crear`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({ ok: true, uid: 'uid-1', estado: 'pendiente' });
    expect(await promise).toEqual({ ok: true, uid: 'uid-1', estado: 'pendiente' as any });
  });

  it('actualizarEstadoUsuario should POST uid/activo', async () => {
    const promise = service.actualizarEstadoUsuario({ uid: 'uid-1', activo: false });
    await flush();

    const req = httpMock.expectOne(`${BASE}/admin/usuarios/estado`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ uid: 'uid-1', activo: false });

    req.flush({ ok: true, uid: 'uid-1', estado: 'inactivo' });
    expect(await promise).toEqual({ ok: true, uid: 'uid-1', estado: 'inactivo' as any });
  });

  it('eliminarUsuario should POST email', async () => {
    const promise = service.eliminarUsuario({ email: 'x@x.com' });
    await flush();

    const req = httpMock.expectOne(`${BASE}/admin/usuarios/eliminar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'x@x.com' });

    req.flush({ ok: true });
    await expectAsync(promise).toBeResolved();
  });

  // #endregion

  // #region GRUPOS

  it('crearGrupo should POST nombre', async () => {
    const promise = service.crearGrupo({ nombre: 'Grupo A' });
    await flush();

    const req = httpMock.expectOne(`${BASE}/grupos/crear-grupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Grupo A' });

    req.flush({ ok: true, id: 'g1', nombre: 'Grupo A', memberCount: 0 });
    expect(await promise).toEqual({ ok: true, id: 'g1', nombre: 'Grupo A', memberCount: 0 });
  });

  it('listarGrupos should POST empty filter by default', async () => {
    const promise = service.listarGrupos();
    await flush();

    const req = httpMock.expectOne(`${BASE}/grupos/listar-grupos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});

    const grupos = [{ id: 'g1', nombre: 'Grupo A', memberCount: 2 }];
    req.flush(grupos);
    expect(await promise).toEqual(grupos);
  });

  it('borrarGrupo should POST nombre', async () => {
    const promise = service.borrarGrupo({ nombre: 'Grupo A' });
    await flush();

    const req = httpMock.expectOne(`${BASE}/grupos/borrar-grupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Grupo A' });

    req.flush({ ok: true, id: 'g1', nombre: 'Grupo A' });
    expect(await promise).toEqual({ ok: true, id: 'g1', nombre: 'Grupo A' });
  });

  // #endregion

  // #region TAREAS

  it('obtenerEstudiosPorTareasUsuario should POST email with token', async () => {
    const obs = await service.obtenerEstudiosPorTareasUsuario('a@a.com');
    let result: any;
    obs.subscribe((r: any) => (result = r));

    const req = httpMock.expectOne(`${BASE}/getEstudiosPorTareasUsuario`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@a.com' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer mocked-token');

    req.flush([{ id: 'e1' }]);
    expect(result).toEqual([{ id: 'e1' }]);
  });

  it('obtenerEstudioPorIdParaUsuario should POST idEstudio and email', async () => {
    const promise = service.obtenerEstudioPorIdParaUsuario('e1', 'a@a.com');
    await flush();

    const req = httpMock.expectOne(`${BASE}/getEstudioPorIdParaUsuario`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idEstudio: 'e1', emailUsuario: 'a@a.com' });

    req.flush({ id: 'e1', nombre: 'Estudio 1' });
    expect(await promise).toEqual({ id: 'e1', nombre: 'Estudio 1' });
  });

  it('subirArchivosTarea should POST payload including momento null by default', async () => {
    const archivos = [{ nombre: 'foto.png', contenido: 'base64' }];
    const obs = await service.subirArchivosTarea('e1', 't1', archivos, 'a@a.com');
    let result: any;
    obs.subscribe((r: any) => (result = r));

    const req = httpMock.expectOne(`${BASE}/guardar-archivos-tarea`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      idEstudio: 'e1',
      idTarea: 't1',
      archivos,
      emailUsuario: 'a@a.com',
      momento: null,
    });

    req.flush({ ok: true });
    expect(result).toEqual({ ok: true });
  });

  it('subirArchivosTarea should include a specific momento when provided', async () => {
    const obs = await service.subirArchivosTarea('e1', 't1', [], 'a@a.com', 'antes');
    obs.subscribe();

    const req = httpMock.expectOne(`${BASE}/guardar-archivos-tarea`);
    expect(req.request.body.momento).toBe('antes');
    req.flush({ ok: true });
  });

  it('eliminarArchivoTarea should POST nombreArchivo and momento', async () => {
    const promise = service.eliminarArchivoTarea('e1', 't1', 'foto.png', 'despues');
    await flush();

    const req = httpMock.expectOne(`${BASE}/eliminar-archivo-tarea`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      idEstudio: 'e1',
      idTarea: 't1',
      nombreArchivo: 'foto.png',
      momento: 'despues',
    });

    req.flush(null);
    await expectAsync(promise).toBeResolved();
  });

  it('leerArchivoTarea should POST and return file content', async () => {
    const promise = service.leerArchivoTarea('e1', 't1', 'foto.png');
    await flush();

    const req = httpMock.expectOne(`${BASE}/leer-archivo-tarea`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      idEstudio: 'e1',
      idTarea: 't1',
      nombreArchivo: 'foto.png',
      momento: null,
    });

    req.flush({ contenido: 'base64data' });
    expect(await promise).toEqual({ contenido: 'base64data' });
  });

  // #endregion

  // #region ESTUDIOS

  it('obtenerEstudiosPorUsuario should POST email with token', async () => {
    const obs = await service.obtenerEstudiosPorUsuario('a@a.com');
    let result: any;
    obs.subscribe((r: any) => (result = r));

    const req = httpMock.expectOne(`${BASE}/getEstudios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@a.com' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer mocked-token');

    req.flush([{ id: 'e1' }, { id: 'e2' }]);
    expect(result.length).toBe(2);
  });

  it('eliminarEstudio should POST the id', async () => {
    const obs = await service.eliminarEstudio('e1');
    obs.subscribe();

    const req = httpMock.expectOne(`${BASE}/eliminar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id: 'e1' });
    req.flush({ ok: true });
  });

  it('crearEstudioPorPartes should POST email, data and step', async () => {
    const data = { nombre: 'Estudio 1' };
    const obs = await service.crearEstudioPorPartes('a@a.com', data, 'formulario');
    obs.subscribe();

    const req = httpMock.expectOne(`${BASE}/crearEstudio`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@a.com', data, step: 'formulario' });
    req.flush({ id: 'nuevo' });
  });

  it('crearEstudioPorPartesZonasNew should POST figures payload', async () => {
    const data = { figuras: [] };
    const resumen = [{ id: 'f1' }];
    const obs = await service.crearEstudioPorPartesZonasNew('a@a.com', data, 'zonas', 'form1', resumen);
    obs.subscribe();

    const req = httpMock.expectOne(`${BASE}/crearEstudioZonasNuevo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'a@a.com',
      data,
      step: 'zonas',
      idFormulario: 'form1',
      resumenFiguras: resumen,
    });
    req.flush({ ok: true });
  });

  it('crearEstudioPorPartesTareas should POST tareas payload', async () => {
    const data = [{ id: 't1' }];
    const obs = await service.crearEstudioPorPartesTareas('a@a.com', data, 'tareas', 'form1');
    obs.subscribe();

    const req = httpMock.expectOne(`${BASE}/crearEstudioTareas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'a@a.com',
      data,
      step: 'tareas',
      idFormulario: 'form1',
    });
    req.flush({ ok: true });
  });

  it('actualizarEstudio should POST id, data and step to /crearEstudio', async () => {
    const data = { nombre: 'Editado' };
    const obs = await service.actualizarEstudio('e1', data, 'formulario');
    obs.subscribe();

    const req = httpMock.expectOne(`${BASE}/crearEstudio`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id: 'e1', data, step: 'formulario' });
    req.flush({ ok: true });
  });

  it('cambiarEstadoEstudio should POST the payload', async () => {
    const payload = { id: 'e1', estado: 'finalizado' };
    const obs = await service.cambiarEstadoEstudio(payload);
    obs.subscribe();

    const req = httpMock.expectOne(`${BASE}/cambiarEstadoEstudio`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ ok: true });
  });

  it('actualizarPermisosEstudio should POST the data', async () => {
    const data = { id: 'e1', permisos: ['a@a.com'] };
    const obs = await service.actualizarPermisosEstudio(data);
    obs.subscribe();

    const req = httpMock.expectOne(`${BASE}/actualizarPermisosEstudio`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({ ok: true });
  });

  // #endregion

  // #region MOMENTOS

  it('verificarEliminacionMomentos should send tieneMomentos=false in checkbox case', async () => {
    const promise = service.verificarEliminacionMomentos('e1', true);
    await flush();

    const req = httpMock.expectOne(`${BASE}/momentos/verificar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id: 'e1', tieneMomentos: false });

    req.flush({ tareasAfectadas: [] });
    expect(await promise).toEqual({ tareasAfectadas: [] });
  });

  it('verificarEliminacionMomentos should send momentoAEliminar in specific case', async () => {
    const promise = service.verificarEliminacionMomentos('e1', false, 'antes');
    await flush();

    const req = httpMock.expectOne(`${BASE}/momentos/verificar`);
    expect(req.request.body).toEqual({ id: 'e1', momentoAEliminar: 'antes' });

    req.flush({ tareasAfectadas: ['t1'] });
    expect(await promise).toEqual({ tareasAfectadas: ['t1'] });
  });

  it('actualizarMomentos should send tieneMomentos=false in checkbox case', async () => {
    const promise = service.actualizarMomentos('e1', true);
    await flush();

    const req = httpMock.expectOne(`${BASE}/momentos/actualizar`);
    expect(req.request.body).toEqual({ id: 'e1', tieneMomentos: false });

    req.flush({ ok: true });
    expect(await promise).toEqual({ ok: true });
  });

  it('actualizarMomentos should send momentoAEliminar in specific case', async () => {
    const promise = service.actualizarMomentos('e1', false, 'despues');
    await flush();

    const req = httpMock.expectOne(`${BASE}/momentos/actualizar`);
    expect(req.request.body).toEqual({ id: 'e1', momentoAEliminar: 'despues' });

    req.flush({ ok: true });
    expect(await promise).toEqual({ ok: true });
  });

  // #endregion

  // #region AUTENTICACIÓN

  it('should reject with "Usuario no autenticado" when there is no user (authHeaders)', async () => {
    mockAngularFireAuth.currentUser = Promise.resolve(null);

    await expectAsync(service.obtenerUsuariosNoAdministradores()).toBeRejectedWithError(
      'Usuario no autenticado'
    );
  });

  it('should reject with "User is not authenticated" when there is no user (estudios)', async () => {
    mockAngularFireAuth.currentUser = Promise.resolve(null);

    await expectAsync(service.obtenerEstudiosPorUsuario('a@a.com')).toBeRejectedWithError(
      'User is not authenticated'
    );
    await expectAsync(service.obtenerEstudiosPorTareasUsuario('a@a.com')).toBeRejectedWithError(
      'User is not authenticated'
    );
    await expectAsync(service.subirArchivosTarea('e', 't', [], 'a@a.com')).toBeRejectedWithError(
      'Usuario no autenticado'
    );
  });

  // #endregion
});
