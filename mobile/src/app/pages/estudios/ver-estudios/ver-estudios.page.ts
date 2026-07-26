import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { BackService } from 'src/app/services/back.service';
import { UsuarioBuffer } from 'src/app/data/usuario';
import { EstudiosBuffer } from 'src/app/data/estudios';
import { Capacitor } from '@capacitor/core';
import { guardarJsonExportado, rutaExportacionEstudio, escribirJsonEnCarpeta, sanitizarNombreCarpeta } from 'src/app/utils/utils';


@Component({
  selector: 'app-ver-estudios',
  templateUrl: './ver-estudios.page.html',
  styleUrls: ['./ver-estudios.page.scss'],
})
export class VerEstudiosPage implements OnInit {

  estudios: any[] = [];
  estudiosFiltrados: any[] = [];
  spinner: boolean = false;

  meses = [
    { nombre: 'Enero', valor: '01' },
    { nombre: 'Febrero', valor: '02' },
    { nombre: 'Marzo', valor: '03' },
    { nombre: 'Abril', valor: '04' },
    { nombre: 'Mayo', valor: '05' },
    { nombre: 'Junio', valor: '06' },
    { nombre: 'Julio', valor: '07' },
    { nombre: 'Agosto', valor: '08' },
    { nombre: 'Septiembre', valor: '09' },
    { nombre: 'Octubre', valor: '10' },
    { nombre: 'Noviembre', valor: '11' },
    { nombre: 'Diciembre', valor: '12' },
  ];

  mesSeleccionado = '';

  constructor(private estudiosService: BackService, private toastController: ToastController,
    private alertController: AlertController, private router: Router) { }

  ngOnInit() {
    const estudiosLocales = EstudiosBuffer.getEstudios();

    if (estudiosLocales && estudiosLocales.length > 0) {
      // Ya hay estudios en memoria (posiblemente con datos de tareas guardados
      // localmente): NO se vuelve a llamar al back para no machacarlos.
      // Para traer datos frescos del servidor está el botón "Sincronizar".
      console.log('📦 Estudios cargados desde el buffer local (sin llamar al back)');
      this.estudios = estudiosLocales;
      this.filtrarEstudios();
      return;
    }

    // Primera vez (buffer vacío): se descargan del servidor
    this.sincronizarConBackend();
  }

  /**
   * Pide confirmación antes de sincronizar: recargar del servidor sobrescribe
   * el buffer local y se pierden los datos de tareas no descargados.
   */
  async confirmarSincronizacion() {
    const alert = await this.alertController.create({
      header: '¿Sincronizar estudios?',
      message:
        'Se descargarán de nuevo los estudios del servidor.\n\n' +
        '⚠️ Cuidado: los datos de tareas guardados en este dispositivo que no hayas ' +
        'descargado se perderán y no se podrán recuperar.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sincronizar', role: 'destructive', handler: () => this.sincronizarConBackend() },
      ],
    });
    await alert.present();
  }

  private sincronizarConBackend() {
    this.showSpinner();
    this.estudiosService.obtenerEstudiosPorTareasUsuario(UsuarioBuffer.getCorreo()).subscribe({
      next: (res) => {
        console.log(res);
        this.estudios = res;
        this.filtrarEstudios(); // Aplica filtro por mes si hay uno seleccionado
        this.hideSpinner();
        EstudiosBuffer.setEstudios(this.estudios);
      },
      error: (err) => {
        console.error('Error al cargar estudios:', err);
        this.hideSpinner();
        this.presentToast('No se pudieron sincronizar los estudios');
      }
    });
  }

  filtrarEstudios() {
    if (this.mesSeleccionado) {
      this.estudiosFiltrados = this.estudios.filter(e => {
        const fecha = e.data.NuevoEstudioFormData.fechaInicio;
        return fecha && fecha.split('-')[1] === this.mesSeleccionado;
      });
    } else {
      this.estudiosFiltrados = [...this.estudios];
    }

    if (this.estudiosFiltrados.length === 0) {
      this.presentToast('No hay estudios para el mes seleccionado');
    }
  }


  verDetalle(estudio: any) {
    console.log('Estudio seleccionado:', estudio);
    this.router.navigate(['/estudios/detalle-estudio'], {
      state: { estudio },
      replaceUrl: false // Permite navegación hacia atrás
    });
    EstudiosBuffer.setEstudioDetalle(estudio); // Guardar el estudio en el buffer
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'warning',
      position: 'bottom'
    });
    toast.present();
  }

  // descargarEstudioWeb(estudio: any) {
  //   const id = estudio.id;

  //   this.estudiosService.descargarEstudioPorId(id).subscribe({
  //     next: (data) => {
  //       const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement('a');
  //       a.href = url;
  //       a.download = `estudio-${id}.json`;
  //       a.click();
  //       window.URL.revokeObjectURL(url);
  //     },
  //     error: (err) => {
  //       console.error('Error al descargar el estudio:', err);
  //       this.presentToast('Error al descargar el estudio');
  //     }
  //   });
  // }

  async descargarEstudio(estudio: any) {
    const id = estudio.id;

    this.estudiosService.descargarEstudioPorId(id).subscribe({
      next: async (data) => {
        const jsonContent = JSON.stringify(data, null, 2);
        // Nombre legible: "estudio - <nombre> - <id>.json" (el id se mantiene
        // como referencia; la importación lee el id de dentro del JSON)
        const nombreEstudio = estudio?.data?.NuevoEstudioFormData?.nombre || '';
        const fileName = nombreEstudio
          ? `estudio - ${sanitizarNombreCarpeta(nombreEstudio)} - ${id}.json`
          : `estudio-${id}.json`;

        try {
          if (Capacitor.getPlatform() === 'web') {
            // En web: descarga normal del navegador
            const destino = await guardarJsonExportado(fileName, jsonContent);
            this.presentToast(destino);
          } else {
            // En el móvil: a la carpeta del estudio en Descargas/TerrApp,
            // numerando (2), (3)... si ya existe
            const carpeta = rutaExportacionEstudio(nombreEstudio || `estudio-${id}`);
            const nombreFinal = await escribirJsonEnCarpeta(carpeta, fileName, jsonContent);
            this.presentToast(`Guardado en ${carpeta.replace('Download/', 'Descargas/')} como ${nombreFinal}`);
          }
        } catch (error: any) {
          console.error('Error al guardar archivo:', error);
          this.presentToast(`Error al guardar el archivo: ${error?.message || error}`);
        }
      },
      error: (err) => {
        console.error('Error al descargar el estudio:', err);
        this.presentToast('Error al descargar el estudio');
      }
    });
  }

  showSpinner() {
    this.spinner = true;
  }

  hideSpinner() {
    setTimeout(() => {
      this.spinner = false;
    }, 2000);
  }



}
