import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { InactivityService } from './services/inactivity.service';
import { AuthService } from './services/auth.service';
import { filter, startWith, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'tfg';
  adminBg = false; // ⬅️ nuevo

  constructor(
    private router: Router,
    private inactivityService: InactivityService,
    private auth: AuthService
  ) { }

  ngOnInit() {
    console.log('[AppComponent] ngOnInit: Iniciando monitoreo de inactividad.');
    this.inactivityService.initialize();

    // ⬅️ Fondo admin SOLO si ruta es /admin y rol === 'administrador'
    const route$ = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith({ url: this.router.url } as any), // valor inicial
      map((e: any) => e.url as string)
    );

    combineLatest([route$, this.auth.userRol$]) // userRol$ lo añadimos antes
      .pipe(
        map(([url, rol]) => url.startsWith('/admin') && rol === 'administrador')
      )
      .subscribe(show => {
        this.adminBg = !!show;
      });
  }

  shouldDisplayLayout() {
    return this.router.url !== '/reset-password' && this.router.url !== '/home';
  }
}
