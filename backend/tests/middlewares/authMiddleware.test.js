const { makeRes } = require('../helpers/firestoreMock');

const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

const verifyToken = require('../../middlewares/authMiddleware');

describe('authMiddleware (verifyToken)', () => {
  test('devuelve 401 si no se proporciona token', async () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token no proporcionado' });
    expect(next).not.toHaveBeenCalled();
  });

  test('llama a next() y guarda el usuario si el token es válido', async () => {
    const decoded = { uid: 'abc', email: 'user@test.com' };
    mockVerifyIdToken.mockResolvedValue(decoded);

    const req = { headers: { authorization: 'Bearer token-valido' } };
    const res = makeRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(mockVerifyIdToken).toHaveBeenCalledWith('token-valido');
    expect(req.user).toEqual(decoded);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('devuelve 401 si el token no es válido', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('invalid'));

    const req = { headers: { authorization: 'Bearer token-malo' } };
    const res = makeRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token no válido' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
