# TFG2024-AntonioJesusBoyero
Trabajo fin de grado de Antonio Jesús Boyero
"Desarrollo de una aplicación para la gestión de actividades de campo en ciencias e ingenierías ambientales"

**Aplicación web desplegada:** <https://tfg-terr-app-front.vercel.app>

## Estructura del repositorio

| Carpeta     | Módulo                | Tecnología  |
|-------------|-----------------------|-------------|
| `frontend/` | Aplicación web        | Angular     |
| `backend/`  | Servidor (API)        | Express.js  |
| `mobile/`   | Aplicación móvil      | Ionic       |

## Requisitos previos

- Node.js 18 o superior y npm
- Angular CLI (`npm install -g @angular/cli`)
- Ionic CLI (`npm install -g @ionic/cli`) — solo para la aplicación móvil

## Puesta en marcha

### Servidor (backend)

```bash
cd backend
npm install
npm start
```

El servidor queda disponible en `http://localhost:3000`.

### Aplicación web (frontend)

```bash
cd frontend
npm install
ng serve
```

Accesible en `http://localhost:4200`.

### Aplicación móvil (mobile)

```bash
cd mobile
npm install
ionic serve          # ejecución en navegador
```

## Pruebas

Cada módulo incluye su batería de pruebas unitarias:

```bash
npm test    # ejecutar dentro de frontend/, backend/ o mobile/
```
