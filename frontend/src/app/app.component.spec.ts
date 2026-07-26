import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { AppComponent } from './app.component';
import { InactivityService } from './services/inactivity.service';
import { AuthService } from './services/auth.service';

describe('AppComponent', () => {
  let routerEvents$: Subject<any>;
  let userRol$: BehaviorSubject<string | null>;
  let mockRouter: any;
  let mockInactivityService: any;
  let mockAuthService: any;

  beforeEach(async () => {
    routerEvents$ = new Subject<any>();
    userRol$ = new BehaviorSubject<string | null>(null);

    mockRouter = {
      events: routerEvents$,
      url: '/estudios',
      navigate: jasmine.createSpy('navigate'),
    };

    mockInactivityService = {
      initialize: jasmine.createSpy('initialize'),
    };

    mockAuthService = {
      userRol$,
      logout: jasmine.createSpy('logout'),
    };

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: InactivityService, useValue: mockInactivityService },
        { provide: AuthService, useValue: mockAuthService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createApp() {
    const fixture = TestBed.createComponent(AppComponent);
    return fixture.componentInstance;
  }

  it('should create the app', () => {
    expect(createApp()).toBeTruthy();
  });

  it(`should have as title 'tfg'`, () => {
    expect(createApp().title).toEqual('tfg');
  });

  it('should initialize the inactivity service on ngOnInit', () => {
    const app = createApp();
    app.ngOnInit();
    expect(mockInactivityService.initialize).toHaveBeenCalled();
  });

  it('should set adminBg=true when url starts with /admin and rol is administrador', () => {
    mockRouter.url = '/admin/usuarios';
    userRol$.next('administrador');

    const app = createApp();
    app.ngOnInit();

    expect(app.adminBg).toBeTrue();
  });

  it('should keep adminBg=false when rol is not administrador even on /admin', () => {
    mockRouter.url = '/admin';
    userRol$.next('investigador');

    const app = createApp();
    app.ngOnInit();

    expect(app.adminBg).toBeFalse();
  });

  it('should keep adminBg=false outside /admin even for administrador', () => {
    mockRouter.url = '/estudios';
    userRol$.next('administrador');

    const app = createApp();
    app.ngOnInit();

    expect(app.adminBg).toBeFalse();
  });

  it('should update adminBg when a NavigationEnd event arrives', () => {
    mockRouter.url = '/estudios';
    userRol$.next('administrador');

    const app = createApp();
    app.ngOnInit();
    expect(app.adminBg).toBeFalse();

    routerEvents$.next(new NavigationEnd(1, '/admin', '/admin'));
    expect(app.adminBg).toBeTrue();

    routerEvents$.next(new NavigationEnd(2, '/estudios', '/estudios'));
    expect(app.adminBg).toBeFalse();
  });

  it('should ignore non-NavigationEnd router events', () => {
    mockRouter.url = '/estudios';
    userRol$.next('administrador');

    const app = createApp();
    app.ngOnInit();

    routerEvents$.next(new NavigationStart(1, '/admin'));
    expect(app.adminBg).toBeFalse();
  });

  it('should react to rol changes', () => {
    mockRouter.url = '/admin';
    userRol$.next(null);

    const app = createApp();
    app.ngOnInit();
    expect(app.adminBg).toBeFalse();

    userRol$.next('administrador');
    expect(app.adminBg).toBeTrue();
  });

  describe('shouldDisplayLayout', () => {
    it('should hide layout on /reset-password', () => {
      const app = createApp();
      mockRouter.url = '/reset-password';
      expect(app.shouldDisplayLayout()).toBeFalse();
    });

    it('should hide layout on /home', () => {
      const app = createApp();
      mockRouter.url = '/home';
      expect(app.shouldDisplayLayout()).toBeFalse();
    });

    it('should show layout on any other route', () => {
      const app = createApp();
      mockRouter.url = '/estudios';
      expect(app.shouldDisplayLayout()).toBeTrue();
    });
  });
});
