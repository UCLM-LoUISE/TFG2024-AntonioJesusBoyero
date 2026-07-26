import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { of } from 'rxjs';
import { NoAuthGuard } from './no-auth.guard';

describe('NoAuthGuard', () => {
  let guard: NoAuthGuard;
  const fakeUrlTree = { toString: () => '/estudios' } as UrlTree;

  const mockAngularFireAuth: any = {
    authState: of(null),
  };

  const mockRouter = {
    createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(fakeUrlTree),
  };

  beforeEach(() => {
    mockRouter.createUrlTree.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        NoAuthGuard,
        { provide: AngularFireAuth, useValue: mockAngularFireAuth },
        { provide: Router, useValue: mockRouter },
      ],
    });
    guard = TestBed.inject(NoAuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access to home when there is no authenticated user', (done) => {
    mockAngularFireAuth.authState = of(null);

    guard.canActivate().subscribe((result) => {
      expect(result).toBeTrue();
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
      done();
    });
  });

  it('should redirect to /estudios when a user is authenticated', (done) => {
    mockAngularFireAuth.authState = of({ uid: 'abc', email: 'a@a.com' });

    guard.canActivate().subscribe((result) => {
      expect(result).toBe(fakeUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/estudios']);
      done();
    });
  });

  it('should take only the first emission of authState', (done) => {
    // authState emite dos veces; take(1) debe quedarse con la primera (null -> true)
    mockAngularFireAuth.authState = of(null, { uid: 'abc' });

    const results: any[] = [];
    guard.canActivate().subscribe({
      next: (r) => results.push(r),
      complete: () => {
        expect(results.length).toBe(1);
        expect(results[0]).toBeTrue();
        done();
      },
    });
  });
});
