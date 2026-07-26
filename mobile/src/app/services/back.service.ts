import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BackService {

  // private productionUrl = 'http://localhost:3000';
  private productionUrl = 'https://tfg-terr-app-back.vercel.app';

  constructor(private http: HttpClient) { }

  obtenerEstudiosPorTareasUsuario(email: string): Observable<any> {
    return this.http.post(`${this.productionUrl}/getEstudiosPorTareasUsuario`, { email });
  }

  descargarEstudioPorId(id: string) {
    return this.http.post(`${this.productionUrl}/descargar`, { id });
  }

}
