const {
  makeDoc,
  makeQuerySnapshot,
  makeQuery,
  makeBatch,
  makeRes,
} = require('../helpers/firestoreMock');

const mockDb = { collection: jest.fn(), batch: jest.fn() };
jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => mockDb);
  firestore.FieldValue = { serverTimestamp: jest.fn(() => 'server-timestamp') };
  return { firestore };
});

const { dailyStudyStatus } = require('../../controllers/cronController');

describe('cronController (dailyStudyStatus)', () => {
  test('pasa a "En curso" solo los estudios cuya fechaInicio ya ha llegado', async () => {
    const pasado = makeDoc('e1', {
      data: { NuevoEstudioFormData: { estado: 'Sin empezar', fechaInicio: '2000-01-01' } },
    });
    const futuro = makeDoc('e2', {
      data: { NuevoEstudioFormData: { estado: 'Sin empezar', fechaInicio: '2999-12-31' } },
    });

    const batch = makeBatch();
    mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([pasado, futuro])));
    mockDb.batch.mockReturnValue(batch);

    const res = makeRes();
    await dailyStudyStatus({}, res);

    expect(batch.update).toHaveBeenCalledTimes(1);
    expect(batch.update).toHaveBeenCalledWith(pasado.ref, {
      'data.NuevoEstudioFormData.estado': 'En curso',
      updatedAt: 'server-timestamp',
    });
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, updatedToEnCurso: 1 });
  });
});
