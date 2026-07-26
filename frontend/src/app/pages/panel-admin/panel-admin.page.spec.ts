import { Subject } from 'rxjs';
import { PanelAdminPage } from './panel-admin.page';
import { UserData } from 'src/app/data/user-data';

describe('PanelAdminPage', () => {
  let page: PanelAdminPage;
  let mockRouter: any;
  let rolSubject: Subject<string | null>;
  let mockAuthService: any;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    rolSubject = new Subject<string | null>();
    mockAuthService = { userRol$: rolSubject.asObservable() };
    UserData.setUserRol(undefined);
    page = new PanelAdminPage(mockRouter, mockAuthService);
  });

  afterEach(() => {
    UserData.setUserRol(undefined);
  });

  it('se crea correctamente', () => {
    expect(page).toBeTruthy();
    expect(page.vista).toBe('usuarios');
    expect(page.loading).toBeTrue();
  });

  it('ngOnInit desbloquea al instante si el rol cacheado es administrador', () => {
    UserData.setUserRol('administrador');
    page.ngOnInit();
    expect(page.loading).toBeFalse();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('ngOnInit redirige a /estudios si el rol cacheado no es administrador', () => {
    UserData.setUserRol('trabajador');
    page.ngOnInit();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
    expect(page.loading).toBeTrue();
  });

  it('ngOnInit espera al rol emitido: null no hace nada', () => {
    page.ngOnInit();
    rolSubject.next(null);
    expect(page.loading).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('ngOnInit redirige cuando el rol emitido no es administrador', () => {
    page.ngOnInit();
    rolSubject.next('investigador');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
  });

  it('ngOnInit desbloquea cuando el rol emitido es administrador', () => {
    page.ngOnInit();
    rolSubject.next('administrador');
    expect(page.loading).toBeFalse();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('cambiarVista cambia la vista activa', () => {
    page.cambiarVista('grupos');
    expect(page.vista).toBe('grupos');
    page.cambiarVista('usuarios');
    expect(page.vista).toBe('usuarios');
  });
});
