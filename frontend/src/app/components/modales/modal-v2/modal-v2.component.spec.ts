import { ModalV2Component } from './modal-v2.component';
import { TipoModal } from 'src/app/enums/tipoModal-enum';
import { GestionTareasPage } from 'src/app/pages/gestion-tareas/gestion-tareas.page';

describe('ModalV2Component', () => {
  let component: ModalV2Component;
  let originalInstance: any;
  let mockPage: any;

  beforeEach(() => {
    originalInstance = GestionTareasPage.Instance;
    mockPage = {
      idTareaEliminar: 'tarea-7',
      eliminarTarea: jasmine.createSpy('eliminarTarea'),
      closeModalEliminarTareas: jasmine.createSpy('closeModalEliminarTareas')
    };
    GestionTareasPage.Instance = mockPage;
    component = new ModalV2Component();
  });

  afterEach(() => {
    GestionTareasPage.Instance = originalInstance;
  });

  it('should create with default values and read idTareaEliminar from singleton', () => {
    expect(component).toBeTruthy();
    expect(component.title).toBe('Confirmar');
    expect(component.message).toBe('¿Estás seguro de que deseas continuar?');
    expect(component.confirmButtonText).toBe('Aceptar');
    expect(component.cancelButtonText).toBe('Cancelar');
    expect(component.showCancelButton).toBeTrue();
    expect(component.confirmButtonClass).toBe('btn-danger');
    expect(component.idTareaEliminar).toBe('tarea-7');
  });

  it('should expose the TipoModal enum values', () => {
    expect(component.noHayFiguras).toBe(TipoModal.noHasIntroducidoFiguras);
    expect(component.nombre).toBe(TipoModal.introducirNombre);
    expect(component.noHasGuardado).toBe(TipoModal.noHasGuardado);
    expect(component.eliminar).toBe(TipoModal.eliminarTarea);
    expect(component.ver).toBe(TipoModal.verEstudio);
    expect(component.eliminarZona).toBe(TipoModal.eliminarZona);
  });

  it('should emit confirmAction on onConfirm', () => {
    const spy = jasmine.createSpy('confirm');
    component.confirmAction.subscribe(spy);
    component.onConfirm();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should emit cancelAction on onCancel', () => {
    const spy = jasmine.createSpy('cancel');
    component.cancelAction.subscribe(spy);
    component.onCancel();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('eliminarTarea should delegate to GestionTareasPage with the current id', () => {
    component.eliminarTarea();
    expect(mockPage.eliminarTarea).toHaveBeenCalledOnceWith('tarea-7');
  });

  it('closeModalEliminarTarea should delegate to GestionTareasPage', () => {
    component.closeModalEliminarTarea();
    expect(mockPage.closeModalEliminarTareas).toHaveBeenCalledTimes(1);
  });

  it('should accept a tipoModal input', () => {
    component.tipoModal = TipoModal.verEstudio;
    expect(component.tipoModal).toBe(TipoModal.verEstudio);
  });
});
