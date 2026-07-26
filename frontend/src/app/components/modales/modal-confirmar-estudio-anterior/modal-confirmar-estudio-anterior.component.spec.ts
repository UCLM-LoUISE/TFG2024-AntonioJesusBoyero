import { ModalConfirmarEstudioAnteriorComponent } from './modal-confirmar-estudio-anterior.component';

describe('ModalConfirmarEstudioAnteriorComponent', () => {
  let component: ModalConfirmarEstudioAnteriorComponent;

  beforeEach(() => {
    component = new ModalConfirmarEstudioAnteriorComponent();
  });

  it('should create with default values', () => {
    expect(component).toBeTruthy();
    expect(component.title).toBe('Confirmar');
    expect(component.message).toBe('¿Estás seguro de que deseas continuar?');
    expect(component.confirmButtonText).toBe('Aceptar');
    expect(component.cancelButtonText).toBe('Cancelar');
    expect(component.showCancelButton).toBeTrue();
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
});
