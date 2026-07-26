import { fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { of } from 'rxjs';
import { GestionTareasPage } from './gestion-tareas.page';
import { EstudiosPage } from '../estudios/estudios.page';
import { ZonasEstudioMuestreosPage } from '../zonas-estudio-muestreos/zonas-estudio-muestreos.page';
import { ModalCrearTareasComponent } from 'src/app/components/modales/modal-crear-tareas/modal-crear-tareas.component';
import { ModalMode } from 'src/app/enums/modalMode';
import { EstudioData } from 'src/app/data/estudios-data';

describe('GestionTareasPage', () => {
  let page: GestionTareasPage;
  let mockRouter: any;
  let mockBack: any;
  let mockAfAuth: any;
  let mockZonas: any;
  let mockModalTareas: any;
  const addedEls: HTMLElement[] = [];

  const crearDiv = (id: string): HTMLElement => {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    addedEls.push(el);
    return el;
  };

  const tarea = (id: string, extra: any = {}): any => ({
    id,
    nombreTarea: `Tarea ${id}`,
    trabajador: 'Trabajador',
    zona: extra.zona ?? 'Zona 1',
    notas: '',
    fecha: '',
    tipoTarea: 'medicion_arboles',
    ...extra
  });

  const crearPagina = (): GestionTareasPage =>
    new GestionTareasPage(mockRouter, mockBack, mockAfAuth);

  beforeEach(() => {
    (window as any).bootstrap = {
      Modal: class {
        constructor(el: any, opts?: any) { }
        show() { }
        hide() { }
        static getInstance(el: any) { return { hide() { }, show() { } }; }
      }
    };
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockBack = jasmine.createSpyObj('BackService', ['cambiarEstadoEstudio', 'crearEstudioPorPartesTareas']);
    mockBack.cambiarEstadoEstudio.and.returnValue(Promise.resolve(of({ ok: true })));
    mockBack.crearEstudioPorPartesTareas.and.returnValue(Promise.resolve(of({ ok: true })));
    mockAfAuth = { currentUser: Promise.resolve({ email: 'a@a.com', getIdToken: () => Promise.resolve('t') }) };

    EstudiosPage.Instance = { editMode: false, idEstudioEdit: '', estudios: [] } as any;

    mockZonas = {
      cambioFigurasEnElMapa: false,
      showModalnoHasGuardado: jasmine.createSpy('showModalnoHasGuardado'),
      verificarMarcadores: jasmine.createSpy('verificarMarcadores'),
      guardarZonas: jasmine.createSpy('guardarZonas'),
      guardarZonasVacias: jasmine.createSpy('guardarZonasVacias'),
      drawnItems: { getLayers: () => [{}] }
    };
    ZonasEstudioMuestreosPage.instance = mockZonas as any;

    mockModalTareas = jasmine.createSpyObj('ModalCrearTareas', ['setViewMode', 'setEditMode', 'setCreateMode', 'setCreateModeLink']);
    mockModalTareas.mode = ModalMode.Create;
    mockModalTareas.currentTask = null;
    ModalCrearTareasComponent.Instance = mockModalTareas as any;

    EstudioData.reset();
    page = crearPagina();
  });

  afterEach(() => {
    addedEls.splice(0).forEach(el => el.remove());
    EstudioData.reset();
  });

  it('el constructor registra la instancia estática', () => {
    expect(GestionTareasPage.Instance).toBe(page);
  });

  describe('ngOnInit', () => {
    it('carga tareas del buffer y calcula la info de momentos', () => {
      EstudioData.setNuevoEstudioFormData({ nombre: 'Mi estudio', tieneMomentos: true, momentos: ['M1', 'M2', 'M3'] });
      EstudioData.setTareasEstudioData([
        tarea('1', { tieneMomentos: true, momentos: { M1: {}, M2: {}, M3: {} } }),
        tarea('2', { tieneMomentos: true, momentos: { M1: {} } }),
        tarea('3', { tieneMomentos: true, momentos: { M1: {}, M2: {} } }),
        tarea('4')
      ]);
      page.ngOnInit();
      expect(page.nombreEstudio).toBe('Mi estudio');
      expect(page.hayTareas).toBeTrue();
      const info = page.taskTableData.map((t: any) => t.momentosInfo);
      expect(info).toEqual(['Todos', 'M1', 'Parcial (2/3)', 'N/A']);
    });

    it('sin momentos oculta la columna y marca las tareas con guion', () => {
      EstudioData.setNuevoEstudioFormData({ nombre: 'Simple' });
      EstudioData.setTareasEstudioData([tarea('1')]);
      page.ngOnInit();
      expect(page.taskTableHeaders.some(h => h.key === 'momentosInfo')).toBeFalse();
      expect((page.taskTableData[0] as any).momentosInfo).toBe('-');
    });

    it('sin tareas en el buffer deja hayTareas a false', () => {
      EstudioData.setNuevoEstudioFormData({});
      EstudioData.setTareasEstudioData([]);
      page.ngOnInit();
      expect(page.hayTareas).toBeFalse();
    });

    it('en modo edición carga las tareas del estudio', () => {
      EstudiosPage.Instance = {
        editMode: true,
        idEstudioEdit: 'e1',
        estudios: [{ id: 'e1', data: { TareasData: [tarea('9')] } }]
      } as any;
      EstudioData.setNuevoEstudioFormData({});
      const editPage = crearPagina();
      editPage.ngOnInit();
      expect(editPage.hayTareas).toBeTrue();
      expect(editPage.taskTableData.length).toBe(1);
    });

    it('en modo edición sin estudio o sin tareas no carga nada', () => {
      EstudiosPage.Instance = { editMode: true, idEstudioEdit: 'nope', estudios: [] } as any;
      const p1 = crearPagina();
      p1.ngOnInit();
      expect(p1.hayTareas).toBeFalse();

      EstudiosPage.Instance = { editMode: true, idEstudioEdit: 'e2', estudios: [{ id: 'e2', data: {} }] } as any;
      const p2 = crearPagina();
      p2.ngOnInit();
      expect(p2.hayTareas).toBeFalse();
    });
  });

  it('goBack navega a /zonas-estudio', () => {
    page.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/zonas-estudio']);
  });

  describe('submit', () => {
    it('avisa si hay cambios sin guardar en el mapa', async () => {
      mockZonas.cambioFigurasEnElMapa = true;
      await page.submit();
      expect(mockZonas.showModalnoHasGuardado).toHaveBeenCalled();
      expect(mockBack.cambiarEstadoEstudio).not.toHaveBeenCalled();
    });

    it('cambia el estado del estudio y navega tras 2 segundos', fakeAsync(() => {
      EstudioData.setNuevoEstudioFormData({ idFormulario: 'f1' });
      page.submit();
      flushMicrotasks();
      expect(mockBack.cambiarEstadoEstudio).toHaveBeenCalledWith(jasmine.objectContaining({ idFormulario: 'f1' }));
      tick(2000);
      expect(page.cargando).toBeFalse();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
    }));

    it('sale si no hay idFormulario ni idEstudio', async () => {
      EstudioData.setNuevoEstudioFormData({});
      await page.submit();
      expect(mockBack.cambiarEstadoEstudio).not.toHaveBeenCalled();
    });

    it('gestiona el error del backend', fakeAsync(() => {
      EstudioData.setNuevoEstudioFormData({ idFormulario: 'f1' });
      mockBack.cambiarEstadoEstudio.and.returnValue(Promise.reject(new Error('fallo')));
      page.submit();
      flushMicrotasks();
      expect(page.cargando).toBeFalse();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('control de tareas', () => {
    beforeEach(() => {
      spyOn(page, 'actualizarEstadoTareasEnElBackend').and.returnValue(Promise.resolve());
      page.taskTableData = [tarea('1', { zona: 'Z1' }), tarea('2', { zona: 'Z2' })];
    });

    it('eliminarTarea quita la tarea y guarda zonas vacías si no quedan figuras', async () => {
      crearDiv('eliminarTareasModal');
      mockZonas.drawnItems = { getLayers: () => [] };
      await page.eliminarTarea('1');
      expect(page.taskTableData.length).toBe(1);
      expect(page.hayTareas).toBeTrue();
      expect(mockZonas.verificarMarcadores).toHaveBeenCalled();
      expect(mockZonas.guardarZonasVacias).toHaveBeenCalled();
      expect(page.actualizarEstadoTareasEnElBackend).toHaveBeenCalled();
    });

    it('eliminarTarea guarda zonas si quedan figuras en el mapa', async () => {
      crearDiv('eliminarTareasModal');
      await page.eliminarTarea('2');
      expect(mockZonas.guardarZonas).toHaveBeenCalled();
    });

    it('eliminarTarea no hace nada si la tarea no existe', async () => {
      await page.eliminarTarea('nope');
      expect(page.taskTableData.length).toBe(2);
      expect(page.actualizarEstadoTareasEnElBackend).not.toHaveBeenCalled();
    });

    it('eliminarTareasPorZona elimina solo las de la zona', () => {
      page.eliminarTareasPorZona('Z1');
      expect(page.taskTableData.length).toBe(1);
      expect(page.taskTableData[0].zona).toBe('Z2');
      expect(page.hayTareas).toBeTrue();
      page.eliminarTareasPorZona('Z2');
      expect(page.hayTareas).toBeFalse();
    });

    it('eliminarTodasLasTareas vacía la tabla', () => {
      page.eliminarTodasLasTareas();
      expect(page.taskTableData).toEqual([]);
      expect(page.hayTareas).toBeFalse();
      expect(EstudioData.getTareasEstudioData()).toEqual([]);
    });

    it('existeTareaEnZona detecta la zona', () => {
      expect(page.existeTareaEnZona('Z1')).toBeTrue();
      expect(page.existeTareaEnZona('ZX')).toBeFalse();
    });

    it('verTarea abre el modal en modo vista', () => {
      const showSpy = spyOn(page, 'showModal');
      page.verTarea('1');
      expect(mockModalTareas.setViewMode).toHaveBeenCalledWith(page.taskTableData[0]);
      expect(showSpy).toHaveBeenCalled();
      page.verTarea('nope');
      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it('editarTarea abre el modal en modo edición', () => {
      const showSpy = spyOn(page, 'showModal');
      page.editarTarea('2');
      expect(mockModalTareas.setEditMode).toHaveBeenCalledWith(page.taskTableData[1]);
      expect(showSpy).toHaveBeenCalled();
      page.editarTarea('nope');
      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    it('openModeCreateTask y openModeCreateTaskLink abren el modal en modo creación', () => {
      const showSpy = spyOn(page, 'showModal');
      page.openModeCreateTask();
      expect(mockModalTareas.setCreateMode).toHaveBeenCalled();
      page.openModeCreateTaskLink();
      expect(mockModalTareas.setCreateModeLink).toHaveBeenCalled();
      expect(showSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('crearOrActualizarTarea', () => {
    beforeEach(() => {
      spyOn(page, 'actualizarEstadoTareasEnElBackend').and.returnValue(Promise.resolve());
      EstudioData.setNuevoEstudioFormData({ tieneMomentos: true, momentos: ['M1', 'M2'] });
    });

    it('crea una nueva tarea con momentos', async () => {
      await page.crearOrActualizarTarea({
        taskName: 'Nueva',
        trabajador: ['ana', '', 'luis'],
        zona: 'Z1',
        notas: 'nota',
        fecha: '2024-05-01',
        tipoTarea: 'medicion_arboles',
        tieneMomentos: true,
        momentos: ['M1']
      });
      expect(page.taskTableData.length).toBe(1);
      const creada: any = page.taskTableData[0];
      expect(creada.nombreTarea).toBe('Nueva');
      expect(creada.trabajador).toBe('ana, luis');
      expect(creada.tieneMomentos).toBeTrue();
      expect(creada.momentos.M1.status).toBe('pending');
      expect(creada.momentosInfo).toBe('M1');
      expect(page.hayTareas).toBeTrue();
      expect(mockZonas.guardarZonas).toHaveBeenCalled();
    });

    it('crea una tarea sin momentos', async () => {
      await page.crearOrActualizarTarea({
        taskName: 'Simple',
        trabajador: ['ana'],
        zona: 'Z1',
        tipoTarea: 'medicion_sotobosque'
      });
      const creada: any = page.taskTableData[0];
      expect(creada.tieneMomentos).toBeUndefined();
      expect(creada.notas).toBe('');
      expect(creada.fecha).toBe('');
    });

    it('edita una tarea existente preservando los momentos previos', async () => {
      const existente = tarea('1', {
        tieneMomentos: true,
        momentos: { M1: { status: 'done', assignedTo: 'viejo', archivosSubidos: [{ nombre: 'a.json' }], fecha: '' } }
      });
      page.taskTableData = [existente];
      mockModalTareas.mode = ModalMode.Edit;
      mockModalTareas.currentTask = existente;

      await page.crearOrActualizarTarea({
        taskName: 'Editada',
        trabajador: ['ana'],
        zona: 'Z2',
        tipoTarea: 'medicion_arboles',
        tieneMomentos: true,
        momentos: ['M1', 'M2']
      });

      const editada: any = page.taskTableData[0];
      expect(editada.nombreTarea).toBe('Editada');
      expect(editada.momentos.M1.status).toBe('done');
      expect(editada.momentos.M1.assignedTo).toBe('ana');
      expect(editada.momentos.M1.archivosSubidos.length).toBe(1);
      expect(editada.momentos.M2.status).toBe('pending');
      expect(editada.momentosInfo).toBe('Todos');
    });
  });

  describe('modales', () => {
    it('showModal y closeModal funcionan con el modal presente', () => {
      crearDiv('confirmModal');
      expect(() => page.showModal()).not.toThrow();
      expect(() => page.closeModal()).not.toThrow();
    });

    it('showModalEliminarTareas guarda el id y closeModalEliminarTareas cierra', () => {
      crearDiv('eliminarTareasModal');
      page.showModalEliminarTareas('t9');
      expect(page.idTareaEliminar).toBe('t9');
      expect(() => page.closeModalEliminarTareas()).not.toThrow();
    });
  });

  describe('actualizarEstadoTareasEnElBackend', () => {
    it('envía las tareas y actualiza el estado local', async () => {
      EstudioData.setNuevoEstudioFormData({ idFormulario: 'f1' });
      const estudioLocal: any = { id: 'e1', data: { NuevoEstudioFormData: { idFormulario: 'f1' } } };
      (EstudiosPage.Instance as any).estudios = [estudioLocal];
      const tareas = [tarea('1')];
      await page.actualizarEstadoTareasEnElBackend(tareas);
      expect(mockBack.crearEstudioPorPartesTareas).toHaveBeenCalledWith('a@a.com', tareas, jasmine.any(String), 'f1');
      expect(estudioLocal.data.TareasData).toBe(tareas);
    });

    it('avisa si el estudio local no existe', async () => {
      EstudioData.setNuevoEstudioFormData({ idFormulario: 'f1' });
      (EstudiosPage.Instance as any).estudios = [];
      await page.actualizarEstadoTareasEnElBackend([tarea('1')]);
      expect(mockBack.crearEstudioPorPartesTareas).toHaveBeenCalled();
    });

    it('gestiona la falta de email', async () => {
      mockAfAuth.currentUser = Promise.resolve(null);
      EstudioData.setNuevoEstudioFormData({ idFormulario: 'f1' });
      await page.actualizarEstadoTareasEnElBackend([]);
      expect(mockBack.crearEstudioPorPartesTareas).not.toHaveBeenCalled();
    });

    it('gestiona la falta de idFormulario', async () => {
      EstudioData.setNuevoEstudioFormData({});
      await page.actualizarEstadoTareasEnElBackend([]);
      expect(mockBack.crearEstudioPorPartesTareas).not.toHaveBeenCalled();
    });
  });
});
