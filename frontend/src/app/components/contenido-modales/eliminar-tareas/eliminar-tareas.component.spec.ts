import { EliminarTareasComponent } from './eliminar-tareas.component';

describe('EliminarTareasComponent', () => {
  let component: EliminarTareasComponent;

  beforeEach(() => {
    component = new EliminarTareasComponent();
    component.ngOnInit();
  });

  it('should create with default values', () => {
    expect(component).toBeTruthy();
    expect(component.title).toBe('');
    expect(component.message).toBe('');
    expect(component.showCancelButton).toBeTrue();
    expect(component.cancelButtonText).toBe('Cancelar');
    expect(component.confirmButtonText).toBe('Eliminar');
  });

  it('should emit cancel on onCancel', () => {
    const spy = jasmine.createSpy('cancel');
    component.cancel.subscribe(spy);
    component.onCancel();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should emit confirm on onConfirm', () => {
    const spy = jasmine.createSpy('confirm');
    component.confirm.subscribe(spy);
    component.onConfirm();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should accept custom inputs', () => {
    component.title = 'Eliminar tarea';
    component.message = '¿Seguro que quieres eliminar la tarea?';
    component.studyId = 'estudio-1';
    expect(component.title).toBe('Eliminar tarea');
    expect(component.message).toBe('¿Seguro que quieres eliminar la tarea?');
    expect(component.studyId).toBe('estudio-1');
  });
});
