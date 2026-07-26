import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { InactivityService } from './inactivity.service';
import { AuthService } from './auth.service';
import { InactivityModalComponent } from '../components/modales/inactivity-modal/inactivity-modal.component';

describe('InactivityService', () => {
  const INACTIVITY_LIMIT = 12000 * 1000;

  let service: InactivityService;
  let isAuthenticated$: Subject<boolean>;
  let mockAuthService: any;
  let mockModal: any;
  let originalModalInstance: any;

  beforeEach(() => {
    jasmine.clock().install();

    isAuthenticated$ = new Subject<boolean>();
    mockAuthService = {
      isAuthenticated$,
      logout: jasmine.createSpy('logout'),
    };

    originalModalInstance = InactivityModalComponent.Instance;
    mockModal = { show: jasmine.createSpy('show') };
    InactivityModalComponent.Instance = mockModal as any;

    TestBed.configureTestingModule({
      providers: [
        InactivityService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(InactivityService);
  });

  afterEach(() => {
    service.cleanup();
    jasmine.clock().uninstall();
    InactivityModalComponent.Instance = originalModalInstance;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start monitoring when the user becomes authenticated', () => {
    spyOn(service, 'startMonitoring').and.callThrough();
    service.initialize();
    isAuthenticated$.next(true);
    expect(service.startMonitoring).toHaveBeenCalled();
    expect((service as any).isMonitoring).toBeTrue();
  });

  it('should stop monitoring when the user is not authenticated', () => {
    spyOn(service, 'stopMonitoring').and.callThrough();
    service.initialize();
    isAuthenticated$.next(true);
    isAuthenticated$.next(false);
    expect(service.stopMonitoring).toHaveBeenCalled();
    expect((service as any).isMonitoring).toBeFalse();
  });

  it('startMonitoring should be idempotent (second call is a no-op)', () => {
    spyOn(service, 'resetTimeout').and.callThrough();
    service.startMonitoring();
    service.startMonitoring();
    expect(service.resetTimeout).toHaveBeenCalledTimes(1);
  });

  it('should show the inactivity popup after the inactivity limit', () => {
    service.startMonitoring();
    jasmine.clock().tick(INACTIVITY_LIMIT - 1);
    expect(mockModal.show).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(mockModal.show).toHaveBeenCalledTimes(1);
  });

  it('resetTimeout should postpone the popup', () => {
    service.startMonitoring();
    jasmine.clock().tick(INACTIVITY_LIMIT - 1);
    service.resetTimeout(); // actividad del usuario justo antes del límite
    jasmine.clock().tick(INACTIVITY_LIMIT - 1);
    expect(mockModal.show).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(mockModal.show).toHaveBeenCalledTimes(1);
  });

  it('resetTimeout should do nothing when monitoring is stopped', () => {
    service.resetTimeout();
    jasmine.clock().tick(INACTIVITY_LIMIT + 1);
    expect(mockModal.show).not.toHaveBeenCalled();
  });

  it('stopMonitoring should cancel the pending timer', () => {
    service.startMonitoring();
    service.stopMonitoring();
    jasmine.clock().tick(INACTIVITY_LIMIT + 1);
    expect(mockModal.show).not.toHaveBeenCalled();
  });

  it('stopMonitoring should be a no-op when not monitoring', () => {
    expect(() => service.stopMonitoring()).not.toThrow();
    expect((service as any).isMonitoring).toBeFalse();
  });

  it('cleanup should stop monitoring and unsubscribe from auth changes', () => {
    service.initialize();
    isAuthenticated$.next(true);

    service.cleanup();
    expect((service as any).isMonitoring).toBeFalse();

    // Tras cleanup, nuevos cambios de autenticación no reinician el monitoreo
    spyOn(service, 'startMonitoring');
    isAuthenticated$.next(true);
    expect(service.startMonitoring).not.toHaveBeenCalled();
  });

  it('logoutDueToInactivity should log out and stop monitoring', () => {
    service.initialize();
    isAuthenticated$.next(true);

    service.logoutDueToInactivity();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect((service as any).isMonitoring).toBeFalse();
    jasmine.clock().tick(INACTIVITY_LIMIT + 1);
    expect(mockModal.show).not.toHaveBeenCalled();
  });
});
