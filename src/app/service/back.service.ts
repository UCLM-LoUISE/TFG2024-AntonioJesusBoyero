import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BackService {

  private apiUrl = 'http://localhost:3000/usuarios/addUser';
  private enviarEstudioBack = 'http://localhost:3000/api/estudios'; // Ajuste de la ruta

  constructor(private http: HttpClient) { }

  registrarUsuario(usuario: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, usuario);
  }

  enviarEstudio(estudioData: any): Observable<any> {
    return this.http.post(this.enviarEstudioBack, estudioData);
  }
}
