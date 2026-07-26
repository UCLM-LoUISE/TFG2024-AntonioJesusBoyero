const {
  makeDoc,
  makeQuerySnapshot,
  makeQuery,
  makeDocRef,
  makeDocSnapshot,
  makeRes,
} = require('../helpers/firestoreMock');

const mockDb = { collection: jest.fn() };
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => mockDb),
}));

const {
  crearEstudio,
  obtenerEstudiosPorUsuario,
  eliminarEstudio,
  guardarEstudio,
  cambiarEstadoEstudio,
  descargarEstudioPorId,
} = require('../../controllers/estudioController');

describe('estudioController', () => {
  describe('crearEstudio', () => {
    test('crea el estudio y devuelve 201 con su id', async () => {
      const docRef = makeDocRef({ id: 'nuevo-estudio' });
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => docRef) });

      const res = makeRes();
      await crearEstudio({ body: { email: 'ana@test.com', nombre: 'Estudio 1' } }, res);

      expect(docRef.set).toHaveBeenCalledWith({ email: 'ana@test.com', nombre: 'Estudio 1' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 'nuevo-estudio',
        email: 'ana@test.com',
        nombre: 'Estudio 1',
      });
    });
  });

  describe('obtenerEstudiosPorUsuario', () => {
    test('devuelve los estudios del usuario transformando ParcelasData', async () => {
      const estudio = makeDoc('e1', {
        email: ['ana@test.com'],
        data: {
          ParcelasData: {
            type: 'FeatureCollection',
            features: [
              {
                geometry: {
                  type: 'Polygon',
                  coordinates: [{ lat: 1, lng: 2 }],
                },
              },
            ],
          },
        },
      });
      const sinParcelas = makeDoc('e2', { email: ['ana@test.com'], data: {} });
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([estudio, sinParcelas])));

      const res = makeRes();
      await obtenerEstudiosPorUsuario({ body: { email: 'ana@test.com' } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const estudios = res.json.mock.calls[0][0];
      expect(estudios).toHaveLength(2);
      expect(estudios[0].data.ParcelasData.features[0].geometry.coordinates).toEqual([[[2, 1]]]);
    });
  });

  describe('eliminarEstudio', () => {
    test('devuelve 404 si el estudio no existe', async () => {
      const docRef = makeDocRef();
      docRef.get.mockResolvedValue(makeDocSnapshot(false));
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => docRef) });

      const res = makeRes();
      await eliminarEstudio({ body: { id: 'e1' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'El estudio no existe' });
    });

    test('devuelve 400 si el estudio está en un estado no eliminable', async () => {
      const docRef = makeDocRef();
      docRef.get.mockResolvedValue(
        makeDocSnapshot(true, { data: { NuevoEstudioFormData: { estado: 'En curso' } } })
      );
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => docRef) });

      const res = makeRes();
      await eliminarEstudio({ body: { id: 'e1' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(docRef.delete).not.toHaveBeenCalled();
    });

    test('elimina el estudio si está "Sin empezar"', async () => {
      const docRef = makeDocRef();
      docRef.get.mockResolvedValue(
        makeDocSnapshot(true, { data: { NuevoEstudioFormData: { estado: 'Sin empezar' } } })
      );
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => docRef) });

      const res = makeRes();
      await eliminarEstudio({ body: { id: 'e1' } }, res);

      expect(docRef.delete).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('guardarEstudio', () => {
    test('actualiza un estudio existente localizado por idFormulario', async () => {
      const existente = makeDoc('e1', { email: ['ana@test.com'] });
      const query = makeQuery(makeQuerySnapshot([existente]));
      const estudioDoc = makeDocRef({ id: 'e1' });
      mockDb.collection.mockReturnValue({
        where: jest.fn(() => query),
        doc: jest.fn(() => estudioDoc),
      });

      const res = makeRes();
      await guardarEstudio(
        {
          body: {
            email: 'ana@test.com',
            step: 'NuevoEstudioFormData',
            data: { idFormulario: 'f1', nombre: 'X' },
          },
        },
        res
      );

      expect(estudioDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          'data.NuevoEstudioFormData': { idFormulario: 'f1', nombre: 'X' },
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 'e1',
        message: 'Estudio actualizado con idFormulario.',
      });
    });

    test('crea un estudio nuevo si el idFormulario no existe', async () => {
      const query = makeQuery(makeQuerySnapshot([]));
      const newDocRef = makeDocRef({ id: 'nuevo' });
      mockDb.collection.mockReturnValue({
        where: jest.fn(() => query),
        doc: jest.fn(() => newDocRef),
      });

      const res = makeRes();
      await guardarEstudio(
        {
          body: {
            email: 'ana@test.com',
            step: 'NuevoEstudioFormData',
            data: { idFormulario: 'f-nuevo' },
          },
        },
        res
      );

      expect(newDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: ['ana@test.com'],
          data: expect.objectContaining({
            NuevoEstudioFormData: { idFormulario: 'f-nuevo' },
            subidaDatos: { tengoDatosSubidos: false },
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'nuevo', message: 'Estudio creado.' });
    });

    test('actualiza por id y devuelve 404 si no existe', async () => {
      const estudioDoc = makeDocRef({ id: 'e1' });
      estudioDoc.get.mockResolvedValue(makeDocSnapshot(false));
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => estudioDoc) });

      const res = makeRes();
      await guardarEstudio({ body: { id: 'e1', data: {} } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Estudio no encontrado.' });
    });

    test('actualiza un estudio existente por id', async () => {
      const estudioDoc = makeDocRef({ id: 'e1' });
      estudioDoc.get.mockResolvedValue(makeDocSnapshot(true, { email: ['ana@test.com'] }));
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => estudioDoc) });

      const res = makeRes();
      await guardarEstudio(
        { body: { id: 'e1', step: 'TareasData', data: [{ id: 't1' }] } },
        res
      );

      expect(estudioDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({ 'data.TareasData': [{ id: 't1' }] })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: 'e1', message: 'Estudio actualizado.' });
    });
  });

  describe('cambiarEstadoEstudio', () => {
    test('actualiza el estado buscando por id', async () => {
      const estudioDoc = makeDocRef({ id: 'e1' });
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => estudioDoc) });

      const res = makeRes();
      await cambiarEstadoEstudio({ body: { id: 'e1', nuevoEstado: 'En curso' } }, res);

      expect(estudioDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({ 'data.NuevoEstudioFormData.estado': 'En curso' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 'e1',
        message: 'Estado del estudio actualizado a En curso.',
      });
    });

    test('devuelve 400 si no viene id ni idFormulario', async () => {
      const res = makeRes();
      await cambiarEstadoEstudio({ body: { nuevoEstado: 'En curso' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('descargarEstudioPorId', () => {
    test('descarga el estudio como JSON adjunto', async () => {
      const docRef = makeDocRef();
      docRef.get.mockResolvedValue(makeDocSnapshot(true, { nombre: 'Estudio 1' }));
      mockDb.collection.mockReturnValue({ doc: jest.fn(() => docRef) });

      const res = makeRes();
      await descargarEstudioPorId({ body: { id: 'e1' } }, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=estudio-e1.json'
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.send).toHaveBeenCalledWith(
        JSON.stringify({ id: 'e1', nombre: 'Estudio 1' }, null, 2)
      );
    });
  });
});
