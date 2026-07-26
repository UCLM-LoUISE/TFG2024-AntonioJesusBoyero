import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { EditModeGuard } from './edit-mode.guard';
import { EstudiosPage } from '../pages/estudios/estudios.page';

describe('EditModeGuard', () => {
  let guard: EditModeGuard;
  const fakeUrlTree = { toString: () => '/estudios' } as UrlTree;

  const mockRouter = {
    parseUrl: jasmine.createSpy('parseUrl').and.returnValue(fakeUrlTree),
  };

  let originalInstance: any;

  beforeEach(() => {
    originalInstance = EstudiosPage.Instance;
    mockRouter.parseUrl.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        EditModeGuard,
        { provide: Router, useValue: mockRouter },
      ],
    });
    guard = TestBed.inject(EditModeGuard);
  });

  afterEach(() => {
    // Restaurar el singleton estático para no contaminar otros specs
    Object.defineProperty(EstudiosPage, 'Instance', {
      value: originalInstance,
      writable: true,
      configurable: true,
    });
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should redirect to /estudios when EstudiosPage.Instance is undefined (editMode undefined)', () => {
    EstudiosPage.Instance = undefined as any;

    const result = guard.canActivate();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/estudios');
    expect(result).toBe(fakeUrlTree);
  });

  it('should redirect to /estudios when editMode is undefined', () => {
    EstudiosPage.Instance = { editMode: undefined } as any;

    const result = guard.canActivate();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/estudios');
    expect(result).toBe(fakeUrlTree);
  });

  it('should allow navigation when editMode is true', () => {
    EstudiosPage.Instance = { editMode: true } as any;

    expect(guard.canActivate()).toBeTrue();
    expect(mockRouter.parseUrl).not.toHaveBeenCalled();
  });

  it('should allow navigation when editMode is false', () => {
    EstudiosPage.Instance = { editMode: false } as any;

    expect(guard.canActivate()).toBeTrue();
    expect(mockRouter.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect to /estudios when accessing Instance throws an error', () => {
    Object.defineProperty(EstudiosPage, 'Instance', {
      get() {
        throw new Error('boom');
      },
      configurable: true,
    });

    const result = guard.canActivate();

    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/estudios');
    expect(result).toBe(fakeUrlTree);
  });
});
