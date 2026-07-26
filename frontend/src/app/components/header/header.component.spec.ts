import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from './header.component';
import { AuthService } from 'src/app/services/auth.service';
import { InactivityService } from 'src/app/services/inactivity.service';
import { UserData } from 'src/app/data/user-data';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  let mockAuthService: any;
  let mockInactivityService: any;
  let mockRouter: any;
  let originalZonasInstance: any;

  beforeEach(async () => {
    mockAuthService = { logout: jasmine.createSpy('logout') };
    mockInactivityService = { stopMonitoring: jasmine.createSpy('stopMonitoring') };
    mockRouter = { navigate: jasmine.createSpy('navigate') };

    originalZonasInstance = ZonasEstudioMuestreosPage.instance;
    ZonasEstudioMuestreosPage.instance = undefined as any;

    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: InactivityService, useValue: mockInactivityService },
        { provide: Router, useValue: mockRouter },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    ZonasEstudioMuestreosPage.instance = originalZonasInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should receive the user name from UserData on init', () => {
    UserData.setUserName('Antonio');
    fixture.detectChanges(); // dispara ngOnInit
    expect(component.userName).toBe('Antonio');

    UserData.setUserName('Maria');
    expect(component.userName).toBe('Maria');
  });

  it('toggleDropdown should flip visibility', () => {
    expect(component.isDropdownVisible).toBeFalse();
    component.toggleDropdown();
    expect(component.isDropdownVisible).toBeTrue();
    component.toggleDropdown();
    expect(component.isDropdownVisible).toBeFalse();
  });

  it('logout should call AuthService.logout and stop inactivity monitoring', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockInactivityService.stopMonitoring).toHaveBeenCalled();
  });

  describe('goHome', () => {
    it('should navigate to /estudios when ZonasEstudioMuestreosPage.instance is undefined', () => {
      ZonasEstudioMuestreosPage.instance = undefined as any;
      component.goHome();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
    });

    it('should show the unsaved-changes modal when there are map changes', () => {
      const showModalSpy = jasmine.createSpy('showModalnoHasGuardado');
      ZonasEstudioMuestreosPage.instance = {
        cambioFigurasEnElMapa: true,
        showModalnoHasGuardado: showModalSpy,
      } as any;

      component.goHome();

      expect(showModalSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to /estudios when there are no map changes', () => {
      ZonasEstudioMuestreosPage.instance = {
        cambioFigurasEnElMapa: false,
        showModalnoHasGuardado: jasmine.createSpy('showModalnoHasGuardado'),
      } as any;

      component.goHome();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
    });
  });

  it('goToProfile should navigate to /perfil', () => {
    component.goToProfile();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/perfil']);
  });
});
