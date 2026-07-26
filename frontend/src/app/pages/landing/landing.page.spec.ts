import { fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { LandingPage } from './landing.page';

describe('LandingPage', () => {
  let page: LandingPage;
  let mockAuth: any;
  let mockInactivity: any;
  let canvas: HTMLCanvasElement | null = null;

  beforeEach(() => {
    mockAuth = jasmine.createSpyObj('AuthService', ['login']);
    mockInactivity = jasmine.createSpyObj('InactivityService', ['startMonitoring']);
    page = new LandingPage(new FormBuilder(), mockAuth, mockInactivity);
    page.ngOnInit();
  });

  afterEach(() => {
    if (canvas) {
      canvas.remove();
      canvas = null;
    }
  });

  it('se crea e inicializa el formulario de login', () => {
    expect(page).toBeTruthy();
    expect(page.loginForm.get('email')).toBeTruthy();
    expect(page.loginForm.get('password')).toBeTruthy();
    expect(page.loginForm.valid).toBeFalse();
  });

  it('el formulario valida email y password', () => {
    page.loginForm.setValue({ email: 'malformado', password: '123' });
    expect(page.loginForm.valid).toBeFalse();
    page.loginForm.setValue({ email: 'a@a.com', password: '123456' });
    expect(page.loginForm.valid).toBeTrue();
  });

  it('ngAfterViewInit inicializa Granim sobre el canvas', () => {
    canvas = document.createElement('canvas');
    canvas.id = 'canvas-granim';
    document.body.appendChild(canvas);
    expect(() => page.ngAfterViewInit()).not.toThrow();
  });

  it('onSubmit con formulario inválido no llama al login', () => {
    page.loginForm.setValue({ email: '', password: '' });
    page.onSubmit();
    expect(mockAuth.login).not.toHaveBeenCalled();
    expect(page.cargando).toBeFalse();
  });

  it('onSubmit con login correcto inicia la monitorización de inactividad', fakeAsync(() => {
    mockAuth.login.and.returnValue(Promise.resolve());
    page.loginForm.setValue({ email: 'a@a.com', password: '123456' });
    page.onSubmit();
    expect(page.cargando).toBeTrue();
    flushMicrotasks();
    expect(mockAuth.login).toHaveBeenCalledWith('a@a.com', '123456');
    expect(page.errorLogin).toBeFalse();
    expect(mockInactivity.startMonitoring).toHaveBeenCalled();
    expect(page.cargando).toBeFalse();
  }));

  it('onSubmit con login fallido marca errorLogin', fakeAsync(() => {
    mockAuth.login.and.returnValue(Promise.reject(new Error('credenciales')));
    page.loginForm.setValue({ email: 'a@a.com', password: 'mala' });
    page.onSubmit();
    flushMicrotasks();
    expect(page.errorLogin).toBeTrue();
    expect(mockInactivity.startMonitoring).not.toHaveBeenCalled();
    expect(page.cargando).toBeFalse();
  }));

  it('onLoginClick mueve el logo y muestra el formulario tras las animaciones', fakeAsync(() => {
    page.onLoginClick();
    expect(page.moverLogo).toBeTrue();
    expect(page.mostrarBotones).toBeTrue();
    tick(600);
    expect(page.mostrarBotones).toBeFalse();
    tick(200);
    expect(page.mostrarFormulario).toBeTrue();
  }));

  it('onResetPasswordClick oculta el formulario y muestra el reset', fakeAsync(() => {
    page.mostrarFormulario = true;
    page.onResetPasswordClick();
    expect(page.moverLogo).toBeTrue();
    expect(page.formularioOcultando).toBeFalse();
    tick(600);
    expect(page.mostrarBotones).toBeFalse();
    expect(page.mostrarFormulario).toBeFalse();
    tick(200);
    expect(page.resetPassword).toBeTrue();
  }));

  it('mostrarInicio vuelve al formulario de login', fakeAsync(() => {
    page.resetPassword = true;
    page.errorLogin = true;
    page.mostrarInicio();
    expect(page.errorLogin).toBeFalse();
    expect(page.resetOcultando).toBeTrue();
    tick(400);
    expect(page.resetPassword).toBeFalse();
    expect(page.mostrarFormulario).toBeTrue();
    expect(page.resetOcultando).toBeFalse();
  }));
});
