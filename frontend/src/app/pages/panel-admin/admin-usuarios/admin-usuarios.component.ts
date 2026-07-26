import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { BackService } from 'src/app/services/back.service';
import { AuthService } from 'src/app/services/auth.service';
import { Estado, Rol, UsuarioUI } from 'src/app/interfaces/usuario.model';

@Component({
  selector: 'app-admin-usuarios',
  templateUrl: './admin-usuarios.component.html',
  styleUrls: ['./admin-usuarios.component.css']
})
export class AdminUsuariosComponent implements OnInit {
  loading = false;
  creating = false;
  // Datos usuarios
  usuarios: UsuarioUI[] = [];
  filtrados: UsuarioUI[] = [];
  // Búsqueda / filtros usuarios
  search = '';
  filtroRol: '' | Rol = '';
  filtroGrupo = '';
  // Paginación usuarios (client-side)
  currentPage = 1;
  rowsPerPage = 5;
  totalPages = 1;
  pageData: UsuarioUI[] = [];
  gruposDisponibles: any;
  // Form crear usuario
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    nombre: ['', Validators.required],
    apellidos: ['', Validators.required],
    telefono: [''],
    rol: ['investigador' as Rol, Validators.required],
    grupo: ['']
  });

  constructor(
    private fb: FormBuilder,
    private back: BackService,
    private auth: AuthService
  ) { }

  ngOnInit() {
    this.cargarUsuarios();
  }

  aplicarFiltros() {
    const s = this.search.trim().toLowerCase();
    this.filtrados = this.usuarios.filter(u => {
      const okSearch =
        !s ||
        (u.email?.toLowerCase().includes(s)) ||
        (`${u.nombre} ${u.apellidos}`.toLowerCase().includes(s)) ||
        (u.telefono || '').toLowerCase().includes(s) ||
        (u.grupo || '').toLowerCase().includes(s);
      const okRol = !this.filtroRol || u.rol === this.filtroRol;
      const okGrupo = !this.filtroGrupo || u.grupo === this.filtroGrupo;
      return okSearch && okRol && okGrupo;
    });
    this.currentPage = 1;
    this.recalcularPaginacion();
  }

  recalcularPaginacion() {
    this.totalPages = Math.max(1, Math.ceil(this.filtrados.length / this.rowsPerPage));
    this.actualizarPagina();
  }

  actualizarPagina() {
    const start = (this.currentPage - 1) * this.rowsPerPage;
    const end = start + this.rowsPerPage;
    this.pageData = this.filtrados.slice(start, end);
  }

  siguiente() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.actualizarPagina();
    }
  }

  anterior() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.actualizarPagina();
    }
  }

  async invitar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.creating = true;
    this.form.disable();
    try {
      const payload = this.form.getRawValue();
      const dto = {
        email: String(payload.email).trim().toLowerCase(),
        nombre: payload.nombre ?? '',
        apellidos: payload.apellidos ?? '',
        telefono: payload.telefono || '',
        rol: (payload.rol as Rol) ?? 'investigador',
        grupo: payload.grupo ? payload.grupo : null
      };
      const resp = await this.back.crearUsuario(dto);
      if (!resp?.ok) throw new Error(resp?.error || 'backend_error');
      await this.auth.resetPassword(dto.email);
      await this.cargarUsuarios();
      this.form.reset({ rol: 'investigador' });
    } catch (e: any) {
      console.error(e);
      alert(this.mensajeDeError(e?.error || e?.message));
    } finally {
      this.form.enable();
      this.creating = false;
    }
  }

  async borrarUsuario(u: UsuarioUI) {
    if (!confirm('¿Estás seguro de que quieres borrar este usuario?')) return;
    if (u.loadingAccion) return;
    u.loadingAccion = 'borrar';
    try {
      await this.back.eliminarUsuario({ email: u.email });
      await this.cargarUsuarios();
    } catch (e) {
      console.error(e);
      alert('No se pudo borrar el usuario.');
    } finally {
      u.loadingAccion = null;
    }
  }

  async toggleEstado(u: UsuarioUI) {
    if (u.loadingAccion) return;
    u.loadingAccion = 'estado';
    try {
      const activoDeseado = u.estado !== 'activo';
      const resp = await this.back.actualizarEstadoUsuario({
        email: u.email,
        activo: activoDeseado
      });
      if (resp?.ok) {
        u.estado = resp.estado;
      } else {
        throw new Error('backend_error');
      }
    } catch (e) {
      console.error(e);
      alert('No se pudo cambiar el estado.');
    } finally {
      u.loadingAccion = null;
    }
  }

  async cargarUsuarios() {
    this.loading = true;
    try {
      // Cargamos usuarios + catálogo de grupos en paralelo
      const [lista, _] = await Promise.all([
        this.back.obtenerUsuariosNoAdministradores() ?? [],
        this.cargarGruposDisponibles()
      ]);

      this.usuarios = (lista as any[]).map(u => {
        const ts: any = (u as any).fechaCreacion;
        let fecha: Date | null = null;
        if (ts) {
          if (typeof ts === 'string' || typeof ts === 'number') fecha = new Date(ts);
          else if (typeof ts?.toDate === 'function') fecha = ts.toDate();
          else if (typeof ts?.seconds === 'number') fecha = new Date(ts.seconds * 1000);
          else if (typeof ts?._seconds === 'number') fecha = new Date(ts._seconds * 1000);
        }
        return { ...u, fechaCreacion: fecha } as any;
      });

      // 👇 ya NO construimos grupos desde usuarios
      this.aplicarFiltros();
    } catch (e) {
      console.error(e);
      this.usuarios = [];
      this.aplicarFiltros();
    } finally {
      this.loading = false;
    }
  }

  private async cargarGruposDisponibles(): Promise<void> {
    const lista = await this.back.listarGrupos(); // POST /grupos/listar-grupos
    this.gruposDisponibles = (lista ?? [])
      .map(g => g?.nombre?.trim())
      .filter((g: string) => !!g && g.length > 0)
      .sort((a: string, b: string) => a.localeCompare(b));

    // Si el filtro actual apunta a un grupo que ya no existe, lo reseteamos
    if (this.filtroGrupo && !this.gruposDisponibles.includes(this.filtroGrupo)) {
      this.filtroGrupo = '';
    }
  }

  mensajeDeError(codigo: string) {
    switch (codigo) {
      case 'email_already_in_use':
      case 'email_already_in_use_auth':
        return 'Ese correo ya está en uso.';
      case 'missing_fields':
        return 'Faltan campos obligatorios.';
      default:
        return 'Se produjo un error. Inténtalo de nuevo.';
    }
  }

  badgeClass(estado: Estado) {
    return estado === 'activo' ? 'badge bg-success' : 'badge bg-secondary';
  }
}
