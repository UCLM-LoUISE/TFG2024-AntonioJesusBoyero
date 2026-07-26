import { FormBuilder } from '@angular/forms';
import { AdminUsuariosComponent } from './admin-usuarios.component';

describe('AdminUsuariosComponent', () => {
  let comp: AdminUsuariosComponent;
  let mockBack: any;
  let mockAuth: any;

  const usuario = (extra: any = {}): any => ({
    email: 'user@test.com',
    nombre: 'Ana',
    apellidos: 'García',
    telefono: '600111222',
    rol: 'investigador',
    grupo: 'G1',
    estado: 'activo',
    loadingAccion: null,
    ...extra
  });

  beforeEach(() => {
    mockBack = jasmine.createSpyObj('BackService', [
      'obtenerUsuariosNoAdministradores',
      'crearUsuario',
      'eliminarUsuario',
      'actualizarEstadoUsuario',
      'listarGrupos'
    ]);
    mockBack.obtenerUsuariosNoAdministradores.and.returnValue(Promise.resolve([]));
    mockBack.listarGrupos.and.returnValue(Promise.resolve([]));
    mockAuth = jasmine.createSpyObj('AuthService', ['resetPassword']);
    mockAuth.resetPassword.and.returnValue(Promise.resolve());
    comp = new AdminUsuariosComponent(new FormBuilder() as any, mockBack, mockAuth);
  });

  it('se crea con el formulario inicializado', () => {
    expect(comp).toBeTruthy();
    expect(comp.form.get('rol')?.value).toBe('investigador');
    expect(comp.form.valid).toBeFalse();
  });

  it('ngOnInit carga los usuarios', async () => {
    comp.ngOnInit();
    expect(mockBack.obtenerUsuariosNoAdministradores).toHaveBeenCalled();
    await comp.cargarUsuarios();
    expect(comp.loading).toBeFalse();
  });

  describe('cargarUsuarios', () => {
    it('normaliza los distintos formatos de fechaCreacion', async () => {
      mockBack.obtenerUsuariosNoAdministradores.and.returnValue(Promise.resolve([
        usuario({ email: 'a@a.com', fechaCreacion: '2024-01-01' }),
        usuario({ email: 'b@b.com', fechaCreacion: 1700000000000 }),
        usuario({ email: 'c@c.com', fechaCreacion: { toDate: () => new Date(2024, 0, 2) } }),
        usuario({ email: 'd@d.com', fechaCreacion: { seconds: 1700000000 } }),
        usuario({ email: 'e@e.com', fechaCreacion: { _seconds: 1700000000 } }),
        usuario({ email: 'f@f.com', fechaCreacion: null })
      ]));
      await comp.cargarUsuarios();
      expect(comp.usuarios.length).toBe(6);
      comp.usuarios.slice(0, 5).forEach(u => expect((u as any).fechaCreacion instanceof Date).toBeTrue());
      expect((comp.usuarios[5] as any).fechaCreacion).toBeNull();
      expect(comp.filtrados.length).toBe(6);
    });

    it('gestiona los errores dejando la lista vacía', async () => {
      mockBack.obtenerUsuariosNoAdministradores.and.returnValue(Promise.reject(new Error('fallo')));
      await comp.cargarUsuarios();
      expect(comp.usuarios).toEqual([]);
      expect(comp.loading).toBeFalse();
    });

    it('carga los grupos disponibles ordenados y resetea el filtro huérfano', async () => {
      mockBack.listarGrupos.and.returnValue(Promise.resolve([
        { id: '1', nombre: ' Zeta ' },
        { id: '2', nombre: 'Alfa' },
        { id: '3', nombre: '' },
        { id: '4' }
      ]));
      comp.filtroGrupo = 'NoExiste';
      await comp.cargarUsuarios();
      expect(comp.gruposDisponibles).toEqual(['Alfa', 'Zeta']);
      expect(comp.filtroGrupo).toBe('');
    });
  });

  describe('filtros y paginación', () => {
    beforeEach(() => {
      comp.usuarios = [
        usuario({ email: 'ana@test.com', nombre: 'Ana', apellidos: 'García', grupo: 'G1', rol: 'investigador' }),
        usuario({ email: 'luis@test.com', nombre: 'Luis', apellidos: 'Pérez', grupo: 'G2', rol: 'trabajador', telefono: '699999999' }),
        usuario({ email: 'eva@test.com', nombre: 'Eva', apellidos: 'Ruiz', grupo: null, telefono: null })
      ];
    });

    it('aplicarFiltros busca por email, nombre, teléfono y grupo', () => {
      comp.search = 'ana@';
      comp.aplicarFiltros();
      expect(comp.filtrados.length).toBe(1);

      comp.search = 'luis pérez';
      comp.aplicarFiltros();
      expect(comp.filtrados.length).toBe(1);

      comp.search = '699999999';
      comp.aplicarFiltros();
      expect(comp.filtrados[0].email).toBe('luis@test.com');

      comp.search = 'g1';
      comp.aplicarFiltros();
      expect(comp.filtrados[0].email).toBe('ana@test.com');
    });

    it('aplicarFiltros filtra por rol y grupo', () => {
      comp.search = '';
      comp.filtroRol = 'trabajador';
      comp.aplicarFiltros();
      expect(comp.filtrados.length).toBe(1);

      comp.filtroRol = '';
      comp.filtroGrupo = 'G1';
      comp.aplicarFiltros();
      expect(comp.filtrados.length).toBe(1);
      expect(comp.filtrados[0].grupo).toBe('G1');
    });

    it('la paginación avanza y retrocede dentro de los límites', () => {
      comp.usuarios = Array.from({ length: 12 }, (_, i) => usuario({ email: `u${i}@t.com` }));
      comp.aplicarFiltros();
      expect(comp.totalPages).toBe(3);
      expect(comp.pageData.length).toBe(5);

      comp.anterior();
      expect(comp.currentPage).toBe(1);

      comp.siguiente();
      expect(comp.currentPage).toBe(2);
      comp.siguiente();
      comp.siguiente();
      expect(comp.currentPage).toBe(3);
      expect(comp.pageData.length).toBe(2);

      comp.anterior();
      expect(comp.currentPage).toBe(2);
    });
  });

  describe('invitar', () => {
    it('marca el formulario si es inválido', async () => {
      await comp.invitar();
      expect(comp.form.touched).toBeTrue();
      expect(mockBack.crearUsuario).not.toHaveBeenCalled();
    });

    it('crea el usuario, envía el reset de contraseña y recarga', async () => {
      mockBack.crearUsuario.and.returnValue(Promise.resolve({ ok: true, uid: 'u1' }));
      comp.form.patchValue({ email: 'Nuevo@Test.com', nombre: 'Nuevo', apellidos: 'Usuario', rol: 'trabajador', grupo: '' });
      await comp.invitar();
      expect(mockBack.crearUsuario).toHaveBeenCalledWith(jasmine.objectContaining({
        email: 'nuevo@test.com',
        rol: 'trabajador',
        grupo: null
      }));
      expect(mockAuth.resetPassword).toHaveBeenCalledWith('nuevo@test.com');
      expect(mockBack.obtenerUsuariosNoAdministradores).toHaveBeenCalled();
      expect(comp.creating).toBeFalse();
      expect(comp.form.enabled).toBeTrue();
    });

    it('muestra el error si el backend responde ko', async () => {
      const alertSpy = spyOn(window, 'alert');
      mockBack.crearUsuario.and.returnValue(Promise.resolve({ ok: false, error: 'email_already_in_use' }));
      comp.form.patchValue({ email: 'x@x.com', nombre: 'X', apellidos: 'Y' });
      await comp.invitar();
      expect(alertSpy).toHaveBeenCalledWith('Ese correo ya está en uso.');
      expect(comp.creating).toBeFalse();
    });
  });

  describe('borrarUsuario', () => {
    it('no hace nada si el usuario cancela', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      await comp.borrarUsuario(usuario());
      expect(mockBack.eliminarUsuario).not.toHaveBeenCalled();
    });

    it('no repite la acción si ya está en curso', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      await comp.borrarUsuario(usuario({ loadingAccion: 'borrar' }));
      expect(mockBack.eliminarUsuario).not.toHaveBeenCalled();
    });

    it('borra el usuario y recarga la lista', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      mockBack.eliminarUsuario.and.returnValue(Promise.resolve());
      const u = usuario();
      await comp.borrarUsuario(u);
      expect(mockBack.eliminarUsuario).toHaveBeenCalledWith({ email: 'user@test.com' });
      expect(u.loadingAccion).toBeNull();
    });

    it('avisa si el borrado falla', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      const alertSpy = spyOn(window, 'alert');
      mockBack.eliminarUsuario.and.returnValue(Promise.reject(new Error('fallo')));
      const u = usuario();
      await comp.borrarUsuario(u);
      expect(alertSpy).toHaveBeenCalled();
      expect(u.loadingAccion).toBeNull();
    });
  });

  describe('toggleEstado', () => {
    it('activa o desactiva el usuario según su estado actual', async () => {
      mockBack.actualizarEstadoUsuario.and.returnValue(Promise.resolve({ ok: true, uid: 'u1', estado: 'inactivo' }));
      const u = usuario({ estado: 'activo' });
      await comp.toggleEstado(u);
      expect(mockBack.actualizarEstadoUsuario).toHaveBeenCalledWith({ email: 'user@test.com', activo: false });
      expect(u.estado).toBe('inactivo');
      expect(u.loadingAccion).toBeNull();
    });

    it('no repite la acción si ya está en curso', async () => {
      await comp.toggleEstado(usuario({ loadingAccion: 'estado' }));
      expect(mockBack.actualizarEstadoUsuario).not.toHaveBeenCalled();
    });

    it('avisa si el backend responde ko', async () => {
      const alertSpy = spyOn(window, 'alert');
      mockBack.actualizarEstadoUsuario.and.returnValue(Promise.resolve({ ok: false }));
      const u = usuario({ estado: 'inactivo' });
      await comp.toggleEstado(u);
      expect(alertSpy).toHaveBeenCalled();
      expect(u.estado).toBe('inactivo');
      expect(u.loadingAccion).toBeNull();
    });
  });

  it('mensajeDeError traduce los códigos conocidos', () => {
    expect(comp.mensajeDeError('email_already_in_use')).toBe('Ese correo ya está en uso.');
    expect(comp.mensajeDeError('email_already_in_use_auth')).toBe('Ese correo ya está en uso.');
    expect(comp.mensajeDeError('missing_fields')).toBe('Faltan campos obligatorios.');
    expect(comp.mensajeDeError('otro')).toBe('Se produjo un error. Inténtalo de nuevo.');
  });

  it('badgeClass devuelve la clase según el estado', () => {
    expect(comp.badgeClass('activo')).toBe('badge bg-success');
    expect(comp.badgeClass('inactivo' as any)).toBe('badge bg-secondary');
  });
});
