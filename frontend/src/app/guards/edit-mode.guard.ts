import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { EstudiosPage } from '../pages/estudios/estudios.page';

@Injectable({
  providedIn: 'root',
})
export class EditModeGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    try {
      // Comprobar si `editMode` es undefined
      if (EstudiosPage.Instance?.editMode === undefined) {
        console.log("NAVEGO A ESTUDIOS PORQUE EDIT MODE ES UNDEFINED");
        return this.router.parseUrl('/estudios'); // Redirige si es undefined
      }

      return true; // Permite la navegación en cualquier otro caso
    } catch (error) {
      console.error('Error en EditModeGuard:', error);
      return this.router.parseUrl('/estudios'); // Redirige en caso de error
    }
  }
}
