import { Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { EstudiosBuffer } from 'src/app/data/estudios';
import { Filesystem } from '@capacitor/filesystem';

@Component({
  selector: 'app-cargar-estudios',
  templateUrl: './cargar-estudios.page.html',
  styleUrls: ['./cargar-estudios.page.scss'],
})
export class CargarEstudiosPage {

  fileName = '';
  estudioCargado: boolean = false;
  estudios: any[] = [];
  /** El estudio importado actualmente (solo puede haber uno cargado). */
  estudioImportado: any = null;


  constructor(private toastController: ToastController, private alertController: AlertController,
    private router: Router, private ngZone: NgZone) { }

  ionViewWillEnter() {
    // Recuperar el estudio importado que sigue en memoria: el buffer se
    // conserva al navegar, así que se puede volver a entrar en él sin
    // reimportarlo y sin perder el trabajo de campo (clave sin conexión).
    const idImportado = EstudiosBuffer.getIdEstudioImportado();
    this.estudioImportado = idImportado
      ? EstudiosBuffer.getEstudios().find((e: any) => e.id === idImportado) || null
      : null;
  }

  abrirEstudioImportado() {
    if (!this.estudioImportado) return;
    EstudiosBuffer.setEstudioDetalle(this.estudioImportado);
    this.router.navigate(['/estudios/detalle-estudio'], { replaceUrl: false });
  }

  nombreEstudio(estudio: any): string {
    return estudio?.data?.NuevoEstudioFormData?.nombre || estudio?.id || 'Estudio';
  }

  /**
   * Aviso antes de sustituir el estudio importado actual por otro archivo:
   * lo que no se haya descargado (tareas, fotos, audios...) se pierde.
   */
  private async confirmarSustitucion(): Promise<boolean> {
    const alerta = await this.alertController.create({
      header: '¿Cargar otro estudio?',
      message:
        `Ya tienes cargado "${this.nombreEstudio(this.estudioImportado)}".\n\n` +
        '⚠️ Si cargas este archivo, se perderá cualquier información no descargada ' +
        'del estudio anterior (tareas, fotos, audios...).',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cargar de todas formas', role: 'destructive' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    return role === 'destructive';
  }

  // async onFileSelected(event: any) {
  //   const file: File = event.target.files?.[0];

  //   if (!file) {
  //     this.presentToast('No se seleccionó ningún archivo ❌', 'danger');
  //     return;
  //   }

  //   if (file.type !== 'application/json') {
  //     this.presentToast('Solo se permiten archivos .json ❌', 'danger');
  //     return;
  //   }

  //   this.fileName = file.name;
  //   console.log('✅ Archivo seleccionado:', file);
  //   console.log('📥 Leyendo archivo con FileReader...');

  //   this.ngZone.runOutsideAngular(() => {
  //     const reader = new FileReader();

  //     reader.onload = () => {
  //       // Volvemos a zone.js para actualizar Angular
  //       this.ngZone.run(() => {
  //         debugger; // 💡 útil para inspección con chrome://inspect

  //         try {
  //           console.log('📄 Resultado bruto del reader:', reader.result);

  //           const contenidoTexto = typeof reader.result === 'string' ? reader.result : '';
  //           const contenido = JSON.parse(contenidoTexto);

  //           console.log('📦 JSON parseado:', contenido);

  //           // Validación mínima
  //           if (!contenido.id || !contenido.data) {
  //             throw new Error('El archivo JSON no tiene la estructura esperada ❌');
  //           }

  //           EstudiosBuffer.setEstudioDetalle(contenido);
  //           this.presentToast('Archivo cargado correctamente ✅', 'success');

  //           this.estudioCargado = true;
  //         } catch (error) {
  //           console.error('❌ JSON inválido:', error);
  //           this.presentToast('El contenido del archivo no es válido ❌', 'danger');
  //         }
  //       });
  //     };

  //     reader.onerror = (error) => {
  //       this.ngZone.run(() => {
  //         console.error('❌ Error en FileReader:', error);
  //         this.presentToast('Error al leer el archivo ❌', 'danger');
  //       });
  //     };

  //     reader.readAsText(file);
  //   });
  // }



  async onFileSelected(event: any) {

    const file: File = event.target.files?.[0];

    if (!file) {
      this.presentToast('No se seleccionó ningún archivo ❌', 'danger');
      return;
    }

    if (file.type !== 'application/json') {
      this.presentToast('Solo se permiten archivos .json ❌', 'danger');
      return;
    }

    this.fileName = file.name;
    console.log('✅ Archivo seleccionado:', file);

    try {
      // Crear una URL temporal para leer el archivo con Capacitor Filesystem
      const fileReader = await file.text(); // esto es lo más directo y simple sin FileReader
      const contenido = JSON.parse(fileReader);

      console.log('📦 JSON parseado:', contenido);

      // Validación mínima
      if (!contenido.id || !contenido.data) {
        throw new Error('El archivo JSON no tiene la estructura esperada ❌');
      }

      // Si ya hay un estudio importado, avisar: se sustituye y lo no
      // descargado del anterior se pierde
      if (this.estudioImportado) {
        const confirmado = await this.confirmarSustitucion();
        if (!confirmado) {
          this.fileName = '';
          event.target.value = ''; // permite volver a elegir el mismo archivo
          return;
        }
      }

      this.aplicarImportacion(contenido);
      event.target.value = '';
      this.presentToast('Archivo cargado correctamente ✅', 'success');
    } catch (error) {
      console.error('❌ Error al leer el archivo JSON:', error);
      event.target.value = '';
      this.presentToast('El contenido del archivo no es válido ❌', 'danger');
    }
  }

  /** Sustituye el estudio importado anterior (si lo hay) por el nuevo. */
  private aplicarImportacion(contenido: any): void {
    const estudiosEnBuffer = EstudiosBuffer.getEstudios();

    // Quitar el importado anterior del buffer: solo se mantiene uno cargado.
    // Los estudios sincronizados del servidor no se tocan.
    const idAnterior = EstudiosBuffer.getIdEstudioImportado();
    if (idAnterior && idAnterior !== contenido.id) {
      const indiceAnterior = estudiosEnBuffer.findIndex((e: any) => e.id === idAnterior);
      if (indiceAnterior !== -1) estudiosEnBuffer.splice(indiceAnterior, 1);
    }

    // Si ya existe un estudio con el mismo id (reimportación o copia
    // sincronizada), se reemplaza; si no, se añade
    const indiceExistente = estudiosEnBuffer.findIndex((e: any) => e.id === contenido.id);
    if (indiceExistente !== -1) {
      estudiosEnBuffer[indiceExistente] = contenido;
    } else {
      estudiosEnBuffer.push(contenido);
    }
    EstudiosBuffer.setEstudios(estudiosEnBuffer);

    EstudiosBuffer.setIdEstudioImportado(contenido.id);
    EstudiosBuffer.setEstudioDetalle(contenido);
    this.estudioImportado = contenido;
    this.estudioCargado = true;
  }





  abrirEstudio() {
    this.router.navigate(['/estudios/detalle-estudio'], { replaceUrl: false });
  }

  async presentToast(message: any, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      buttons: [{ text: '✖', role: 'cancel' }]
    });
    toast.present();
  }


}
