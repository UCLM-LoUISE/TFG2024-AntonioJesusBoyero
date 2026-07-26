// redirect.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service'; // ajusta ruta si es necesario

@Component({
  selector: 'app-redirect',
  template: '',
})
export class RedirectComponent implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  async ngOnInit() {
    const isLoggedIn = await this.authService.isLoggedIn(); // debe devolver una promesa o booleano

    if (isLoggedIn) {
      this.router.navigate(['/estudios']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
