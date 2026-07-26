import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;

  beforeEach(() => {
    component = new ModalComponent();
  });

  it('should create with default values', () => {
    expect(component).toBeTruthy();
    expect(component.title).toBe('Confirmar');
    expect(component.message).toBe('¿Estás seguro de que deseas continuar?');
    expect(component.confirmButtonText).toBe('Aceptar');
    expect(component.cancelButtonText).toBe('Cancelar');
    expect(component.showCancelButton).toBeTrue();
    expect(component.confirmButtonClass).toBe('btn-danger');
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

  it('should accept custom input values', () => {
    component.title = 'Borrar';
    component.message = 'Mensaje personalizado';
    component.showCancelButton = false;
    component.confirmButtonClass = 'btn-primary';
    expect(component.title).toBe('Borrar');
    expect(component.message).toBe('Mensaje personalizado');
    expect(component.showCancelButton).toBeFalse();
    expect(component.confirmButtonClass).toBe('btn-primary');
  });
});
