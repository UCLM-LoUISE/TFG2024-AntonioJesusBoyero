const { Resend } = require('resend');
const dotenv = require('dotenv');

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Función para enviar correo
async function enviarCorreoTarea(asunto, destinatario, contenidoHtml) {
    try {
        const response = await resend.emails.send({
            from: 'onboarding@resend.dev', // Usamos el email de prueba de Resend
            to: destinatario,
            subject: asunto,
            html: contenidoHtml,
        });

        console.log('📧 Correo enviado con éxito:', response);
        return response;
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        throw error;
    }
}

// Controlador para manejar la ruta
async function enviarCorreoPrueba(req, res) {
    const { destinatario } = req.body;

    if (!destinatario) {
        return res.status(400).json({ error: 'Falta el destinatario del correo' });
    }

    try {
        const asunto = 'Prueba de correo con Resend';
        const contenidoHtml = `<p>Hola, esto es un correo de prueba enviado desde tu backend con Resend.</p>`;

        const response = await enviarCorreoTarea(asunto, destinatario, contenidoHtml);
        res.status(200).json({ message: 'Correo enviado correctamente', response });
    } catch (error) {
        res.status(500).json({ error: 'Error al enviar el correo', detalle: error.message });
    }
}

module.exports = { enviarCorreoTarea, enviarCorreoPrueba };
