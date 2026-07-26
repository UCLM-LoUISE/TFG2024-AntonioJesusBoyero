const { makeRes } = require('../helpers/firestoreMock');

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: { send: mockSend } })),
}));

const { enviarCorreoPrueba } = require('../../controllers/resendController');

describe('resendController', () => {
  describe('enviarCorreoPrueba', () => {
    test('devuelve 400 si falta el destinatario', async () => {
      const res = makeRes();
      await enviarCorreoPrueba({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Falta el destinatario del correo' });
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('devuelve 200 si el correo se envía correctamente', async () => {
      mockSend.mockResolvedValue({ id: 'email-456' });

      const res = makeRes();
      await enviarCorreoPrueba({ body: { destinatario: 'destino@test.com' } }, res);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'destino@test.com' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Correo enviado correctamente',
        response: { id: 'email-456' },
      });
    });
  });
});
