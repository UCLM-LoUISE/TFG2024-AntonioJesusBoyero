const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors'); // Importa el middleware cors

dotenv.config();

// Inicializasdasdadeder Firebase Admin SDK con las variables de entorno
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Convertir los "\n" en saltos de línea reales
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL, // Leer la URL desde las variables de entorno
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Leer el bucket de almacenamiento desde las variables de entorno
  });
} else {
  admin.app(); // Usa la instancia existente
}

const app = express();

// // Configuración de CORS
// const allowedOrigins = [
//   'http://localhost:4200', // Frontend local
//   'http://localhost:64986', // Frontend local
//   'https://tfg-terr-app-front.vercel.app', // URL del frontend en producción
// ];

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Permitir solicitudes de orígenes definidos o solicitudes sin origen (como Postman)
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error('CORS no permitido para este origen.'));
//       }
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
//     allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
//   })
// );

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-token'],
  })
);



app.options('*', cors()); // Maneja las solicitudes preflight
app.use(bodyParser.json());

// Importar rutas
const usuariosRoutes = require('./routes/usuariosRoutes');
const estudiosRoutes = require('./routes/estudiosRoutes');
const tareasRoutes = require('./routes/tareasRoutes');
const emailRoutes = require('./routes/emailRoutes');
const adminRoutes = require('./routes/adminRoutes');
const gruposRoutes = require('./routes/gruposRoutes');
const cronRoutes = require('./routes/cronRoutes');
const momentosRoutes = require('./routes/momentosRoutes');



// RUTAS
app.use('/usuarios', usuariosRoutes);
app.use('', estudiosRoutes);
app.use('', tareasRoutes);
app.use('/email', emailRoutes);
app.use('/admin', adminRoutes);
app.use('/grupos', gruposRoutes);
app.use('/cron', cronRoutes);
app.use('/momentos', momentosRoutes);

const PORT = process.env.PORT || 3000;

// Solo levantamos el servidor si este fichero se ejecuta directamente (node index.js).
// Al importarlo desde los tests (o desde un entorno serverless) no se abre el puerto.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}

// Endpoint de prueba "Hola Mundo"
app.get('/', (req, res) => {
  res.send('Hola Mundo desde el servidor de TerrApp despues de hacer un pull request a main!');
});


module.exports = app;