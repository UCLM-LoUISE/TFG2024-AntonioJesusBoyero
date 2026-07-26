/**
 * Helpers para simular Firestore en los tests unitarios.
 * Construyen los objetos mínimos (documentos, snapshots, queries...)
 * que usan los controllers, sin tocar Firebase real.
 */

/** Resuelve una ruta con puntos ("data.NuevoEstudioFormData.estado") sobre un objeto. */
function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** Crea un documento de un query snapshot (docs[i]). */
function makeDoc(id, data, refOverrides = {}) {
  return {
    id,
    data: () => data,
    get: (path) => getByPath(data, path),
    ref: {
      update: jest.fn().mockResolvedValue(),
      delete: jest.fn().mockResolvedValue(),
      ...refOverrides,
    },
  };
}

/** Crea el resultado de una query (snapshot con varios docs). */
function makeQuerySnapshot(docs = []) {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb) => docs.forEach(cb),
  };
}

/** Crea el resultado de un docRef.get() (snapshot de un único doc). */
function makeDocSnapshot(exists, data = {}) {
  return { exists, data: () => data };
}

/**
 * Crea una query encadenable: where().limit().get() en cualquier orden.
 * `snapshot` es lo que devolverá get(); puede pasarse un jest.fn como getImpl.
 */
function makeQuery(snapshot) {
  const query = {
    where: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn().mockResolvedValue(snapshot),
  };
  return query;
}

/**
 * Crea una referencia a documento (db.collection(x).doc(id)).
 */
function makeDocRef(overrides = {}) {
  return {
    id: overrides.id || 'nuevo-id',
    get: jest.fn().mockResolvedValue(makeDocSnapshot(false)),
    set: jest.fn().mockResolvedValue(),
    update: jest.fn().mockResolvedValue(),
    delete: jest.fn().mockResolvedValue(),
    ...overrides,
  };
}

/** Crea un batch de escritura (db.batch()). */
function makeBatch() {
  return {
    update: jest.fn(),
    commit: jest.fn().mockResolvedValue(),
  };
}

/** Mock de los objetos req/res de Express. */
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  return res;
}

module.exports = {
  makeDoc,
  makeQuerySnapshot,
  makeDocSnapshot,
  makeQuery,
  makeDocRef,
  makeBatch,
  makeRes,
};
