import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { BackService } from './back.service';
import { UserData } from '../data/user-data';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user$: Observable<any>;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private userRolSubject = new BehaviorSubject<string | null>(null);
  public userRol$ = this.userRolSubject.asObservable();


  constructor(private afAuth: AngularFireAuth, private router: Router, private backService: BackService) {
    this.user$ = this.afAuth.authState;

    // Restaurar los datos del usuario en caso de recarga
    this.afAuth.authState.subscribe(user => {

      const isAuthenticated = !!user;
      this.isAuthenticatedSubject.next(isAuthenticated); // Actualizar el estado de autenticación

      if (user) {
        UserData.setUserEmail(user.email as string);
        this.getUserData(user.email as string).catch(error => {
          console.error('Error al restaurar los datos del usuario:', error);
          this.logout(); // Si no se pueden restaurar los datos, cierra la sesión
        });
      }

      const cachedRol = UserData.getUserRol?.();
      if (cachedRol) this.userRolSubject.next(cachedRol);
    });
  }


  public getUserData(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.backService.obtenerUsuarioPorEmail(email).subscribe({
        next: (userData) => {
          UserData.setUserData(userData);
          UserData.setUserName(userData.nombre);
          UserData.setUserRol(userData.rol);
          this.userRolSubject.next(userData.rol);
          resolve();
        },
        error: (error) => {
          console.error('Error al obtener los datos del usuario:', error);
          reject(error);
        }
      });
    });
  }



  logout(): void {
    this.afAuth.signOut().then(() => {
      this.isAuthenticatedSubject.next(false); // Actualizar el estado a no autenticado
      this.router.navigate(['/home']);
    });
  }

  isLoggedIn(): Observable<boolean> {
    return this.isAuthenticated$; // Retornar el observable del BehaviorSubject
  }

  resetPassword(email: string): Promise<void> {
    return this.afAuth.sendPasswordResetEmail(email);
  }

  // Método para obtener el token actual del usuario
  async getUserToken(): Promise<string | null> {
    const user = await this.afAuth.currentUser;
    return user ? await user.getIdToken() : null;
  }

  // ✅ MÉTODO ACTUALIZADO
  async login(email: string, password: string): Promise<void> {
    try {
      // 1) Login
      await this.afAuth.signInWithEmailAndPassword(email, password);

      // 2) Verificación de email
      const user = await this.afAuth.currentUser;
      await user?.reload();
      if (!user || !user.email) {
        throw new Error('auth/no-user');
      }

      if (!user.emailVerified) {
        // Enviar verificación y NO navegar
        try {
          await user.sendEmailVerification();
        } catch (e) {
          console.warn('sendEmailVerification falló:', e);
        }
        // Cerrar sesión para no dejar sesión pendiente
        await this.afAuth.signOut();
        this.isAuthenticatedSubject.next(false);

        const err: any = new Error('email_not_verified');
        err.code = 'email_not_verified';
        throw err; // El componente de login mostrará el aviso
      }

      // 3) Cargar datos de tu API (Firestore vía back)
      await this.getUserData(user.email);

      // 4) Si sigue inactivo pero ya está verificado, activarlo en tu back
      const data = UserData.getUserData();
      if (!data) {
        try {
          // await this.backService.marcarUsuarioVerificado();
          // refrescar datos locales tras activar (opcional pero recomendable)
          await this.getUserData(user.email);
        } catch (e) {
          console.warn('No se pudo marcar como verificado en back en este momento:', e);
        }
      }

      // 5) Navegar a la app según rol
      const rol = UserData.getUserRol?.(); // 'administrador' | 'investigador' | 'trabajador' | ...
      if (rol === 'administrador' || rol === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/estudios']);
      }
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      throw error;
    }
  }
}
