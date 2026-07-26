/**
 * Tests de index.js: inicialización de Firebase Admin y montaje de la app Express.
 */
const request = require('supertest');

const mockAdmin = {
  apps: [],
  initializeApp: jest.fn(),
  app: jest.fn(),
  credential: { cert: jest.fn(() => 'credencial-mock') },
  firestore: Object.assign(jest.fn(() => ({ collection: jest.fn() })), {
    FieldValue: { serverTimestamp: jest.fn() },
  }),
  auth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
};

jest.mock('firebase-admin', () => mockAdmin);
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: { send: jest.fn() } })),
}));

// Variables de entorno mínimas para que index.js pueda construir el serviceAccount
process.env.FIREBASE_TYPE = 'service_account';
process.env.FIREBASE_PROJECT_ID = 'proyecto-test';
process.env.FIREBASE_PRIVATE_KEY_ID = 'key-id';
process.env.FIREBASE_PRIVATE_KEY = 'linea1\\nlinea2';
process.env.FIREBASE_CLIENT_EMAIL = 'sa@proyecto-test.iam.gserviceaccount.com';
process.env.FIREBASE_CLIENT_ID = 'client-id';
process.env.FIREBASE_AUTH_URI = 'https://auth';
process.env.FIREBASE_TOKEN_URI = 'https://token';
process.env.FIREBASE_AUTH_PROVIDER_CERT_URL = 'https://certs';
process.env.FIREBASE_CLIENT_CERT_URL = 'https://client-cert';
process.env.FIREBASE_DATABASE_URL = 'https://db';
process.env.FIREBASE_STORAGE_BUCKET = 'bucket';

describe('index.js (app Express)', () => {
  test('GET / responde con el mensaje de prueba', async () => {
    let app;
    jest.isolateModules(() => {
      mockAdmin.apps.length = 0;
      app = require('../index');
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Hola Mundo');
  });

  test('las rutas de la API están montadas', async () => {
    let app;
    jest.isolateModules(() => {
      mockAdmin.apps.length = 0;
      app = require('../index');
    });

    // Ruta protegida sin token: el middleware de auth responde 401,
    // lo que demuestra que la ruta está montada y protegida.
    const response = await request(app).post('/grupos/listar-grupos').send({});
    expect(response.status).toBe(401);
  });
});
