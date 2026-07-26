const {
  makeDoc,
  makeQuerySnapshot,
  makeQuery,
  makeDocRef,
  makeDocSnapshot,
  makeRes,
} = require('../helpers/firestoreMock');

const mockDb = { collection: jest.fn(), batch: jest.fn() };
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => mockDb),
}));

const { crearGrupo, listarGrupos, borrarGrupo } = require('../../controllers/gruposController');

describe('gruposController', () => {
  describe('crearGrupo', () => {
    test('devuelve 400 si no viene ni nombre ni id', async () => {
      const res = makeRes();
      await crearGrupo({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'missing_nombre' });
    });

    test('crea el grupo con slug generado a partir del nombre (quitando acentos)', async () => {
      const docRef = makeDocRef();
      docRef.get.mockResolvedValue(makeDocSnapshot(false));
      const dupQuery = makeQuery(makeQuerySnapshot([]));
      mockDb.collection.mockReturnValue({
        doc: jest.fn(() => docRef),
        where: jest.fn(() => dupQuery),
      });

      const res = makeRes();
      await crearGrupo({ body: { nombre: 'Investigación Água' } }, res);

      expect(docRef.set).toHaveBeenCalledWith(
        { nombre: 'Investigación Água', memberCount: 0 },
        { merge: false }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        id: 'investigacion-agua',
        nombre: 'Investigación Água',
        memberCount: 0,
      });
    });

    test('devuelve 409 si ya existe un grupo con ese id', async () => {
      const docRef = makeDocRef();
      docRef.get.mockResolvedValue(makeDocSnapshot(true, { nombre: 'Grupo A' }));
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => docRef) });

      const res = makeRes();
      await crearGrupo({ body: { nombre: 'Grupo A' } }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'group_already_exists',
        id: 'grupo-a',
      });
    });
  });

  describe('listarGrupos', () => {
    test('devuelve todos los grupos', async () => {
      const g1 = makeDoc('g1', { nombre: 'Grupo 1', memberCount: 2 });
      const g2 = makeDoc('g2', { nombre: 'Grupo 2', memberCount: 0 });
      const query = makeQuery(makeQuerySnapshot([g1, g2]));
      mockDb.collection.mockReturnValue(query);

      const res = makeRes();
      await listarGrupos({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { id: 'g1', nombre: 'Grupo 1', memberCount: 2 },
        { id: 'g2', nombre: 'Grupo 2', memberCount: 0 },
      ]);
    });

    test('devuelve un array vacío si no hay grupos', async () => {
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([])));

      const res = makeRes();
      await listarGrupos({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('filtra por nombre si se proporciona', async () => {
      const g1 = makeDoc('g1', { nombre: 'Grupo 1' });
      const filtered = makeQuery(makeQuerySnapshot([g1]));
      const base = { where: jest.fn(() => filtered) };
      mockDb.collection.mockReturnValue(base);

      const res = makeRes();
      await listarGrupos({ body: { nombre: 'Grupo 1' } }, res);

      expect(base.where).toHaveBeenCalledWith('nombre', '==', 'Grupo 1');
      expect(res.json).toHaveBeenCalledWith([{ id: 'g1', nombre: 'Grupo 1' }]);
    });
  });

  describe('borrarGrupo', () => {
    test('devuelve 400 si falta el nombre', async () => {
      const res = makeRes();
      await borrarGrupo({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'missing_group_name' });
    });

    test('devuelve 404 si el grupo no existe', async () => {
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([])));

      const res = makeRes();
      await borrarGrupo({ body: { nombre: 'NoExiste' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'group_not_found',
        nombre: 'NoExiste',
      });
    });
  });
});
