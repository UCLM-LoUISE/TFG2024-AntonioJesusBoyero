import { UserData } from './user-data';

describe('UserData', () => {
  beforeEach(() => {
    // Estado limpio: clase estática compartida entre tests
    UserData.setUserData([]);
    UserData.setUserEmail(undefined);
    UserData.setUserRol(undefined);
  });

  it('setUserName should emit the name through getUserName observable', () => {
    UserData.setUserName('Antonio');
    let received: string | null = null;
    // BehaviorSubject: emite el último valor de forma síncrona al suscribirse
    const sub = UserData.getUserName().subscribe((name) => (received = name));
    sub.unsubscribe();
    expect(received!).toBe('Antonio');
  });

  it('getUserName should emit subsequent updates', () => {
    const emitted: (string | null)[] = [];
    const sub = UserData.getUserName().subscribe((n) => emitted.push(n));
    UserData.setUserName('Pepe');
    UserData.setUserName('Maria');
    sub.unsubscribe();
    expect(emitted[emitted.length - 2]).toBe('Pepe');
    expect(emitted[emitted.length - 1]).toBe('Maria');
  });

  it('should set and get user data', () => {
    const data = { nombre: 'Antonio', rol: 'investigador', email: 'a@a.com' };
    UserData.setUserData(data);
    expect(UserData.getUserData()).toEqual(data);
  });

  it('should set and get user email', () => {
    UserData.setUserEmail('antonio@test.com');
    expect(UserData.getUserEmail()).toBe('antonio@test.com');
  });

  it('should set and get user rol', () => {
    UserData.setUserRol('administrador');
    expect(UserData.getUserRol()).toBe('administrador');
  });

  it('should return undefined rol/email when cleared', () => {
    expect(UserData.getUserRol()).toBeUndefined();
    expect(UserData.getUserEmail()).toBeUndefined();
  });
});
