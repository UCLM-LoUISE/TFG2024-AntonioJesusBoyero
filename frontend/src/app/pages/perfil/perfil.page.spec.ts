import { PerfilPage } from './perfil.page';
import { UserData } from 'src/app/data/user-data';

describe('PerfilPage', () => {
  let page: PerfilPage;
  let mockAuth: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuth = jasmine.createSpyObj('AuthService', ['getUserData']);
    mockAuth.getUserData.and.returnValue(Promise.resolve());
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    UserData.setUserEmail('user@test.com');
    UserData.setUserData({});
    page = new PerfilPage(mockAuth, mockRouter);
  });

  it('se crea correctamente', () => {
    expect(page).toBeTruthy();
  });

  it('ngOnInit usa los datos cacheados si existen', async () => {
    UserData.setUserData({ nombre: 'Antonio' });
    await page.ngOnInit();
    expect(page.userData).toEqual({ nombre: 'Antonio' });
    expect(mockAuth.getUserData).not.toHaveBeenCalled();
  });

  it('ngOnInit pide los datos al servicio si no hay datos cacheados', async () => {
    UserData.setUserData({});
    mockAuth.getUserData.and.callFake(() => {
      UserData.setUserData({ nombre: 'Recuperado' });
      return Promise.resolve();
    });
    await page.ngOnInit();
    expect(mockAuth.getUserData).toHaveBeenCalledWith('user@test.com');
    expect(page.userData).toEqual({ nombre: 'Recuperado' });
  });

  it('ngOnInit pide los datos si userData es null', async () => {
    UserData.setUserData(null);
    mockAuth.getUserData.and.callFake(() => {
      UserData.setUserData({ nombre: 'X' });
      return Promise.resolve();
    });
    await page.ngOnInit();
    expect(mockAuth.getUserData).toHaveBeenCalled();
    expect(page.userData).toEqual({ nombre: 'X' });
  });

  it('ngOnInit gestiona el error si el servicio falla', async () => {
    UserData.setUserData({});
    mockAuth.getUserData.and.returnValue(Promise.reject(new Error('fallo')));
    await page.ngOnInit();
    expect(page.userData).toEqual({});
  });

  it('goBack navega a /estudios', () => {
    page.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
  });
});
