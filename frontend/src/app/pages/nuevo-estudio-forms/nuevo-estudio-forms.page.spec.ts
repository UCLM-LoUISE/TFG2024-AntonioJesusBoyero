import { fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { NuevoEstudioFormsPage } from './nuevo-estudio-forms.page';
import { EstudiosPage } from '../estudios/estudios.page';
import { EstudioData } from 'src/app/data/estudios-data';

describe('NuevoEstudioFormsPage', () => {
  let page: NuevoEstudioFormsPage;
  let mockLocalidades: any;
  let mockRouter: any;
  let mockRoute: any;
  let mockBackend: any;
  let mockAfAuth: any;
  const addedEls: HTMLElement[] = [];

  const crearDiv = (id: string): HTMLElement => {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    addedEls.push(el);
    return el;
  };

  const datosGuardados = (extra: any = {}) => ({
    nombre: 'Estudio guardado',
    fechaInicio: '2024-05-01',
    fechaFin: '2024-06-01',
    tipoSesion: 'diurna',
    provincia: 'Albacete',
    poblacion: 'Hellín',
    notes: 'notas',
    estado: 'Borrador',
    idFormulario: 'f1',
    ...extra
  });

  const crearPagina = (): NuevoEstudioFormsPage =>
    new NuevoEstudioFormsPage(new FormBuilder(), mockLocalidades, mockRouter, mockRoute, mockBackend, mockAfAuth);

  beforeEach(() => {
    (window as any).bootstrap = {
      Modal: class {
        constructor(el: any, opts?: any) { }
        show() { }
        hide() { }
        static getInstance(el: any) { return { hide() { }, show() { } }; }
      }
    };
    mockLocalidades = {
      getProvinciasNuevo: () => [{ code: '02', label: 'Albacete' }, { code: '01', label: 'Álava' }],
      getPoblacionesByProvinciaNuevo: jasmine.createSpy('getPoblaciones').and.returnValue(['Hellín', 'Albacete'])
    };
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockRouter.getCurrentNavigation = () => null;
    mockRoute = { snapshot: { queryParamMap: { get: (_: string) => null } } };
    mockBackend = jasmine.createSpyObj('BackService', [
      'crearEstudioPorPartes',
      'actualizarEstudio',
      'verificarEliminacionMomentos',
      'actualizarMomentos',
      'obtenerEstudiosPorUsuario'
    ]);
    mockBackend.crearEstudioPorPartes.and.returnValue(Promise.resolve(of({ ok: true })));
    mockBackend.actualizarEstudio.and.returnValue(Promise.resolve(of({ ok: true })));
    mockAfAuth = { currentUser: Promise.resolve({ email: 'a@a.com', getIdToken: () => Promise.resolve('t') }) };

    EstudiosPage.Instance = { editMode: false, idEstudioEdit: '', estudios: [], diaSeleccionadoCalendario: undefined } as any;
    EstudioData.reset();
    page = crearPagina();
  });

  afterEach(() => {
    addedEls.splice(0).forEach(el => el.remove());
    EstudioData.reset();
    delete (window as any).momentosModalResolver;
  });

  describe('inicialización', () => {
    it('ngOnInit crea el formulario en modo creación', () => {
      page.ngOnInit();
      expect(page.nuevoEstudioForm).toBeDefined();
      expect(page.nuevoEstudioForm.get('nombre')?.value).toBe('');
      expect(page.nuevoEstudioForm.get('poblacion')?.disabled).toBeTrue();
      expect(page.provincias.length).toBe(2);
    });

    it('initializeForm recupera los datos del buffer', () => {
      EstudioData.setNuevoEstudioFormData(datosGuardados({ tieneMomentos: true, momentos: ['M1'] }));
      page.ngOnInit();
      expect(page.nuevoEstudioForm.get('nombre')?.value).toBe('Estudio guardado');
      expect(page.nuevoEstudioForm.get('poblacion')?.enabled).toBeTrue();
      expect(page.tieneMomentos).toBeTrue();
      expect(page.momentos).toEqual(['M1']);
      expect(page.poblaciones.length).toBe(2);
    });

    it('usa la fechaInicio del query param sumando un día', () => {
      mockRoute.snapshot.queryParamMap.get = (k: string) => (k === 'fechaInicio' ? '2024-05-10' : null);
      page.ngOnInit();
      expect(page.nuevoEstudioForm.get('fechaInicio')?.value).toBe('2024-05-11');
    });

    it('usa el día seleccionado del calendario si no hay query param', () => {
      (EstudiosPage.Instance as any).diaSeleccionadoCalendario = new Date(2024, 4, 20);
      page.ngOnInit();
      expect(page.nuevoEstudioForm.get('fechaInicio')?.value).toBe('2024-05-20');
    });

    it('validateDateRange marca el error cuando el rango es inválido', () => {
      page.ngOnInit();
      page.nuevoEstudioForm.patchValue({ fechaInicio: '2024-06-01', fechaFin: '2024-05-01' });
      expect(page.nuevoEstudioForm.errors).toEqual({ invalidDateRange: true });
      page.nuevoEstudioForm.patchValue({ fechaFin: '2024-07-01' });
      expect(page.nuevoEstudioForm.errors).toBeNull();
    });
  });

  describe('modo edición', () => {
    beforeEach(() => {
      EstudiosPage.Instance = {
        editMode: true,
        idEstudioEdit: 'e1',
        estudios: [{ id: 'e1', data: { NuevoEstudioFormData: datosGuardados({ tieneMomentos: true, momentos: ['M1', 'M2'] }) } }]
      } as any;
      page = crearPagina();
    });

    it('carga los datos del estudio en el formulario', () => {
      page.ngOnInit();
      expect(page.nuevoEstudioForm.get('nombre')?.value).toBe('Estudio guardado');
      expect(page.momentos).toEqual(['M1', 'M2']);
      expect((page as any).momentosOriginalesBackend).toEqual(['M1', 'M2']);
    });

    it('gestiona estudio no encontrado o sin datos', () => {
      (EstudiosPage.Instance as any).estudios = [];
      const errorSpy = spyOn(console, 'error');
      page.ngOnInit();
      expect(errorSpy).toHaveBeenCalled();

      (EstudiosPage.Instance as any).estudios = [{ id: 'e1', data: {} }];
      page.ngOnInit();
      expect(errorSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('onProvinciaChange carga poblaciones y habilita el control', () => {
    page.ngOnInit();
    page.onProvinciaChange({ target: { value: 'Albacete' } } as unknown as Event);
    expect(mockLocalidades.getPoblacionesByProvinciaNuevo).toHaveBeenCalledWith('Albacete');
    expect(page.nuevoEstudioForm.get('poblacion')?.enabled).toBeTrue();
  });

  it('goBack navega a /estudios', () => {
    page.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
  });

  describe('gestión de momentos (modo creación)', () => {
    beforeEach(() => {
      page.ngOnInit();
    });

    it('agregarMomento añade momentos y evita duplicados y vacíos', () => {
      const notifSpy = spyOn<any>(page, 'mostrarNotificacion');
      page.nuevoMomento = '  ';
      page.agregarMomento();
      expect(page.momentos.length).toBe(0);

      page.nuevoMomento = ' Primavera ';
      page.agregarMomento();
      expect(page.momentos).toEqual(['Primavera']);
      expect(page.nuevoMomento).toBe('');

      page.nuevoMomento = 'primavera';
      page.agregarMomento();
      expect(page.momentos).toEqual(['Primavera']);
      expect(notifSpy).toHaveBeenCalledWith('error', jasmine.stringMatching('ya existe'));
    });

    it('eliminarMomento elimina y desmarca el checkbox con el último', async () => {
      page.tieneMomentos = true;
      page.momentos = ['M1', 'M2'];
      await page.eliminarMomento(0);
      expect(page.momentos).toEqual(['M2']);
      expect(page.tieneMomentos).toBeTrue();
      await page.eliminarMomento(0);
      expect(page.momentos).toEqual([]);
      expect(page.tieneMomentos).toBeFalse();
      expect(page.nuevoEstudioForm.get('tieneMomentos')?.value).toBeFalse();
    });

    it('onTieneMomentosChange desmarcado limpia los momentos localmente', async () => {
      page.tieneMomentos = false;
      page.momentos = ['M1'];
      page.nuevoMomento = 'algo';
      await page.onTieneMomentosChange();
      expect(page.momentos).toEqual([]);
      expect(page.nuevoMomento).toBe('');
    });

    it('onTieneMomentosChange marcado actualiza el formulario', async () => {
      page.tieneMomentos = true;
      page.momentos = ['M1'];
      await page.onTieneMomentosChange();
      expect(page.nuevoEstudioForm.get('tieneMomentos')?.value).toBeTrue();
      expect(page.nuevoEstudioForm.get('momentos')?.value).toEqual(['M1']);
    });

    it('onTieneMomentosChange no hace nada si está procesando', async () => {
      (page as any).procesandoCambioCheckbox = true;
      page.tieneMomentos = false;
      page.momentos = ['M1'];
      await page.onTieneMomentosChange();
      expect(page.momentos).toEqual(['M1']);
    });
  });

  describe('gestión de momentos (modo edición)', () => {
    beforeEach(() => {
      EstudiosPage.Instance = {
        editMode: true,
        idEstudioEdit: 'e1',
        estudios: [{ id: 'e1', data: { NuevoEstudioFormData: datosGuardados({ tieneMomentos: true, momentos: ['M1', 'M2'] }) } }]
      } as any;
      page = crearPagina();
      page.ngOnInit();
      mockBackend.verificarEliminacionMomentos.and.returnValue(Promise.resolve({
        tituloModal: 'Confirmar',
        mensajeModal: '¿Seguro?',
        hayTareasAfectadas: true
      }));
      mockBackend.actualizarMomentos.and.returnValue(Promise.resolve({ ok: true }));
      spyOn<any>(page, 'recargarEstudio').and.returnValue(Promise.resolve());
      spyOn<any>(page, 'mostrarNotificacion');
    });

    it('eliminarMomento de un momento del backend confirmado lo elimina', async () => {
      spyOn<any>(page, 'mostrarModalConfirmacion').and.returnValue(Promise.resolve(true));
      await page.eliminarMomento(0);
      expect(mockBackend.verificarEliminacionMomentos).toHaveBeenCalledWith('e1', false, 'M1');
      expect(mockBackend.actualizarMomentos).toHaveBeenCalledWith('e1', false, 'M1');
      expect(page.momentos).toEqual(['M2']);
      expect((page as any).mostrarNotificacion).toHaveBeenCalledWith('success', jasmine.any(String));
    });

    it('eliminarMomento cancelado no toca nada', async () => {
      spyOn<any>(page, 'mostrarModalConfirmacion').and.returnValue(Promise.resolve(false));
      await page.eliminarMomento(0);
      expect(mockBackend.actualizarMomentos).not.toHaveBeenCalled();
      expect(page.momentos).toEqual(['M1', 'M2']);
    });

    it('eliminarMomento del último momento del backend desmarca el checkbox', async () => {
      spyOn<any>(page, 'mostrarModalConfirmacion').and.returnValue(Promise.resolve(true));
      page.momentos = ['M1'];
      await page.eliminarMomento(0);
      expect(page.tieneMomentos).toBeFalse();
      expect(page.momentos).toEqual([]);
    });

    it('eliminarMomento gestiona errores del backend', async () => {
      spyOn<any>(page, 'mostrarModalConfirmacion').and.returnValue(Promise.resolve(true));
      mockBackend.actualizarMomentos.and.returnValue(Promise.reject(new Error('fallo')));
      await page.eliminarMomento(0);
      expect((page as any).mostrarNotificacion).toHaveBeenCalledWith('error', jasmine.any(String));
    });

    it('eliminarMomento de un momento nuevo (no en backend) lo quita directamente', async () => {
      page.momentos = ['M1', 'Nuevo'];
      await page.eliminarMomento(1);
      expect(mockBackend.verificarEliminacionMomentos).not.toHaveBeenCalled();
      expect(page.momentos).toEqual(['M1']);
    });

    it('eliminarMomento del último momento nuevo desmarca el checkbox', async () => {
      (page as any).momentosOriginalesBackend = [];
      page.momentos = ['Nuevo'];
      await page.eliminarMomento(0);
      expect(page.momentos).toEqual([]);
      expect(page.tieneMomentos).toBeFalse();
    });

    it('onTieneMomentosChange desmarcado sin momentos limpia localmente', async () => {
      (page as any).momentosOriginalesBackend = [];
      page.momentos = [];
      page.tieneMomentos = false;
      await page.onTieneMomentosChange();
      expect(page.nuevoEstudioForm.get('tieneMomentos')?.value).toBeFalse();
      expect(mockBackend.verificarEliminacionMomentos).not.toHaveBeenCalled();
    });

    it('onTieneMomentosChange desmarcado confirmado desactiva las fases', async () => {
      spyOn<any>(page, 'mostrarModalConfirmacion').and.returnValue(Promise.resolve(true));
      page.tieneMomentos = false;
      await page.onTieneMomentosChange();
      expect(mockBackend.verificarEliminacionMomentos).toHaveBeenCalledWith('e1', true);
      expect(mockBackend.actualizarMomentos).toHaveBeenCalledWith('e1', true);
      expect(page.momentos).toEqual([]);
      expect((page as any).mostrarNotificacion).toHaveBeenCalledWith('success', jasmine.any(String));
    });

    it('onTieneMomentosChange desmarcado cancelado restaura el checkbox', async () => {
      spyOn<any>(page, 'mostrarModalConfirmacion').and.returnValue(Promise.resolve(false));
      page.tieneMomentos = false;
      await page.onTieneMomentosChange();
      expect(page.tieneMomentos).toBeTrue();
      expect(mockBackend.actualizarMomentos).not.toHaveBeenCalled();
    });

    it('onTieneMomentosChange desmarcado con error restaura el checkbox', async () => {
      spyOn<any>(page, 'mostrarModalConfirmacion').and.returnValue(Promise.resolve(true));
      mockBackend.actualizarMomentos.and.returnValue(Promise.reject(new Error('fallo')));
      page.tieneMomentos = false;
      await page.onTieneMomentosChange();
      expect(page.tieneMomentos).toBeTrue();
      expect((page as any).mostrarNotificacion).toHaveBeenCalledWith('error', jasmine.any(String));
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      EstudioData.setNuevoEstudioFormData(datosGuardados());
      page.ngOnInit();
    });

    it('no envía si el formulario es inválido', async () => {
      page.nuevoEstudioForm.patchValue({ nombre: '' });
      await page.onSubmit();
      expect(page.hasSubmitted).toBeTrue();
      expect(mockBackend.crearEstudioPorPartes).not.toHaveBeenCalled();
    });

    it('no envía si tieneMomentos está activo sin momentos', async () => {
      page.tieneMomentos = true;
      page.momentos = [];
      await page.onSubmit();
      expect(mockBackend.crearEstudioPorPartes).not.toHaveBeenCalled();
    });

    it('no envía si no se puede obtener el email', async () => {
      mockAfAuth.currentUser = Promise.resolve(null);
      await page.onSubmit();
      expect(mockBackend.crearEstudioPorPartes).not.toHaveBeenCalled();
    });

    it('crea un estudio nuevo y navega a zonas', async () => {
      await page.onSubmit();
      expect(mockBackend.crearEstudioPorPartes).toHaveBeenCalledWith('a@a.com', jasmine.any(Object), jasmine.any(String));
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/crear-zonas-muestreos']);
      expect(EstudioData.getNuevoEstudioFormData().nombre).toBe('Estudio guardado');
    });

    it('actualiza un estudio existente y lo sincroniza localmente', async () => {
      const estudioLocal: any = { id: 'e1', data: { NuevoEstudioFormData: {} } };
      (EstudiosPage.Instance as any).estudios = [estudioLocal];
      page.idEstudio = 'e1';
      await page.onSubmit();
      expect(mockBackend.actualizarEstudio).toHaveBeenCalledWith('e1', jasmine.any(Object), jasmine.any(String));
      expect(estudioLocal.data.NuevoEstudioFormData.nombre).toBe('Estudio guardado');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/crear-zonas-muestreos']);
    });

    it('avisa si el estudio a actualizar no está localmente', async () => {
      (EstudiosPage.Instance as any).estudios = [];
      page.idEstudio = 'e1';
      await page.onSubmit();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/crear-zonas-muestreos']);
    });

    it('gestiona errores del backend', async () => {
      mockBackend.crearEstudioPorPartes.and.returnValue(Promise.reject(new Error('fallo')));
      await page.onSubmit();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('modales', () => {
    beforeEach(() => {
      page.ngOnInit();
    });

    it('showModal y closeModal usan el modal de estudios', () => {
      crearDiv('confirmModalEstudios');
      expect(() => page.showModal()).not.toThrow();
      expect(() => page.closeModal()).not.toThrow();
    });

    it('startNewStudy resetea el estado y reinicializa el formulario', () => {
      crearDiv('confirmModalEstudios');
      EstudioData.setNuevoEstudioFormData(datosGuardados());
      page.tieneMomentos = true;
      page.momentos = ['M1'];
      page.startNewStudy();
      expect(page.tieneMomentos).toBeFalse();
      expect(page.momentos).toEqual([]);
      expect(EstudioData.getNuevoEstudioFormData()).toEqual({});
      expect(page.nuevoEstudioForm.get('nombre')?.value).toBe('');
    });

    it('continuePreviousStudy solo cierra el modal', () => {
      crearDiv('confirmModalEstudios');
      expect(() => page.continuePreviousStudy()).not.toThrow();
    });

    it('mostrarModalConfirmacion se resuelve con confirmar y cancelar', async () => {
      crearDiv('confirmModalMomentos');
      const pConfirm = (page as any).mostrarModalConfirmacion('T', 'M', true) as Promise<boolean>;
      expect(page.modalMomentosTitulo).toBe('T');
      expect(page.modalMomentosMensaje).toBe('M');
      page.onConfirmModalMomentos();
      await expectAsync(pConfirm).toBeResolvedTo(true);

      const pCancel = (page as any).mostrarModalConfirmacion('T2', 'M2', false) as Promise<boolean>;
      page.onCancelModalMomentos();
      await expectAsync(pCancel).toBeResolvedTo(false);
    });

    it('onConfirm/onCancel sin resolver no fallan', () => {
      crearDiv('confirmModalMomentos');
      expect(() => page.onConfirmModalMomentos()).not.toThrow();
      expect(() => page.onCancelModalMomentos()).not.toThrow();
    });

    it('closeModalNotificacion cierra el modal de notificaciones', () => {
      crearDiv('notificacionModal');
      expect(() => page.closeModalNotificacion()).not.toThrow();
    });

    it('mostrarNotificacion configura el modal y lo muestra', fakeAsync(() => {
      crearDiv('notificacionModal');
      (page as any).mostrarNotificacion('success', 'Todo bien');
      expect(page.modalNotificacionTipo).toBe('success');
      expect(page.modalNotificacionTitulo).toBe('Éxito');
      expect(page.modalNotificacionMensaje).toBe('Todo bien');
      tick(100);
      (page as any).mostrarNotificacion('error', 'Mal');
      expect(page.modalNotificacionTitulo).toBe('Error');
      tick(100);
    }));
  });

  describe('recargarEstudio', () => {
    it('recarga los estudios del usuario y los datos del formulario', async () => {
      const estudios = [{ id: 'e1', data: { NuevoEstudioFormData: datosGuardados() } }];
      mockBackend.obtenerEstudiosPorUsuario.and.returnValue(Promise.resolve(of(estudios)));
      const cargarSpy = spyOn<any>(page, 'cargarDatosEstudioEditMode');
      page.idEstudio = 'e1';
      await (page as any).recargarEstudio();
      expect((EstudiosPage.Instance as any).estudios).toEqual(estudios);
      expect(cargarSpy).toHaveBeenCalledWith('e1');
    });

    it('gestiona errores al recargar', async () => {
      mockBackend.obtenerEstudiosPorUsuario.and.returnValue(Promise.reject(new Error('fallo')));
      await expectAsync((page as any).recargarEstudio()).toBeResolved();
    });
  });
});
