import { ModalConfirmarBorradoEstudioComponent } from './modal-confirmar-borrado-estudio.component';

describe('ModalConfirmarBorradoEstudioComponent', () => {
  let component: ModalConfirmarBorradoEstudioComponent;

  beforeEach(() => {
    component = new ModalConfirmarBorradoEstudioComponent();
  });

  it('should create with default values', () => {
    expect(component).toBeTruthy();
    expect(component.title).toBe('Confirmar');
    expect(component.message).toBe('¿Estás seguro de que deseas continuar?');
    expect(component.confirmButtonText).toBe('Aceptar');
    expect(component.cancelButtonText).toBe('Cancelar');
    expect(component.showCancelButton).toBeTrue();
  });

  it('should emit confirmAction with the studyId on onConfirm', () => {
    const spy = jasmine.createSpy('confirm');
    component.studyId = 'estudio-42';
    component.confirmAction.subscribe(spy);
    component.onConfirm();
    expect(spy).toHaveBeenCalledOnceWith('estudio-42');
  });

  it('should emit confirmAction with undefined when no studyId set', () => {
    const spy = jasmine.createSpy('confirm');
    component.confirmAction.subscribe(spy);
    component.onConfirm();
    expect(spy).toHaveBeenCalledOnceWith(undefined);
  });

  it('should emit cancelAction on onCancel', () => {
    const spy = jasmine.createSpy('cancel');
    component.cancelAction.subscribe(spy);
    component.onCancel();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
