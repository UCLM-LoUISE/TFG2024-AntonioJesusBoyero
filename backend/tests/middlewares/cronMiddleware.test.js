const { makeRes } = require('../helpers/firestoreMock');
const verifyCronToken = require('../../middlewares/cronMiddleware');

describe('cronMiddleware (verifyCronToken)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.REQUIRE_VERCEL_CRON;
    delete process.env.CRON_TOKEN;
    delete process.env.CRON_TOKENS;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const makeReq = (overrides = {}) => ({
    method: 'GET',
    headers: {},
    query: {},
    ...overrides,
  });

  test('devuelve 405 si el método no es GET', () => {
    const res = makeRes();
    verifyCronToken(makeReq({ method: 'POST' }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'method_not_allowed' });
  });

  test('devuelve 401 si no se envía token', () => {
    const res = makeRes();
    verifyCronToken(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'missing_cron_token' });
  });

  test('devuelve 401 si el token no coincide', () => {
    process.env.CRON_TOKEN = 'secreto';
    const res = makeRes();
    verifyCronToken(makeReq({ headers: { 'x-cron-token': 'incorrecto' } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'unauthorized' });
  });

  test('llama a next() si el token de la cabecera es válido', () => {
    process.env.CRON_TOKEN = 'secreto';
    const next = jest.fn();
    verifyCronToken(makeReq({ headers: { 'x-cron-token': 'secreto' } }), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  describe('modo Vercel (REQUIRE_VERCEL_CRON=1)', () => {
    beforeEach(() => {
      process.env.REQUIRE_VERCEL_CRON = '1';
    });

    test('devuelve 401 sin la cabecera x-vercel-cron', () => {
      const res = makeRes();
      verifyCronToken(makeReq(), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'not_vercel_cron' });
    });

    test('llama a next() con la cabecera x-vercel-cron', () => {
      const next = jest.fn();
      verifyCronToken(makeReq({ headers: { 'x-vercel-cron': '1' } }), makeRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
