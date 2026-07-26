const { makeDocRef, makeDocSnapshot, makeRes } = require('../helpers/firestoreMock');

const mockDb = { collection: jest.fn() };
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => mockDb),
}));

const {
  verificarMomentosEnTareas,
  actualizarMomentosYTareas,
} = require('../../controllers/momentosController');

/** Prepara db.collection('estudios').doc(id) para devolver el snapshot dado. */
function setupEstudio(snapshot) {
  const docRef = makeDocRef();
  docRef.get.mockResolvedValue(snapshot);
  mockDb.collection.mockReturnValue({ doc: jest.fn(() => docRef) });
  return docRef;
}

const estudioConMomentos = (tareas = []) => ({
  data: {
    NuevoEstudioFormData: {
      tieneMomentos: true,
      momentos: ['Pre', 'Post'],
    },
    TareasData: tareas,
  },
});

describe('momentosController', () => {
  describe('verificarMomentosEnTareas', () => {
    test('devuelve 400 si falta el id del estudio', async () => {
      const res = makeRes();
      await verificarMomentosEnTareas({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El ID del estudio es requerido' });
    });

    test('devuelve 404 si el estudio no existe', async () => {
      setupEstudio(makeDocSnapshot(false));

      const res = makeRes();
      await verificarMomentosEnTareas({ body: { id: 'e1', tieneMomentos: false } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Estudio no encontrado' });
    });

    test('devuelve 400 si el momento a eliminar no existe en el estudio', async () => {
      setupEstudio(makeDocSnapshot(true, estudioConMomentos()));

      const res = makeRes();
      await verificarMomentosEnTareas(
        { body: { id: 'e1', momentoAEliminar: 'NoExiste' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'El momento "NoExiste" no existe en este estudio',
      });
    });

    test('caso desmarcar checkbox: detecta las tareas afectadas', async () => {
      const tareas = [
        {
          id: 't1',
          nombreTarea: 'Tarea 1',
          tieneMomentos: true,
          momentos: { Pre: {}, Post: {} },
        },
        { id: 't2', nombreTarea: 'Tarea 2' }, // sin momentos
      ];
      setupEstudio(makeDocSnapshot(true, estudioConMomentos(tareas)));

      const res = makeRes();
      await verificarMomentosEnTareas({ body: { id: 'e1', tieneMomentos: false } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.tipoAccion).toBe('desmarcar_checkbox');
      expect(payload.hayTareasAfectadas).toBe(true);
      expect(payload.totalTareasAfectadas).toBe(1);
      expect(payload.tareasAfectadas[0]).toMatchObject({
        tareaId: 't1',
        quedaSinMomentos: true,
      });
    });

    test('caso eliminar momento específico con tareas afectadas', async () => {
      const tareas = [
        { id: 't1', nombreTarea: 'Tarea 1', tieneMomentos: true, momentos: { Pre: {}, Post: {} } },
      ];
      setupEstudio(makeDocSnapshot(true, estudioConMomentos(tareas)));

      const res = makeRes();
      await verificarMomentosEnTareas({ body: { id: 'e1', momentoAEliminar: 'Pre' } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.tipoAccion).toBe('eliminar_momento_especifico');
      expect(payload.momentosAEliminar).toEqual(['Pre']);
      expect(payload.hayTareasAfectadas).toBe(true);
    });
  });

  describe('actualizarMomentosYTareas', () => {
    test('devuelve 404 si el estudio no existe', async () => {
      setupEstudio(makeDocSnapshot(false));

      const res = makeRes();
      await actualizarMomentosYTareas({ body: { id: 'e1', tieneMomentos: false } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Estudio no encontrado' });
    });

    test('caso desmarcar checkbox: limpia todos los momentos de las tareas', async () => {
      const tareas = [
        { id: 't1', nombreTarea: 'Tarea 1', tieneMomentos: true, momentos: { Pre: {}, Post: {} } },
        { id: 't2', nombreTarea: 'Tarea 2' },
      ];
      const docRef = setupEstudio(makeDocSnapshot(true, estudioConMomentos(tareas)));

      const res = makeRes();
      await actualizarMomentosYTareas({ body: { id: 'e1', tieneMomentos: false } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updateArg = docRef.update.mock.calls[0][0];
      expect(updateArg['data.NuevoEstudioFormData.tieneMomentos']).toBe(false);
      expect(updateArg['data.NuevoEstudioFormData.momentos']).toEqual([]);
      expect(updateArg['data.TareasData'][0]).toMatchObject({
        tieneMomentos: false,
        momentos: {},
      });

      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.momentosInfo.tareasActualizadas).toBe(1);
    });

    test('caso eliminar momento específico: lo quita de las tareas y de la lista', async () => {
      const tareas = [
        {
          id: 't1',
          nombreTarea: 'Tarea 1',
          tieneMomentos: true,
          momentos: { Pre: { status: 'pending' }, Post: { status: 'pending' } },
        },
      ];
      const docRef = setupEstudio(makeDocSnapshot(true, estudioConMomentos(tareas)));

      const res = makeRes();
      await actualizarMomentosYTareas({ body: { id: 'e1', momentoAEliminar: 'Pre' } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updateArg = docRef.update.mock.calls[0][0];
      expect(updateArg['data.NuevoEstudioFormData.momentos']).toEqual(['Post']);
      expect(updateArg['data.TareasData'][0].momentos).toEqual({
        Post: { status: 'pending' },
      });
    });
  });
});
