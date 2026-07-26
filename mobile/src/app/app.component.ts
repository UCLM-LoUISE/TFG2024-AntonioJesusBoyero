import { Component } from '@angular/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  public appPages = [
    { title: 'Inbox', url: '/folder/inbox', icon: 'mail' },
    { title: 'Outbox', url: '/folder/outbox', icon: 'paper-plane' },
    { title: 'Favorites', url: '/folder/favorites', icon: 'heart' },
    { title: 'Archived', url: '/folder/archived', icon: 'archive' },
    { title: 'Trash', url: '/folder/trash', icon: 'trash' },
    { title: 'Spam', url: '/folder/spam', icon: 'warning' },
  ];
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];
  constructor() {}
}


// TODO - NOS QUEDAMOS TERMINANDO DE AÑADIR EL MAPA QUE YA SE VE CORRECTAMENTE
// HABRIA QUE VER EL TEMA DE DESCARGAR ESTUDIO EN JSON Y VER COMO CARGARLOS ASI COMO EMPEZAR A DEFINIR LOS FORMULARIOS
// EL TEMA DE LAS SINCRONIAS DE LAS SESIONES, ASI COMO LO DE LA BBDD EN LOCAL SIN CONEXION Y EL LOGARSE SIN CONEXION ETC

