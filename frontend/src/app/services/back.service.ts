import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Estado, Rol, Usuario } from '../interfaces/usuario.model';


@Injectable({
  providedIn: 'root'
})
export class BackService {

  // private productionUrl = 'http://localhost:3000';
  private productionUrl = 'https://tfg-terr-app-back.vercel.app';

  constructor(private http: HttpClient, private afAuth: AngularFireAuth) { }

  // #region Utils

  private async authHeaders(): Promise<HttpHeaders> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) throw new Error('Usuario no autenticado');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // #endregion Utils

  // #region CONTROLLER USUARIOS

  obtenerUsuarioPorEmail(email: string): Observable<any> {
    return this.http.post(`${this.productionUrl}/usuarios/obtener/email`, { email });
  }

  /** POST /usuarios/investigadores-mismo-grupo  -> devuelve solo investigadores del mismo grupo (excluye al propio) */
  async obtenerInvestigadoresMismoGrupo(email: string): Promise<any[]> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/usuarios/obtener/investigadores-mismo-grupo`;
    const body = { email: (email || '').trim().toLowerCase() };

    const res = await firstValueFrom(
      this.http.post<{ ok: boolean; data: any[] }>(url, body, { headers })
    );

    return res?.ok ? (res.data || []) : [];
  }

  /** POST /usuarios/usuarios-mismo-grupo -> devuelve investigadores + trabajadores del mismo grupo (excluye al propio) */
  async obtenerUsuariosMismoGrupo(email: string): Promise<any[]> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/usuarios/obtener/usuarios-mismo-grupo`;
    const body = { email: (email || '').trim().toLowerCase() };

    const res = await firstValueFrom(
      this.http.post<{ ok: boolean; data: any[] }>(url, body, { headers })
    );

    return res?.ok ? (res.data || []) : [];
  }

  // #endregion CONTROLLER USUARIOS

  // #region CONTROLLER ADMIN

  /** GET /admin/usuarios/listar (estado ya viene desde Auth) */
  async obtenerUsuariosNoAdministradores(): Promise<Usuario[]> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/admin/usuarios/listar`;
    return await firstValueFrom(this.http.get<Usuario[]>(url, { headers }));
  }

  /** POST /admin/usuarios/crear  (devuelve { ok, uid, estado }) */
  async crearUsuario(payload: {
    email: string;
    nombre: string;
    apellidos: string;
    telefono?: string;
    rol: Rol;
    grupo?: string | null;
  }): Promise<{ ok: boolean; uid?: string; estado?: Estado; error?: string }> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/admin/usuarios/crear`;
    return await firstValueFrom(
      this.http.post<{ ok: boolean; uid?: string; estado?: Estado; error?: string }>(
        url,
        payload,
        { headers }
      )
    );
  }

  /**
   * POST /admin/usuarios/estado
   * Body: { uid?: string, email?: string, activo: boolean }
   * Cambia disabled en Auth (activo = !disabled) y devuelve estado calculado.
   */
  async actualizarEstadoUsuario(params: {
    uid?: string;
    email?: string;
    activo: boolean;
  }): Promise<{ ok: boolean; uid: string; email?: string; estado: Estado }> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/admin/usuarios/estado`;
    return await firstValueFrom(
      this.http.post<{ ok: boolean; uid: string; email?: string; estado: Estado }>(
        url,
        params,
        { headers }
      )
    );
  }

  /** POST /admin/usuarios/eliminar (por email o uid) */
  async eliminarUsuario(params: { email?: string; uid?: string }): Promise<void> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/admin/usuarios/eliminar`;
    await firstValueFrom(this.http.post<{ ok: boolean }>(url, params, { headers }));
  }

  // #endregion CONTROLLER ADMIN

  // #region  CONTROLLER GRUPOS

  /** Crear grupo */
  async crearGrupo(params: { nombre: string; id?: string }): Promise<{ ok: boolean; id: string; nombre: string; memberCount: number }> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/grupos/crear-grupo`;
    return await firstValueFrom(
      this.http.post<{ ok: boolean; id: string; nombre: string; memberCount: number }>(url, params, { headers })
    );
  }

  /** Listar grupos (puedes pasar nombre para filtrar exacto, o {} para todos) */
  async listarGrupos(params: { nombre?: string } = {}): Promise<Array<{ id: string; nombre: string; memberCount: number }>> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/grupos/listar-grupos`;
    return await firstValueFrom(
      this.http.post<Array<{ id: string; nombre: string; memberCount: number }>>(url, params, { headers })
    );
  }

  /** Borrar grupo por nombre */
  async borrarGrupo(params: { nombre: string }): Promise<{ ok: boolean; id: string; nombre: string }> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/grupos/borrar-grupo`;
    return await firstValueFrom(
      this.http.post<{ ok: boolean; id: string; nombre: string }>(url, params, { headers })
    );
  }

  // #endregion CONTROLLER GRUPOS

  // #region CONTROLLER TAREAS

  async obtenerEstudiosPorTareasUsuario(email: string): Promise<Observable<any>> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) {
      throw new Error('User is not authenticated');
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.productionUrl}/getEstudiosPorTareasUsuario`, { email }, { headers });
  }

  async obtenerEstudioPorIdParaUsuario(idEstudio: string, emailUsuario: string): Promise<any> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) {
      throw new Error('User is not authenticated');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return firstValueFrom(this.http.post(`${this.productionUrl}/getEstudioPorIdParaUsuario`, { idEstudio, emailUsuario }, { headers }));
  }


  //Actualizar los permisos de un estudio existente
  async subirArchivosTarea(
    idEstudio: string,
    idTarea: string,
    archivos: any[],
    emailUsuario: any,
    momento: string | null = null // 🆕 Parámetro opcional para momento
  ): Promise<Observable<any>> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;

    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = {
      idEstudio,
      idTarea,
      archivos,
      emailUsuario,
      momento // 🆕 Incluir momento en el payload
    };

    return this.http.post(`${this.productionUrl}/guardar-archivos-tarea`, payload, { headers });
  }

  async eliminarArchivoTarea(
    idEstudio: string,
    idTarea: string,
    nombreArchivo: string,
    momento: string | null = null // 🆕 Parámetro opcional para momento
  ): Promise<void> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) throw new Error('Usuario no autenticado');

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const body = {
      idEstudio,
      idTarea,
      nombreArchivo,
      momento // 🆕 Incluir momento
    };

    await firstValueFrom(
      this.http.post<void>(`${this.productionUrl}/eliminar-archivo-tarea`, body, { headers })
    );
  }

  async leerArchivoTarea(
    idEstudio: string,
    idTarea: string,
    nombreArchivo: string,
    momento: string | null = null // 🆕 Parámetro opcional para momento
  ): Promise<any> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) throw new Error('Usuario no autenticado');

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const body = {
      idEstudio,
      idTarea,
      nombreArchivo,
      momento // 🆕 Incluir momento
    };

    return await firstValueFrom(
      this.http.post<any>(`${this.productionUrl}/leer-archivo-tarea`, body, { headers })
    );
  }

  // #endregion CONTROLLER TAREAS

  // #region CONTROLLER ESTUDIOS

  async obtenerEstudiosPorUsuario(email: string): Promise<Observable<any>> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;

    if (!token) {
      throw new Error('User is not authenticated');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.productionUrl}/getEstudios`, { email }, { headers });
  }

  async eliminarEstudio(id: any) {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;

    if (!token) {
      throw new Error('User is not authenticated');
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const body = { id };

    return this.http.post(`${this.productionUrl}/eliminar`, body, { headers });
  }

  //lo usamos en la primera parte en el formulario del estudio
  async crearEstudioPorPartes(email: any, data: any, step: string) {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) {
      throw new Error('User is not authenticated');
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const payload = { email, data, step };
    return this.http.post(`${this.productionUrl}/crearEstudio`, payload, { headers });
  }

  //lo usamos en el mapa para añadir las figuras y resumen
  async crearEstudioPorPartesZonasNew(email: any, data: any, step: string, idFormulario: any, resumenFiguras: any) {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) {
      throw new Error('User is not authenticated');
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const payload = { email, data, step, idFormulario, resumenFiguras };
    console.log('Payload enviado al backend:', payload);
    return this.http.post(`${this.productionUrl}/crearEstudioZonasNuevo`, payload, { headers });
  }

  //lo usamos para añadir las tareas
  async crearEstudioPorPartesTareas(email: any, data: any, step: string, idFormulario: any) {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) {
      throw new Error('User is not authenticated');
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const payload = { email, data, step, idFormulario };
    console.log('Payload enviado al backend:', payload);
    return this.http.post(`${this.productionUrl}/crearEstudioTareas`, payload, { headers });
  }

  //Actualizar un estudio existente
  async actualizarEstudio(id: string, data: any, step: string): Promise<Observable<any>> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) {
      throw new Error('User is not authenticated');
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const payload = { id, data, step };
    return this.http.post(`${this.productionUrl}/crearEstudio`, payload, { headers });
  }

  async cambiarEstadoEstudio(payload: any) {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) {
      throw new Error('User is not authenticated');
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.productionUrl}/cambiarEstadoEstudio`, payload, { headers });
  }

  //Actualizar los permisos de un estudio existente
  async actualizarPermisosEstudio(data: any): Promise<Observable<any>> {
    const user = await this.afAuth.currentUser;
    const token = user ? await user.getIdToken() : null;
    if (!token) {
      throw new Error('User is not authenticated');
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const payload = data;
    return this.http.post(`${this.productionUrl}/actualizarPermisosEstudio`, payload, { headers });
  }

  // #endregion CONTROLLER ESTUDIOS

  // #region CONTROLLER MOMENTOS

  /**
   * POST /momentos/verificar
   * Verifica si hay tareas afectadas antes de eliminar momentos
   */
  async verificarEliminacionMomentos(
    estudioId: string,
    esCasoCheckbox: boolean,
    momentoEspecifico: string | null = null
  ): Promise<any> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/momentos/verificar`;

    const body = esCasoCheckbox
      ? { id: estudioId, tieneMomentos: false }
      : { id: estudioId, momentoAEliminar: momentoEspecifico };

    return await firstValueFrom(
      this.http.post<any>(url, body, { headers })
    );
  }

  /**
   * POST /momentos/actualizar
   * Actualiza el formulario y limpia tareas después de confirmar
   */
  async actualizarMomentos(
    estudioId: string,
    esCasoCheckbox: boolean,
    momentoEspecifico: string | null = null
  ): Promise<any> {
    const headers = await this.authHeaders();
    const url = `${this.productionUrl}/momentos/actualizar`;

    const body = esCasoCheckbox
      ? { id: estudioId, tieneMomentos: false }
      : { id: estudioId, momentoAEliminar: momentoEspecifico };

    return await firstValueFrom(
      this.http.post<any>(url, body, { headers })
    );
  }

  // #endregion CONTROLLER MOMENTOS

}





