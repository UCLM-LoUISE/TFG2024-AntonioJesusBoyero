const {
  makeDoc,
  makeQuerySnapshot,
  makeQuery,
  makeRes,
} = require('../helpers/firestoreMock');

const mockDb = { collection: jest.fn() };
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => mockDb),
}));

const {
  obtenerUsuarioPorEmail,
  obtenerInvestigadoresMismoGrupo,
} = require('../../controllers/usuariosController');

describe('usuariosController', () => {
  describe('obtenerUsuarioPorEmail', () => {
    test('devuelve 200 con los datos del usuario si existe', async () => {
      const doc = makeDoc('u1', { email: 'ana@test.com', nombre: 'Ana' });
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([doc])));

      const res = makeRes();
      await obtenerUsuarioPorEmail({ body: { email: 'ana@test.com' } }, res);

      expect(mockDb.collection).toHaveBeenCalledWith('usuarios');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 'u1',
        email: 'ana@test.com',
        nombre: 'Ana',
      });
    });

    test('devuelve 404 si el usuario no existe', async () => {
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([])));

      const res = makeRes();
      await obtenerUsuarioPorEmail({ body: { email: 'nadie@test.com' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado' });
    });
  });

  describe('obtenerInvestigadoresMismoGrupo', () => {
    test('devuelve 400 si falta el email', async () => {
      const res = makeRes();
      await obtenerInvestigadoresMismoGrupo({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'email_required' });
    });

    test('devuelve lista vacía si el usuario no tiene grupo', async () => {
      const user = makeDoc('u1', { email: 'x@test.com', grupo: null });
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([user])));

      const res = makeRes();
      await obtenerInvestigadoresMismoGrupo({ body: { email: 'x@test.com' } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: true, data: [] });
    });

    test('devuelve los investigadores del grupo excluyendo al propio usuario', async () => {
      const user = makeDoc('u1', { email: 'ana@test.com', grupo: 'G1' });
      const inv1 = makeDoc('u1', { email: 'ana@test.com', grupo: 'G1', rol: 'investigador' });
      const inv2 = makeDoc('u2', { email: 'luis@test.com', grupo: 'G1', rol: 'investigador' });

      mockDb.collection
        .mockReturnValueOnce(makeQuery(makeQuerySnapshot([user])))
        .mockReturnValueOnce(makeQuery(makeQuerySnapshot([inv1, inv2])));

      const res = makeRes();
      await obtenerInvestigadoresMismoGrupo({ body: { email: 'ana@test.com' } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: [{ id: 'u2', email: 'luis@test.com', grupo: 'G1', rol: 'investigador' }],
      });
    });

    test('devuelve 404 si el usuario base no existe', async () => {
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([])));

      const res = makeRes();
      await obtenerInvestigadoresMismoGrupo({ body: { email: 'x@test.com' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'user_not_found' });
    });
  });
});
