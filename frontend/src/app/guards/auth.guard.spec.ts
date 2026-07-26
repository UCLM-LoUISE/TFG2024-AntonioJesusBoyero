import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './auth.guard';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  // El guard lee afAuth.authState en cada llamada, así que podemos reasignarla por test
  const mockAngularFireAuth: any = {
    authState: of(null),
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate'),
  };

  beforeEach(() => {
    mockRouter.navigate.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AngularFireAuth, useValue: mockAngularFireAuth },
        { provide: Router, useValue: mockRouter },
      ],
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow activation when a user is authenticated', (done) => {
    mockAngularFireAuth.authState = of({ uid: '12345', email: 'a@a.com' });

    guard.canActivate(null as any, null as any).subscribe((canActivate) => {
      expect(canActivate).toBeTrue();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      done();
    });
  });

  it('should block activation and redirect to /home when there is no user', (done) => {
    mockAngularFireAuth.authState = of(null);

    guard.canActivate(null as any, null as any).subscribe((canActivate) => {
      expect(canActivate).toBeFalse();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
      done();
    });
  });
});
