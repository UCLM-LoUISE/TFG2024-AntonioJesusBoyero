import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.afAuth.authState.pipe(
      map(user => !!user), // Si hay usuario, devuelve true
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          this.router.navigate(['/home']); // Redirige al home si no hay usuario
        }
      })
    );
  }
}
