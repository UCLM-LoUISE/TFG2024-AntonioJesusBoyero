import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';
import { BackService } from './back.service';
import { UserData } from '../data/user-data';

describe('AuthService', () => {
  let service: AuthService;
  let authState$: BehaviorSubject<any>;
  let mockAngularFireAuth: any;
  let mockBackService: any;
  let mockRouter: any;

  const flush = () => new Promise<void>((r) => setTimeout(r));

  const makeUser = (overrides: any = {}) => ({
    email: 'test@example.com',
    emailVerified: true,
    reload: jasmine.createSpy('reload').and.returnValue(Promise.resolve()),
    sendEmailVerification: jasmine
      .createSpy('sendEmailVerification')
      .and.returnValue(Promise.resolve()),
    getIdToken: jasmine.createSpy('getIdToken').and.returnValue(Promise.resolve('mocked-token')),
    ...overrides,
  });

  beforeEach(() => {
    // Limpiar el estado estático compartido
    UserData.setUserData(null);
    UserData.setUserEmail(undefined);
    UserData.setUserRol(undefined);

    authState$ = new BehaviorSubject<any>(null);

    mockAngularFireAuth = {
      authState: authState$,
      signInWithEmailAndPassword: jasmine
        .createSpy('signInWithEmailAndPassword')
        .and.returnValue(Promise.resolve({ user: { email: 'test@example.com' } })),
      sendPasswordResetEmail: jasmine
        .createSpy('sendPasswordResetEmail')
        .and.returnValue(Promise.resolve()),
      signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve()),
      currentUser: Promise.resolve(makeUser()),
    };

    mockBackService = {
      obtenerUsuarioPorEmail: jasmine
        .createSpy('obtenerUsuarioPorEmail')
        .and.returnValue(of({ nombre: 'Test User', email: 'test@example.com', rol: 'investigador' })),
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate'),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AngularFireAuth, useValue: mockAngularFireAuth },
        { provide: Router, useValue: mockRouter },
        { provide: BackService, useValue: mockBackService },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose isAuthenticated=false when authState emits null', async () => {
    const isLogged = await firstValueFrom(service.isLoggedIn());
    expect(isLogged).toBeFalse();
  });

  it('should restore user data and set authenticated when authState emits a user', async () => {
    authState$.next({ email: 'restored@example.com' });

    expect(UserData.getUserEmail()).toBe('restored@example.com');
    expect(mockBackService.obtenerUsuarioPorEmail).toHaveBeenCalledWith('restored@example.com');
    expect(UserData.getUserRol()).toBe('investigador');

    const isLogged = await firstValueFrom(service.isLoggedIn());
    expect(isLogged).toBeTrue();
  });

  it('should emit cached rol through userRol$ when authState emits', async () => {
    authState$.next({ email: 'restored@example.com' });
    const rol = await firstValueFrom(service.userRol$);
    expect(rol).toBe('investigador');
  });

  describe('getUserData', () => {
    it('should resolve and store user data on success', async () => {
      await service.getUserData('test@example.com');

      expect(mockBackService.obtenerUsuarioPorEmail).toHaveBeenCalledWith('test@example.com');
      expect(UserData.getUserData()).toEqual({
        nombre: 'Test User',
        email: 'test@example.com',
        rol: 'investigador',
      });
      expect(UserData.getUserRol()).toBe('investigador');
    });

    it('should reject when the backend fails', async () => {
      mockBackService.obtenerUsuarioPorEmail.and.returnValue(
        throwError(() => new Error('back error'))
      );

      await expectAsync(service.getUserData('test@example.com')).toBeRejected();
    });
  });

  describe('logout', () => {
    it('should sign out, mark unauthenticated and navigate to /home', async () => {
      service.logout();
      await flush();

      expect(mockAngularFireAuth.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
      const isLogged = await firstValueFrom(service.isLoggedIn());
      expect(isLogged).toBeFalse();
    });
  });

  it('should send a password reset email', async () => {
    await service.resetPassword('test@example.com');
    expect(mockAngularFireAuth.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com');
  });

  describe('getUserToken', () => {
    it('should return the token when there is a current user', async () => {
      const token = await service.getUserToken();
      expect(token).toBe('mocked-token');
    });

    it('should return null when there is no current user', async () => {
      mockAngularFireAuth.currentUser = Promise.resolve(null);
      const token = await service.getUserToken();
      expect(token).toBeNull();
    });
  });

  describe('login', () => {
    it('should log in a verified investigador and navigate to /estudios', async () => {
      await service.login('test@example.com', 'password');

      expect(mockAngularFireAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password'
      );
      expect(mockBackService.obtenerUsuarioPorEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
    });

    it('should navigate to /admin when rol is administrador', async () => {
      mockBackService.obtenerUsuarioPorEmail.and.returnValue(
        of({ nombre: 'Admin', email: 'admin@example.com', rol: 'administrador' })
      );

      await service.login('admin@example.com', 'password');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should throw email_not_verified, send verification and sign out for unverified users', async () => {
      const unverified = makeUser({ emailVerified: false });
      mockAngularFireAuth.currentUser = Promise.resolve(unverified);

      await expectAsync(service.login('test@example.com', 'password')).toBeRejectedWith(
        jasmine.objectContaining({ code: 'email_not_verified' })
      );

      expect(unverified.sendEmailVerification).toHaveBeenCalled();
      expect(mockAngularFireAuth.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalledWith(['/estudios']);
    });

    it('should still throw email_not_verified if sendEmailVerification fails', async () => {
      const unverified = makeUser({
        emailVerified: false,
        sendEmailVerification: jasmine
          .createSpy('sendEmailVerification')
          .and.returnValue(Promise.reject(new Error('smtp down'))),
      });
      mockAngularFireAuth.currentUser = Promise.resolve(unverified);

      await expectAsync(service.login('test@example.com', 'password')).toBeRejectedWith(
        jasmine.objectContaining({ code: 'email_not_verified' })
      );
    });

    it('should throw auth/no-user when there is no current user after sign in', async () => {
      mockAngularFireAuth.currentUser = Promise.resolve(null);

      await expectAsync(service.login('test@example.com', 'password')).toBeRejectedWithError(
        'auth/no-user'
      );
    });

    it('should rethrow errors from signInWithEmailAndPassword', async () => {
      mockAngularFireAuth.signInWithEmailAndPassword.and.returnValue(
        Promise.reject(new Error('auth/wrong-password'))
      );

      await expectAsync(service.login('test@example.com', 'bad')).toBeRejectedWithError(
        'auth/wrong-password'
      );
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
