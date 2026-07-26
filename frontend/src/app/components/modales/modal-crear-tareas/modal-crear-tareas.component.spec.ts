import { FormBuilder } from '@angular/forms';
import { ModalCrearTareasComponent } from './modal-crear-tareas.component';
import { ModalMode } from 'src/app/enums/modalMode';
import { GestionTareasPage } from 'src/app/pages/gestion-tareas/gestion-tareas.page';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';
import { EstudioData } from 'src/app/data/estudios-data';
import { UserData } from 'src/app/data/user-data';

describe('ModalCrearTareasComponent', () => {
  let component: ModalCrearTareasComponent;
  let mockBack: any;
  let mockGestion: any;
  let mockZonas: any;
  let originalGestion: any;
  let originalZonas: any;
  let originalStatic: any;

  const usuariosBack = [
    { nombre: 'Ana', apellidos: 'García', email: 'ana@x.com' },
    { nombre: 'Luis', apellidos: 'Pérez', email: 'luis@x.com' }
  ];

  const settle = () => new Promise(resolve => setTimeout(resolve, 0));

  function rellenarFormularioValido() {
    component.tareaForm.patchValue({
      taskName: 'Tarea nueva',
      zona: 'Zona A',
      fecha: '2026-07-19',
      tipoTarea: 'medicion_arboles',
      notas: ''
    });
    component.trabajadorArray.push(new FormBuilder().control('ana@x.com'));
  }

  beforeEach(async () => {
    originalGestion = GestionTareasPage.Instance;
    originalZonas = ZonasEstudioMuestreosPage.instance;
    originalStatic = ModalCrearTareasComponent.Instance;

    UserData.setUserEmail('ana@x.com');
    EstudioData.setNuevoEstudioFormData({});

    mockGestion = {
      taskTableData: [{ id: 't1', nombreTarea: 'Tarea existente' }],
      crearOrActualizarTarea: jasmine.createSpy('crearOrActualizarTarea'),
      openModeCreateTask: jasmine.createSpy('openModeCreateTask')
    };
    mockZonas = {
      nombreFigura: 'Zona Nueva',
      resumenFiguras: [
        { tipo: 'Point', nombre: 'Zona A' },
        { tipo: 'Polygon', nombre: 'Poligono 1' },
        { tipo: 'marker', nombre: 'M1', hijos: [{ tipo: 'Punto', nombre: 'Hijo 1' }] }
      ]
    };
    GestionTareasPage.Instance = mockGestion;
    ZonasEstudioMuestreosPage.instance = mockZonas;

    mockBack = {
      obtenerUsuariosMismoGrupo: jasmine.createSpy('obtenerUsuariosMismoGrupo')
        .and.returnValue(Promise.resolve(usuariosBack))
    };

    component = new ModalCrearTareasComponent(new FormBuilder(), mockBack);
    component.ngOnInit();
    await settle();
  });

  afterEach(() => {
    GestionTareasPage.Instance = originalGestion;
    ZonasEstudioMuestreosPage.instance = originalZonas;
    ModalCrearTareasComponent.Instance = originalStatic;
    EstudioData.reset();
  });

  it('should create, register the singleton and load workers on init', () => {
    expect(component).toBeTruthy();
    expect(ModalCrearTareasComponent.Instance).toBe(component);
    expect(component.tareaForm).toBeDefined();
    expect(component.todosLosTrabajadores.length).toBe(2);
    expect(component.trabajadoresDisponibles.length).toBe(2);
    expect(component.todosLosTrabajadores[0]).toEqual({ nombreCompleto: 'Ana García', email: 'ana@x.com' });
  });

  it('obtenerUsuarios should log an error when the backend rejects', async () => {
    const errorSpy = spyOn(console, 'error');
    mockBack.obtenerUsuariosMismoGrupo.and.returnValue(Promise.reject('boom'));
    component.obtenerUsuarios();
    await settle();
    expect(errorSpy).toHaveBeenCalled();
  });

  describe('cargarMomentos', () => {
    it('should load momentos from the study data without auto-selecting when several', () => {
      EstudioData.setNuevoEstudioFormData({ tieneMomentos: true, momentos: ['Antes', 'Después'] });
      component.cargarMomentos();
      expect(component.tieneMomentos).toBeTrue();
      expect(component.momentosDisponibles).toEqual(['Antes', 'Después']);
      expect(component.incluyeTodosMomentos).toBeFalse();
      expect(component.momentosSeleccionados).toEqual([]);
    });

    it('should auto-select the only momento available', () => {
      EstudioData.setNuevoEstudioFormData({ tieneMomentos: true, momentos: ['Único'] });
      component.cargarMomentos();
      expect(component.incluyeTodosMomentos).toBeTrue();
      expect(component.momentosSeleccionados).toEqual(['Único']);
    });

    it('should reset everything when the study has no momentos', () => {
      EstudioData.setNuevoEstudioFormData({});
      component.momentosSeleccionados = ['x'];
      component.cargarMomentos();
      expect(component.tieneMomentos).toBeFalse();
      expect(component.momentosDisponibles).toEqual([]);
      expect(component.momentosSeleccionados).toEqual([]);
    });
  });

  describe('form modes', () => {
    const task = {
      id: 't1',
      nombreTarea: 'Tarea existente',
      trabajador: 'ana@x.com, luis@x.com',
      zona: 'Zona A',
      notas: 'nota',
      fecha: '2026-01-01',
      tipoTarea: 'medicion_arboles'
    };

    it('setViewMode should populate and disable the form', () => {
      component.setViewMode(task);
      expect(component.mode).toBe(ModalMode.View);
      expect(component.currentTask).toBe(task);
      expect(component.tareaForm.controls['taskName'].disabled).toBeTrue();
      expect(component.tareaForm.controls['zona'].disabled).toBeTrue();
      expect(component.tareaForm.getRawValue().taskName).toBe('Tarea existente');
      expect(component.trabajadoresSeleccionados.map(t => t.email)).toEqual(['ana@x.com', 'luis@x.com']);
    });

    it('setEditMode should populate, enable the form and build the point areas', () => {
      component.setEditMode(task);
      expect(component.mode).toBe(ModalMode.Edit);
      expect(component.tareaForm.controls['taskName'].enabled).toBeTrue();
      expect(component.areas.map(a => a.value)).toEqual(['Zona A', 'M1', 'Hijo 1']);
      expect(component.formularioInvalido).toBeFalse();
    });

    it('setCreateMode should reset the form and precharge the new zone name', () => {
      component.setCreateMode();
      expect(component.mode).toBe(ModalMode.Create);
      expect(component.currentTask).toBeNull();
      expect(component.tareaForm.value.taskName).toBe('Zona Nueva');
      expect(component.tareaForm.value.zona).toBe('Zona Nueva');
      expect(component.areas.map(a => a.value)).toEqual(['Zona A', 'M1', 'Hijo 1', 'Zona Nueva']);
      expect(component.trabajadoresSeleccionados).toEqual([]);
    });

    it('setCreateMode should not duplicate the zone when it is already a point area', () => {
      mockZonas.nombreFigura = 'Zona A';
      component.setCreateMode();
      expect(component.areas.filter(a => a.value === 'Zona A').length).toBe(1);
    });

    it('setCreateModeLink should reset the form leaving zone empty', () => {
      component.setCreateModeLink();
      expect(component.mode).toBe(ModalMode.Create);
      expect(component.tareaForm.value.taskName).toBe('');
      expect(component.tareaForm.value.zona).toBe('');
      expect(component.areas.map(a => a.value)).toEqual(['Zona A', 'M1', 'Hijo 1']);
    });
  });

  describe('populateForm momentos', () => {
    it('should load momentos from an array format', () => {
      EstudioData.setNuevoEstudioFormData({ tieneMomentos: true, momentos: ['Antes', 'Después'] });
      component.cargarMomentos();
      component.populateForm({
        nombreTarea: 'T', trabajador: 'ana@x.com', zona: 'Z', notas: '', fecha: '',
        tipoTarea: '', tieneMomentos: true, momentos: ['Antes', 'Después']
      });
      expect(component.momentosSeleccionados).toEqual(['Antes', 'Después']);
      expect(component.incluyeTodosMomentos).toBeTrue();
    });

    it('should load momentos from an object format', () => {
      EstudioData.setNuevoEstudioFormData({ tieneMomentos: true, momentos: ['Antes', 'Después'] });
      component.cargarMomentos();
      component.populateForm({
        nombreTarea: 'T', trabajador: 'ana@x.com', zona: 'Z', notas: '', fecha: '',
        tipoTarea: '', tieneMomentos: true, momentos: { Antes: { archivosSubidos: [] } }
      });
      expect(component.momentosSeleccionados).toEqual(['Antes']);
      expect(component.incluyeTodosMomentos).toBeFalse();
    });

    it('should clear momentos when the task has none', () => {
      component.momentosSeleccionados = ['Antes'];
      component.incluyeTodosMomentos = true;
      component.populateForm({
        nombreTarea: 'T', trabajador: 'ana@x.com', zona: 'Z', notas: '', fecha: '', tipoTarea: ''
      });
      expect(component.momentosSeleccionados).toEqual([]);
      expect(component.incluyeTodosMomentos).toBeFalse();
    });
  });

  describe('trabajadores', () => {
    it('addTrabajador should add a selected worker and clear the select', () => {
      const select = { value: 'luis@x.com' };
      component.addTrabajador({ target: select } as any);
      expect(component.trabajadoresSeleccionados.map(t => t.email)).toEqual(['luis@x.com']);
      expect(component.trabajadorArray.value).toEqual(['luis@x.com']);
      expect(component.trabajadoresDisponibles.map(t => t.email)).toEqual(['ana@x.com']);
      expect(select.value).toBe('');
    });

    it('addTrabajador should ignore unknown or duplicated workers', () => {
      component.addTrabajador({ target: { value: 'nadie@x.com' } } as any);
      expect(component.trabajadoresSeleccionados.length).toBe(0);

      component.addTrabajador({ target: { value: 'ana@x.com' } } as any);
      component.trabajadoresDisponibles.push({ nombreCompleto: 'Ana García', email: 'ana@x.com' });
      component.addTrabajador({ target: { value: 'ana@x.com' } } as any);
      expect(component.trabajadoresSeleccionados.length).toBe(1);
    });

    it('removeTrabajador should remove the worker and return it to available', () => {
      component.addTrabajador({ target: { value: 'ana@x.com' } } as any);
      component.removeTrabajador('ana@x.com');
      expect(component.trabajadoresSeleccionados.length).toBe(0);
      expect(component.trabajadorArray.length).toBe(0);
      expect(component.trabajadoresDisponibles.some(t => t.email === 'ana@x.com')).toBeTrue();
    });

    it('removeTrabajador should ignore emails not present in the array', () => {
      expect(() => component.removeTrabajador('nadie@x.com')).not.toThrow();
    });
  });

  it('minSelected validator should require a minimum number of controls', () => {
    const fb = new FormBuilder();
    const validator = component.minSelected(1);
    const emptyArray: any = fb.array([]);
    const filledArray: any = fb.array([fb.control('a')]);
    expect(validator(emptyArray)).toEqual({ minSelected: true });
    expect(validator(filledArray)).toBeNull();
  });

  describe('onConfirm', () => {
    it('should create the task, emit and reset when the form is valid', () => {
      const emitSpy = jasmine.createSpy('confirmAction');
      component.confirmAction.subscribe(emitSpy);
      rellenarFormularioValido();

      component.onConfirm();

      expect(mockGestion.crearOrActualizarTarea).toHaveBeenCalledTimes(1);
      const tareaData = mockGestion.crearOrActualizarTarea.calls.mostRecent().args[0];
      expect(tareaData.taskName).toBe('Tarea nueva');
      expect(tareaData.tieneMomentos).toBeFalse();
      expect(tareaData.momentos).toEqual([]);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(component.formularioInvalido).toBeFalse();
      expect(component.trabajadoresSeleccionados).toEqual([]);
    });

    it('should reject a duplicated task name (case-insensitive)', () => {
      rellenarFormularioValido();
      component.tareaForm.patchValue({ taskName: '  TAREA EXISTENTE ' });

      component.onConfirm();

      expect(component.errorNombreDuplicado).toBeTrue();
      expect(component.formularioInvalido).toBeTrue();
      expect(mockGestion.crearOrActualizarTarea).not.toHaveBeenCalled();
    });

    it('should allow keeping the same name when editing the same task', () => {
      component.mode = ModalMode.Edit;
      component.currentTask = { id: 't1' };
      rellenarFormularioValido();
      component.tareaForm.patchValue({ taskName: 'Tarea existente' });

      component.onConfirm();

      expect(component.errorNombreDuplicado).toBeFalse();
      expect(mockGestion.crearOrActualizarTarea).toHaveBeenCalledTimes(1);
    });

    it('should require at least one momento when the study has momentos', () => {
      rellenarFormularioValido();
      component.tieneMomentos = true;
      component.momentosSeleccionados = [];

      component.onConfirm();

      expect(component.formularioInvalido).toBeTrue();
      expect(mockGestion.crearOrActualizarTarea).not.toHaveBeenCalled();
    });

    it('should include the selected momentos in the created task', () => {
      rellenarFormularioValido();
      component.tieneMomentos = true;
      component.momentosSeleccionados = ['Antes'];

      component.onConfirm();

      const tareaData = mockGestion.crearOrActualizarTarea.calls.mostRecent().args[0];
      expect(tareaData.tieneMomentos).toBeTrue();
      expect(tareaData.momentos).toEqual(['Antes']);
    });

    it('should flag the form when it is invalid', () => {
      component.onConfirm();
      expect(component.formularioInvalido).toBeTrue();
      expect(mockGestion.crearOrActualizarTarea).not.toHaveBeenCalled();
    });
  });

  describe('momento selection helpers', () => {
    beforeEach(() => {
      component.momentosDisponibles = ['Antes', 'Después'];
    });

    it('onTodosMomentosChange should select or clear all momentos', () => {
      component.incluyeTodosMomentos = true;
      component.onTodosMomentosChange();
      expect(component.momentosSeleccionados).toEqual(['Antes', 'Después']);

      component.incluyeTodosMomentos = false;
      component.onTodosMomentosChange();
      expect(component.momentosSeleccionados).toEqual([]);
    });

    it('onMomentoToggle should toggle a momento and sync the "todos" checkbox', () => {
      component.onMomentoToggle('Antes');
      expect(component.momentosSeleccionados).toEqual(['Antes']);
      expect(component.incluyeTodosMomentos).toBeFalse();

      component.onMomentoToggle('Después');
      expect(component.incluyeTodosMomentos).toBeTrue();

      component.onMomentoToggle('Antes');
      expect(component.momentosSeleccionados).toEqual(['Después']);
      expect(component.incluyeTodosMomentos).toBeFalse();
    });

    it('isMomentoSeleccionado should reflect the selection', () => {
      component.momentosSeleccionados = ['Antes'];
      expect(component.isMomentoSeleccionado('Antes')).toBeTrue();
      expect(component.isMomentoSeleccionado('Después')).toBeFalse();
    });
  });

  it('agregarFiguraSiEsPunto should add point-like figures once, recursing into children', () => {
    component.areas = [];
    component.agregarFiguraSiEsPunto({
      tipo: 'Punto', nombre: 'P1',
      hijos: [{ tipo: 'Point', nombre: 'P2' }, { tipo: 'Polygon', nombre: 'NoPunto' }]
    });
    component.agregarFiguraSiEsPunto({ tipo: 'marker', nombre: 'P1' }); // duplicated
    expect(component.areas.map(a => a.value)).toEqual(['P1', 'P2']);
  });

  it('disableForm and enableForm should toggle all the controls', () => {
    component.disableForm();
    expect(component.tareaForm.controls['taskName'].disabled).toBeTrue();
    expect(component.tareaForm.controls['tipoTarea'].disabled).toBeTrue();
    component.enableForm();
    expect(component.tareaForm.controls['taskName'].enabled).toBeTrue();
    expect(component.tareaForm.controls['tipoTarea'].enabled).toBeTrue();
  });
});
