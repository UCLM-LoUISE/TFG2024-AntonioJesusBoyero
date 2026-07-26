import { Component, OnDestroy, OnInit } from '@angular/core';
import { UserData } from 'src/app/data/user-data';
import { EstudiosPage } from 'src/app/pages/estudios/estudios.page';
import { BackService } from 'src/app/services/back.service';

@Component({
  selector: 'app-configuracion-estudio-modal',
  templateUrl: './configuracion-estudio-modal.component.html',
  styleUrls: ['./configuracion-estudio-modal.component.css']
})
export class ConfiguracionEstudioModalComponent implements OnInit, OnDestroy {

  idEstudio: string = '';
  emailsEstudio: any[] = [];
  usuarioCreador = { nombreCompleto: '', email: '' };
  trabajadoresSeleccionados: any[] = [];
  todosLosTrabajadores: any[] = [];
  trabajadores: any[] = [];
  filtro: string = ''; // Campo para filtrar resultados
  cargandoGuardado: boolean = false;

  constructor(private backService: BackService) { }

  ngOnInit(): void {
    this.idEstudio = EstudiosPage.Instance.idConfiguracionEstudioModal;

    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.id === this.idEstudio
    );

    if (estudioSeleccionado && estudioSeleccionado.email.length > 0) {
      console.log('Estudio seleccionado:', estudioSeleccionado);
      // Asignamos el primer usuario como creador (no editable)
      this.usuarioCreador.email = estudioSeleccionado.email[0];
      this.emailsEstudio = estudioSeleccionado.email;
    }

    this.obtenerUsuarios(estudioSeleccionado?.email || []);
  }

  ngOnDestroy(): void {
    this.filtro = ''; // Limpiar el campo de búsqueda
  }


  obtenerUsuarios(correoUsuarios: string[]): void {
    this.backService.obtenerInvestigadoresMismoGrupo(this.usuarioCreador.email).then(
      (usuarios: any[]) => {
        this.todosLosTrabajadores = usuarios.map(usuario => ({
          nombreCompleto: `${usuario.nombre} ${usuario.apellidos}`,
          email: usuario.email
        }));

        // Buscar el nombre completo del usuario creador
        const creador = this.todosLosTrabajadores.find(u => u.email === this.usuarioCreador.email);
        this.usuarioCreador.nombreCompleto = creador ? creador.nombreCompleto : this.usuarioCreador.email;

        // Añadir al usuario creador a la lista de seleccionados (no editable)
        this.trabajadoresSeleccionados.push(this.usuarioCreador);

        // Agregar los otros usuarios que ya tienen permisos (se pueden eliminar)
        correoUsuarios.slice(1).forEach(email => {
          const usuario = this.todosLosTrabajadores.find(u => u.email === email);
          if (usuario) {
            this.trabajadoresSeleccionados.push(usuario);
          }
        });

        // Filtrar trabajadores disponibles para que no incluya a los ya seleccionados
        this.trabajadores = this.todosLosTrabajadores.filter(u =>
          !this.trabajadoresSeleccionados.some(t => t.email === u.email)
        );

        console.log('Trabajadores disponibles:', this.trabajadores);
        console.log('Usuario creador añadido:', this.usuarioCreador);
        console.log('Usuarios con permisos iniciales:', this.trabajadoresSeleccionados);
      }
    ).catch((error) => {
      console.error('Error al obtener los usuarios:', error);
    });
  }

  addTrabajador(trabajador: any) {
    if (trabajador && !this.trabajadoresSeleccionados.some(t => t.email === trabajador.email)) {
      this.trabajadoresSeleccionados.push(trabajador);

      // ❗ Eliminarlo de la lista de trabajadores disponibles
      this.trabajadores = this.trabajadores.filter(t => t.email !== trabajador.email);
    }
    this.filtro = ''; // Limpiar el campo de búsqueda
  }

  removeTrabajador(email: string) {
    if (email !== this.usuarioCreador.email) {
      // ❗ Recuperar el usuario eliminado en la lista de disponibles
      const trabajadorEliminado = this.trabajadoresSeleccionados.find(t => t.email === email);

      if (trabajadorEliminado) {
        this.trabajadores.push(trabajadorEliminado); // Volver a agregarlo a la lista de disponibles
      }

      this.trabajadoresSeleccionados = this.trabajadoresSeleccionados.filter(t => t.email !== email);
    }
  }

  // ✅ Getter para filtrar trabajadores en tiempo real
  get trabajadoresFiltrados() {
    if (!this.filtro) return [];
    return this.trabajadores.filter(t =>
      t.nombreCompleto.toLowerCase().includes(this.filtro.toLowerCase()) ||
      t.email.toLowerCase().includes(this.filtro.toLowerCase())
    );
  }

  async addTrabajadores() {
    const emailsNuevos = this.trabajadoresSeleccionados.map(t => t.email);
    const emailsOriginales = this.emailsEstudio; // Lista de emails antes de los cambios

    // Comprobamos si hay diferencias
    const cambiosDetectados = JSON.stringify(emailsNuevos.sort()) !== JSON.stringify(emailsOriginales.sort());

    if (!cambiosDetectados) {
      console.log("No hay cambios en los permisos, cerrando modal...");
      EstudiosPage.Instance.closeModalConfiguracionEstudio();
      return;
    }

    this.cargandoGuardado = true; // 🔹 Activar spinner antes de enviar

    // Si hay cambios, enviamos la actualización al backend
    const payload = {
      idEstudio: this.idEstudio,
      emailUser: UserData.getUserEmail(),
      emails: emailsNuevos
    };

    (await this.backService.actualizarPermisosEstudio(payload)).subscribe({
      next: (response: any) => {
        console.log("Permisos actualizados correctamente", response);
        // Buscamos el estudio en la lista y actualizamos los emails para no tener que recargar la pagina ni volver a llamar al back
        const estudioActualizado = EstudiosPage.Instance.estudios.find(e => e.id === this.idEstudio);
        if (estudioActualizado) {
          estudioActualizado.email = response.email;
        }

        setTimeout(() => {
          this.cargandoGuardado = false; // 🔹 Desactivar spinner después de guardar
          EstudiosPage.Instance.closeModalConfiguracionEstudio();
        }, 1000);
      },
      error: (error: any) => {
        console.error("Error al actualizar permisos:", error);
      }
    });
  }

}
