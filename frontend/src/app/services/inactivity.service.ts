import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Subscription } from 'rxjs';
import { InactivityModalComponent } from '../components/modales/inactivity-modal/inactivity-modal.component';

@Injectable({
  providedIn: 'root',
})
export class InactivityService {

  private timeoutId: any;
  private inactivityLimit = 12000 * 1000; // actualmene  20 minutos (1200 segundos) en milisegundos
  private authSubscription!: Subscription;
  private isMonitoring = false; // Estado para verificar si el monitoreo está activo

  constructor(private authService: AuthService) {}

  initialize() {
    console.log('[InactivityService] Inicializando monitoreo.');
    this.authSubscription = this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        console.log('[InactivityService] Usuario autenticado. Iniciando monitoreo.');
        this.startMonitoring();
      } else {
        console.log('[InactivityService] Usuario no autenticado. Deteniendo monitoreo.');
        this.stopMonitoring();
      }
    });
  }

  startMonitoring() {
    if (this.isMonitoring) return; // Evitar reiniciar si ya está en marcha
    this.isMonitoring = true;
    console.log('[InactivityService] Iniciando eventos de monitoreo.');
    this.resetTimeout();
    window.addEventListener('keypress', this.resetTimeout.bind(this));
  }

  stopMonitoring() {
    if (!this.isMonitoring) return; // Evitar detener si ya está detenido
    this.isMonitoring = false;
    console.log('[InactivityService] Deteniendo eventos de monitoreo.');
    clearTimeout(this.timeoutId);
    window.removeEventListener('keypress', this.resetTimeout.bind(this));
  }

  public resetTimeout() {
    if (!this.isMonitoring) return; // No reiniciar si el monitoreo está detenido
    clearTimeout(this.timeoutId);
    console.log('[InactivityService] Temporizador reiniciado.');
    this.timeoutId = setTimeout(() => {
      // this.logoutDueToInactivity();
      this.showInactivityPopup();
    }, this.inactivityLimit);
  }

  cleanup() {
    console.log('[InactivityService] Limpiando recursos y cancelando suscripciones.');
    this.stopMonitoring(); // Detener el monitoreo
    if (this.authSubscription) {
      this.authSubscription.unsubscribe(); // Cancelar la suscripción al estado de autenticación
    }
  }

  private showInactivityPopup() {
    InactivityModalComponent.Instance.show()
  }

  public logoutDueToInactivity() {
    console.log('[InactivityService] Cerrando sesión por inactividad.');
    this.authService.logout(); // Esto actualizará automáticamente el `BehaviorSubject`
    this.stopMonitoring();
    this.cleanup();
  }

}

