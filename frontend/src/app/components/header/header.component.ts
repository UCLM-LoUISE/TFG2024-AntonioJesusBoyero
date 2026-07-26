import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { UserData } from 'src/app/data/user-data';
import { AuthService } from 'src/app/services/auth.service';
import { InactivityService } from 'src/app/services/inactivity.service';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  userName: string | null = null;
  isDropdownVisible = false;

  constructor(private authService: AuthService, private router: Router, private inactivityService: InactivityService) { }

  ngOnInit() {
    UserData.getUserName().subscribe(name => {
      this.userName = name;
    });
  }

  toggleDropdown() {
    this.isDropdownVisible = !this.isDropdownVisible;
  }

  logout() {
    this.authService.logout();
    this.inactivityService.stopMonitoring();
  }

  goHome() {
    if (ZonasEstudioMuestreosPage.instance == undefined){
      this.router.navigate(['/estudios']);
      return
    }
    if (ZonasEstudioMuestreosPage.instance.cambioFigurasEnElMapa) {
      ZonasEstudioMuestreosPage.instance.showModalnoHasGuardado();
    } else {
      this.router.navigate(['/estudios']);
    }
  }

  goToProfile() {
    this.router.navigate(['/perfil']);
  }

}
