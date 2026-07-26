import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NoAuthGuard implements CanActivate {
  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.afAuth.authState.pipe(
      take(1),
      map(user => {
        // Si hay usuario autenticado -> redirigimos (no dejamos entrar al Home)
        if (user) {
          console.log('[NoAuthGuard] Usuario autenticado. Redirigiendo a /estudios');
          return this.router.createUrlTree(['/estudios']);
        }
        // Si NO hay usuario -> permitimos acceder al Home (Landing)
        return true;
      })
    );
  }
}
