import { Component, OnInit } from '@angular/core';
import { InactivityService } from 'src/app/services/inactivity.service';

declare var bootstrap: any; // Para manejar los modales de Bootstrap

@Component({
  selector: 'app-inactivity-modal',
  templateUrl: './inactivity-modal.component.html',
  styleUrls: ['./inactivity-modal.component.css'],
})
export class InactivityModalComponent implements OnInit {

  public static Instance: InactivityModalComponent;
  private modalInstance: any; // Instancia del modal de Bootstrap
  private modalTimeoutId: any; // Temporizador para el tiempo límite del modal
  private readonly popupLimit = 120 * 1000; // 120 segundos para responder

  constructor(private inactivityService: InactivityService) {
    InactivityModalComponent.Instance = this;
  }

  ngOnInit(): void {
    const modalElement = document.getElementById('inactivityModal');
    if (modalElement) {
      this.modalInstance = new bootstrap.Modal(modalElement);
    }
  }

  show() {
    if (InactivityModalComponent.Instance) {
      console.log('[InactivityModalComponent] Mostrando el modal.');
      InactivityModalComponent.Instance.modalInstance?.show();

      this.modalTimeoutId = setTimeout(() => {
        console.log('[InactivityModalComponent] Usuario no respondió. Cerrando sesión automáticamente.');
        this.inactivityService.logoutDueToInactivity();
        this.hide();
      }, this.popupLimit);

    } else {
      console.error('[InactivityModalComponent] No se pudo mostrar el modal porque la instancia no está inicializada.');
    }
  }

  hide() {
    if (InactivityModalComponent.Instance) {
      console.log('[InactivityModalComponent] Ocultando el modal.');
      InactivityModalComponent.Instance.modalInstance?.hide();
      clearTimeout(this.modalTimeoutId);
    } else {
      console.error('[InactivityModalComponent] No se pudo ocultar el modal porque la instancia no está inicializada.');
    }
  }

  onConfirm() {
    console.log('[InactivityModalComponent] Usuario confirmó que sigue activo.');
    this.hide();
    this.inactivityService.resetTimeout();
  }

  onCancel() {
    console.log('[InactivityModalComponent] Usuario decidió cerrar sesión.');
    this.hide();
    this.inactivityService.logoutDueToInactivity();
  }
}
