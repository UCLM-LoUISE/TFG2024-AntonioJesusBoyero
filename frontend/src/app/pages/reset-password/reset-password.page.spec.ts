import { fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ResetPasswordPage } from './reset-password.page';

describe('ResetPasswordPage', () => {
  let page: ResetPasswordPage;
  let mockAuth: any;

  beforeEach(() => {
    mockAuth = jasmine.createSpyObj('AuthService', ['resetPassword']);
    page = new ResetPasswordPage(new FormBuilder(), mockAuth);
    page.ngOnInit();
  });

  it('se crea e inicializa el formulario', () => {
    expect(page).toBeTruthy();
    expect(page.resetPasswordForm).toBeDefined();
    expect(page.resetPasswordForm.get('email')).toBeTruthy();
  });

  it('el formulario valida el email', () => {
    expect(page.resetPasswordForm.valid).toBeFalse();
    page.resetPasswordForm.setValue({ email: 'no-es-email' });
    expect(page.resetPasswordForm.valid).toBeFalse();
    page.resetPasswordForm.setValue({ email: 'a@a.com' });
    expect(page.resetPasswordForm.valid).toBeTrue();
  });

  it('goToLogin emite el evento resetPasswordEvent', () => {
    const spy = jasmine.createSpy('emit');
    page.resetPasswordEvent.subscribe(spy);
    page.goToLogin();
    expect(spy).toHaveBeenCalledWith('goToLogin');
  });

  it('onSubmit no llama al servicio si el formulario es inválido', () => {
    page.resetPasswordForm.setValue({ email: '' });
    page.onSubmit();
    expect(mockAuth.resetPassword).not.toHaveBeenCalled();
  });

  it('onSubmit con éxito muestra mensaje ok y vuelve al login tras 10s', fakeAsync(() => {
    mockAuth.resetPassword.and.returnValue(Promise.resolve());
    const spy = jasmine.createSpy('emit');
    page.resetPasswordEvent.subscribe(spy);

    page.resetPasswordForm.setValue({ email: 'a@a.com' });
    page.onSubmit();
    expect(page.cargando).toBeTrue();

    flushMicrotasks();
    expect(mockAuth.resetPassword).toHaveBeenCalledWith('a@a.com');
    expect(page.mostrarMensajeOk).toBeTrue();
    expect(page.mostrarMensajeError).toBeFalse();
    expect(page.cargando).toBeFalse();
    expect(page.enviado).toBeTrue();

    tick(10000);
    expect(page.enviado).toBeFalse();
    expect(page.mostrarMensajeOk).toBeFalse();
    expect(spy).toHaveBeenCalledWith('goToLogin');
  }));

  it('onSubmit con error muestra mensaje de error', fakeAsync(() => {
    mockAuth.resetPassword.and.returnValue(Promise.reject(new Error('fallo')));
    page.resetPasswordForm.setValue({ email: 'a@a.com' });
    page.onSubmit();
    flushMicrotasks();
    expect(page.mostrarMensajeError).toBeTrue();
    expect(page.mostrarMensajeOk).toBeFalse();
    expect(page.cargando).toBeFalse();
  }));
});
