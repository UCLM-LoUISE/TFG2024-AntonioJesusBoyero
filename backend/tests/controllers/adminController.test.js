const {
  makeDoc,
  makeQuerySnapshot,
  makeQuery,
  makeDocRef,
  makeRes,
} = require('../helpers/firestoreMock');

const mockAuth = {
  getUsers: jest.fn(),
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};
const mockDb = { collection: jest.fn() };

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => mockDb);
  firestore.FieldValue = { serverTimestamp: jest.fn(() => 'server-timestamp') };
  return { firestore, auth: jest.fn(() => mockAuth) };
});

const {
  obtenerUsuariosNoAdministradores,
  crearUsuario,
  actualizarEstadoAuth,
} = require('../../controllers/adminController');

describe('adminController', () => {
  describe('obtenerUsuariosNoAdministradores', () => {
    test('devuelve los usuarios con el estado derivado de Auth', async () => {
      const u1 = makeDoc('uid1', { uid: 'uid1', email: 'a@test.com', rol: 'investigador' });
      const u2 = makeDoc('uid2', { email: 'b@test.com', rol: 'trabajador' });
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([u1, u2])));
      mockAuth.getUsers.mockResolvedValue({
        users: [{ uid: 'uid1', disabled: true }],
      });

      const res = makeRes();
      await obtenerUsuariosNoAdministradores({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'uid1', estado: 'inactivo' }),
        expect.objectContaining({ id: 'uid2', estado: 'activo' }),
      ]);
    });
  });

  describe('crearUsuario', () => {
    test('devuelve 400 si faltan campos obligatorios', async () => {
      const res = makeRes();
      await crearUsuario({ body: { email: 'x@test.com' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'missing_fields' });
    });

    test('crea el usuario en Auth y Firestore y devuelve 201', async () => {
      const docRef = makeDocRef();
      const docFn = jest.fn(() => docRef);
      const query = makeQuery(makeQuerySnapshot([]));
      mockDb.collection.mockReturnValue({
        where: jest.fn(() => query),
        doc: docFn,
      });
      mockAuth.getUserByEmail.mockRejectedValue(new Error('auth/user-not-found'));
      mockAuth.createUser.mockResolvedValue({ uid: 'uid-nuevo', disabled: false });

      const res = makeRes();
      await crearUsuario(
        {
          body: {
            email: 'nuevo@test.com',
            nombre: 'Nuevo',
            apellidos: 'Usuario',
            rol: 'trabajador',
          },
        },
        res
      );

      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: 'nuevo@test.com',
        emailVerified: false,
        disabled: false,
      });
      expect(docFn).toHaveBeenCalledWith('uid-nuevo');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ok: true, uid: 'uid-nuevo', estado: 'activo' });
    });
  });

  describe('actualizarEstadoAuth', () => {
    test('devuelve 400 si "activo" no es booleano', async () => {
      const res = makeRes();
      await actualizarEstadoAuth({ body: { uid: 'u1' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'missing_activo_boolean' });
    });

    test('devuelve 400 si no viene ni uid ni email', async () => {
      const res = makeRes();
      await actualizarEstadoAuth({ body: { activo: true } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'missing_uid_or_email' });
    });

    test('desactiva al usuario en Auth a partir de su uid', async () => {
      mockAuth.updateUser.mockResolvedValue({ email: 'y@test.com', disabled: true });

      const res = makeRes();
      await actualizarEstadoAuth({ body: { uid: 'uid2', activo: false } }, res);

      expect(mockAuth.updateUser).toHaveBeenCalledWith('uid2', { disabled: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        uid: 'uid2',
        email: 'y@test.com',
        estado: 'inactivo',
      });
    });
  });
});
