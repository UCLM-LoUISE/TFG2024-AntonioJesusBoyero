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

const mockFile = {
  delete: jest.fn(),
  download: jest.fn(),
};
const mockBucket = { file: jest.fn(() => mockFile) };
jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({ bucket: jest.fn(() => mockBucket) })),
}));

const {
  obtenerTareasPorUsuario,
  obtenerEstudioPorIdParaUsuario,
  guardarArchivosTarea,
  leerArchivoTarea,
} = require('../../controllers/tareasController');

/** Prepara db.collection('estudios').doc(id) para devolver el snapshot dado. */
function setupEstudioDoc(snapshot) {
  const docRef = makeDocRef();
  docRef.get.mockResolvedValue(snapshot);
  mockDb.collection.mockReturnValue({ doc: jest.fn(() => docRef) });
  return docRef;
}

describe('tareasController', () => {
  describe('obtenerTareasPorUsuario', () => {
    test('devuelve solo las tareas asignadas al email indicado', async () => {
      const estudio = makeDoc('e1', {
        data: {
          TareasData: [
            { id: 't1', trabajador: 'ana@test.com, luis@test.com' },
            { id: 't2', trabajador: 'otro@test.com' },
          ],
        },
      });
      const sinTareas = makeDoc('e2', { data: {} });
      mockDb.collection.mockReturnValue(makeQuery(makeQuerySnapshot([estudio, sinTareas])));

      const res = makeRes();
      await obtenerTareasPorUsuario({ body: { email: 'ana@test.com' } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { estudioId: 'e1', id: 't1', trabajador: 'ana@test.com, luis@test.com' },
      ]);
    });
  });

  describe('obtenerEstudioPorIdParaUsuario', () => {
    test('devuelve 400 si faltan parámetros', async () => {
      const res = makeRes();
      await obtenerEstudioPorIdParaUsuario({ body: { idEstudio: 'e1' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('devuelve 404 si el estudio no existe', async () => {
      setupEstudioDoc(makeDocSnapshot(false));

      const res = makeRes();
      await obtenerEstudioPorIdParaUsuario(
        { body: { idEstudio: 'e1', emailUsuario: 'ana@test.com' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Estudio no encontrado.' });
    });

    test('filtra las tareas del usuario (trabajador como string o array)', async () => {
      setupEstudioDoc(
        makeDocSnapshot(true, {
          data: {
            NuevoEstudioFormData: { nombre: 'Estudio' },
            TareasData: [
              { id: 't1', trabajador: 'ANA@test.com , luis@test.com' },
              { id: 't2', trabajador: ['Ana@Test.com'] },
              { id: 't3', trabajador: 'otro@test.com' },
            ],
          },
        })
      );

      const res = makeRes();
      const req = { body: { idEstudio: 'e1', emailUsuario: 'ana@test.com' } };
      await obtenerEstudioPorIdParaUsuario(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          NuevoEstudioFormData: { nombre: 'Estudio' },
          TareasData: [
            expect.objectContaining({ id: 't1' }),
            expect.objectContaining({ id: 't2' }),
          ],
        })
      );
    });
  });

  describe('guardarArchivosTarea', () => {
    const archivos = [{ nombre: 'datos.json', url: 'http://x/datos.json' }];

    test('devuelve 400 si faltan parámetros obligatorios', async () => {
      const res = makeRes();
      await guardarArchivosTarea({ body: { idEstudio: 'e1' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Faltan parámetros obligatorios.' });
    });

    test('devuelve 404 si el estudio no existe', async () => {
      setupEstudioDoc(makeDocSnapshot(false));

      const res = makeRes();
      await guardarArchivosTarea(
        { body: { idEstudio: 'e1', idTarea: 't1', archivos, emailUsuario: 'ana@test.com' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Estudio no encontrado.' });
    });

    test('devuelve 404 si la tarea no existe', async () => {
      setupEstudioDoc(makeDocSnapshot(true, { data: { TareasData: [] } }));

      const res = makeRes();
      await guardarArchivosTarea(
        { body: { idEstudio: 'e1', idTarea: 't1', archivos, emailUsuario: 'ana@test.com' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tarea no encontrada.' });
    });

    test('devuelve 400 si el momento no existe en la tarea', async () => {
      setupEstudioDoc(
        makeDocSnapshot(true, {
          data: {
            TareasData: [{ id: 't1', tieneMomentos: true, momentos: { Pre: {} } }],
          },
        })
      );

      const res = makeRes();
      await guardarArchivosTarea(
        {
          body: {
            idEstudio: 'e1',
            idTarea: 't1',
            archivos,
            emailUsuario: 'ana@test.com',
            momento: 'Post',
          },
        },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'El momento "Post" no existe en esta tarea',
        momentosDisponibles: ['Pre'],
      });
    });

    test('guarda archivos en un momento y lo marca como completado', async () => {
      const tarea = { id: 't1', tieneMomentos: true, momentos: { Pre: {} } };
      const docRef = setupEstudioDoc(makeDocSnapshot(true, { data: { TareasData: [tarea] } }));

      const res = makeRes();
      await guardarArchivosTarea(
        {
          body: {
            idEstudio: 'e1',
            idTarea: 't1',
            archivos,
            emailUsuario: 'ana@test.com',
            momento: 'Pre',
          },
        },
        res
      );

      expect(tarea.momentos.Pre.archivosSubidos).toEqual([
        { ...archivos[0], subidoPor: 'ana@test.com' },
      ]);
      expect(tarea.momentos.Pre.status).toBe('completed');
      expect(docRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          'data.TareasData': [tarea],
          'data.subidaDatos.tengoDatosSubidos': true,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('guarda archivos en una tarea sin momentos (compatibilidad)', async () => {
      const tarea = { id: 't1' };
      const docRef = setupEstudioDoc(makeDocSnapshot(true, { data: { TareasData: [tarea] } }));

      const res = makeRes();
      await guardarArchivosTarea(
        { body: { idEstudio: 'e1', idTarea: 't1', archivos, emailUsuario: 'ana@test.com' } },
        res
      );

      expect(tarea.archivosSubidos).toEqual([{ ...archivos[0], subidoPor: 'ana@test.com' }]);
      expect(docRef.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('leerArchivoTarea', () => {
    test('lee y devuelve el contenido JSON de un archivo de un momento', async () => {
      setupEstudioDoc(
        makeDocSnapshot(true, {
          data: {
            TareasData: [
              {
                id: 't1',
                tieneMomentos: true,
                momentos: { Pre: { archivosSubidos: [{ nombre: 'a.json' }] } },
              },
            ],
          },
        })
      );
      mockFile.download.mockResolvedValue([Buffer.from(JSON.stringify({ valor: 42 }))]);

      const res = makeRes();
      await leerArchivoTarea(
        { body: { idEstudio: 'e1', idTarea: 't1', nombreArchivo: 'a.json', momento: 'Pre' } },
        res
      );

      expect(mockBucket.file).toHaveBeenCalledWith('estudios/e1/tareas/t1/Pre/a.json');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        contenido: { valor: 42 },
        momento: 'Pre',
        nombreArchivo: 'a.json',
      });
    });

    test('devuelve 404 si el archivo no está registrado en la BD', async () => {
      setupEstudioDoc(
        makeDocSnapshot(true, {
          data: { TareasData: [{ id: 't1', archivosSubidos: [] }] },
        })
      );

      const res = makeRes();
      await leerArchivoTarea(
        { body: { idEstudio: 'e1', idTarea: 't1', nombreArchivo: 'a.json' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Archivo no encontrado en la base de datos',
        momento: null,
      });
    });
  });
});
