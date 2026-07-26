import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { EstudiosBuffer } from 'src/app/data/estudios';
import { Geolocation } from '@capacitor/geolocation';
import { NavController, ToastController, AlertController } from '@ionic/angular';
import { TareasPage } from '../../tareas/tareas.page';
import { Capacitor } from '@capacitor/core';
import {
  TipoTarea, crearCapasBaseMapa, guardarJsonExportado,
  rutaExportacionTarea, escribirJsonEnCarpeta, copiarArchivoACarpeta,
} from 'src/app/utils/utils';
import { UsuarioBuffer } from 'src/app/data/usuario';


@Component({
  selector: 'app-detalle-estudio',
  templateUrl: './detalle-estudio.page.html',
  styleUrls: ['./detalle-estudio.page.scss'],
})
export class DetalleEstudioPage {

  estudio: any;
  tareas: any[] = [];
  usuario: any
  private _seccion: string = 'tareas';
  private map!: L.Map;
  private drawnItems!: L.FeatureGroup;
  parcelasData: any
  puedoDescargarTarea: boolean = false; // Variable para controlar la disponibilidad del botón de descarga

  constructor(private router: Router, private navController: NavController, private toastController: ToastController, private alertController: AlertController) {
    const navigation = this.router.getCurrentNavigation();
    const estudioDesdeNavegacion = navigation?.extras?.state?.['estudio'];

    if (estudioDesdeNavegacion) {
      this.estudio = estudioDesdeNavegacion;
    } else {
      this.estudio = EstudiosBuffer.getEstudioDetalle();
    }

    console.log('Estudio recibido:', this.estudio);

    //seteamos la provincia en el buffer para luego tenerla en el recomendador
    EstudiosBuffer.setProvinciaEstudio(this.estudio?.data?.NuevoEstudioFormData.provincia || null);
    console.log('Provincia del estudio guardada en el buffer:', EstudiosBuffer.getProvinciaEstudio());

    this.parcelasData = this.estudio?.data?.ParcelasData || [];

    this.puedoDescargarTarea = true;

    this.usuario = UsuarioBuffer.getCorreo();
    const usuario = this.usuario?.trim().toLowerCase() ?? '';

    this.tareas = (this.estudio?.data?.TareasData ?? []).filter((tarea: any) => {
      const trabajadores = (tarea?.trabajador ?? '')
        .split(',')
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean); // por si hay comas dobles o espacios

      return trabajadores.includes(usuario);
    });

    console.log(this.tareas);


  }

  get seccion() {
    return this._seccion;
  }

  set seccion(valor: string) {
    this._seccion = valor;
    if (valor === 'zonas') {
      setTimeout(() => {
        this.initMap();
        // Esperamos un poco más para asegurarnos que el mapa se renderiza completamente
        setTimeout(() => this.centrarMapa(), 300);
      }, 100);
    }
  }

  /**
   * Centra el mapa con esta prioridad:
   * 1º encuadrar las zonas del estudio (lo que se viene a ver aquí),
   * 2º la ubicación actual, 3º el centro por defecto (Albacete).
   */
  private centrarMapa(): void {
    if (!this.map) return;

    const bounds = this.drawnItems?.getBounds();
    if (bounds && bounds.isValid()) {
      this.map.fitBounds(bounds.pad(0.2), { maxZoom: 17 });
      return;
    }

    this.obtenerUbicacionActual();
  }



  initMap(): void {
    setTimeout(() => {

      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        console.error("El contenedor del mapa no está disponible aún.");
        return;
      }

      if (this.map) {
        this.map.remove(); // Resetear el mapa si ya estaba cargado
      }
      const centro: [number, number] = [38.994349, -1.858542]; // Coordenadas de Albacete por defecto

      this.map = L.map('map', {
        center: centro,
        zoom: 13,
        zoomControl: true, // Permitir zoom pero sin edición
        dragging: true,
        doubleClickZoom: true,
        scrollWheelZoom: true
      });

      // Capas base intercambiables (satélite, topográfico, PNOA/IGN, OSM).
      const { capas, porDefecto } = crearCapasBaseMapa();
      porDefecto.addTo(this.map);
      L.control.layers(capas, undefined, {
        position: 'topright',
        collapsed: true,
      }).addTo(this.map);


      // Configurar el icono del marcador manualmente
      const DefaultIcon = L.icon({
        iconUrl: 'assets/leaflet/images/marker-icon.png',
        shadowUrl: 'assets/leaflet/images/marker-shadow.png',
        iconSize: [25, 41], // Tamaño del icono
        iconAnchor: [12, 41], // Punto del icono que se coloca en la coordenada
        popupAnchor: [1, -34], // Punto donde se despliega el popup
        shadowSize: [41, 41], // Tamaño de la sombra
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      this.drawnItems = new L.FeatureGroup();
      this.map.addLayer(this.drawnItems);

      this.cargarFiguras();
    }, 100);

    // this.obtenerUbicacionActual();
  }

  cargarFiguras(): void {
    if (!this.parcelasData || !this.drawnItems) return;

    this.parcelasData.features.forEach((feature: any) => {
      // Convertir coordenadas si vienen en formato incorrecto (lat/lng en objetos)
      if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates.length > 0) {
        if (typeof feature.geometry.coordinates[0] === 'object' && 'lat' in feature.geometry.coordinates[0]) {
          feature.geometry.coordinates = [
            feature.geometry.coordinates.map((coord: { lng: any; lat: any; }) => [coord.lng, coord.lat])
          ];
        }
      }

      if (feature.geometry.type === 'Point' && feature.properties.radius) {
        const circle = L.circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
          radius: feature.properties.radius,
          color: '#ff0000',
        });

        if (feature.properties.name) {
          circle.bindPopup(feature.properties.name);
        }

        this.drawnItems.addLayer(circle);
      } else if (feature.geometry.type === 'LineString') {
        // 🔹 Es una polyline -> Convertir correctamente las coordenadas
        const latlngs = feature.geometry.coordinates.map((coord: any) => [coord.lat, coord.lng]);

        const polyline = L.polyline(latlngs, { color: '#0000FF', weight: 3 });

        if (feature.properties.name) {
          polyline.bindPopup(feature.properties.name);
        }

        polyline.feature = feature;

        this.drawnItems?.addLayer(polyline);
      } else {
        const layer = L.geoJSON(feature, {
          onEachFeature: (f, l) => {
            if (f.properties && f.properties.name) {
              l.bindPopup(f.properties.name);
            }
          },
        }).getLayers()[0];

        // console.log("Layer que se va a añadir:", layer);
        this.drawnItems.addLayer(layer);
      }
    });

    // console.log(this.drawnItems.getLayers().length);
  }

  async obtenerUbicacionActual() {
    try {
      // ✅ Paso 1: Verifica si tienes permiso
      const permStatus = await Geolocation.checkPermissions();

      if (permStatus.location !== 'granted') {
        // ❗ Si no está concedido, lo pedimos
        const reqStatus = await Geolocation.requestPermissions();
        if (reqStatus.location !== 'granted') {
          console.warn('Permiso de ubicación no concedido');
          return;
        }
      }

      // ✅ Paso 2: Ya con permiso, obtenemos la ubicación
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      });

      const { latitude, longitude } = position.coords;

      const myLocationIcon = L.divIcon({
        html: `<div style="
          width: 22px;
          height: 22px;
          background-color: rgba(0, 123, 255, 0.8);
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0, 123, 255, 0.8);
        "></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([latitude, longitude], { icon: myLocationIcon })
        .bindPopup('Tu ubicación')
        .addTo(this.map);

      this.map.setView([latitude, longitude], 15);
      console.log('Ubicación actual:', latitude, longitude);

    } catch (error) {
      console.error('Error al obtener la ubicación:', error);
    }
  }


  empezarTarea(tarea: any) {
    EstudiosBuffer.setTarea(tarea);
    this.navController.navigateForward('/tareas');
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

  //TERMINAR DE MODIFICAR HAY QUE AÑADIR LA VALIDACION DE QUE TAREA ES PARA DESCARGAR UNA COSA O OTRA
  async descargarTarea(tarea: any) {
    if (!TareasPage.instance) return;

    const nombreTarea = tarea.nombreTarea || 'tarea';
    let datos: any[] | undefined;
    let tipoLabel = '';

    switch (tarea.tipoTarea) {
      case TipoTarea.MedicionArbolado:
        datos = tarea.data;
        tipoLabel = 'árboles';
        break;
      case TipoTarea.MedicionSotobosque:
        datos = tarea.data;
        tipoLabel = 'registros de sotobosque';
        break;
      default:
        this.presentToast('Tipo de tarea no soportado');
        return;
    }

    if (!datos || datos.length === 0) {
      this.presentToast(`No hay ${tipoLabel} para descargar`);
      return;
    }
    console.log(datos);

    // Función para realizar la descarga con el momento seleccionado
    const realizarDescarga = async (momentoSeleccionado: string = '') => {
      const idTarea = tarea.id;
      const tareaKey = `ParcelasDataTarea_${idTarea}`;
      let mapa = EstudiosBuffer.getEstudioDetalle();
      mapa = mapa?.data?.[tareaKey] || mapa.data?.ParcelasData || [];
      console.log('Mapa de parcelas:', mapa);

      const adjuntos = tarea?.multimedia?.adjuntos || [
        ...(tarea?.audios || []),
        ...(tarea?.imagenes || [])
      ];

      const multimedia = {
        adjuntos,
        resumen: {
          total: adjuntos.length,
          audios: adjuntos.filter((a: any) => (a.tipo || 'audio') === 'audio').length,
          imagenes: adjuntos.filter((a: any) => a.tipo === 'imagen').length
        }
      };

      const contenidoExportado = {
        datos,
        mapa,
        multimedia,
        nombreUsuario: UsuarioBuffer.getCorreo() || 'Desconocido',
        momento: momentoSeleccionado || 'Sin momento'
      };
      const jsonContent = JSON.stringify(contenidoExportado, null, 2);
      console.log('Contenido JSON a guardar:', jsonContent);

      // Incluir el momento en el nombre del archivo si existe
      const momentoParte = momentoSeleccionado
        ? `_${momentoSeleccionado.replace(/\s+/g, '_')}`
        : '';
      const fileName = `${nombreTarea.replace(/\s+/g, '_')}${momentoParte}.json`;

      // En web: descarga normal del navegador
      if (Capacitor.getPlatform() === 'web') {
        try {
          const destino = await guardarJsonExportado(fileName, jsonContent);
          this.presentToast(destino);
        } catch (error: any) {
          console.error('Error al guardar tarea:', error);
          this.presentToast(`Error al guardar la tarea: ${error?.message || error}`);
        }
        return;
      }

      // En el móvil: exportar el paquete completo (JSON + audios + fotos) a
      // Descargas/TerrApp/<Estudio>/<Tarea>/<Momento>. Los nombres repetidos
      // se numeran (2), (3)... sin machacar exportaciones anteriores.
      try {
        const nombreEstudio = this.estudio?.data?.NuevoEstudioFormData?.nombre || 'Estudio';
        const carpeta = rutaExportacionTarea(nombreEstudio, nombreTarea, momentoSeleccionado || undefined);

        await escribirJsonEnCarpeta(carpeta, fileName, jsonContent);

        // Copiar los adjuntos (audios y fotos) de la tarea a la misma carpeta
        let copiados = 0;
        const fallidos: string[] = [];
        for (const adjunto of adjuntos) {
          const nombreAdjunto = adjunto.nombre || adjunto.name;
          if (!nombreAdjunto || !adjunto.path) continue;
          try {
            await copiarArchivoACarpeta(carpeta, nombreAdjunto, adjunto.path);
            copiados++;
          } catch (e) {
            console.error(`No se pudo copiar el adjunto ${nombreAdjunto}:`, e);
            fallidos.push(nombreAdjunto);
          }
        }

        let mensaje = `Tarea exportada a ${carpeta.replace('Download/', 'Descargas/')}`;
        if (copiados > 0) mensaje += ` con ${copiados} adjunto(s)`;
        if (fallidos.length > 0) mensaje += `; fallaron ${fallidos.length} (p. ej. ${fallidos[0]})`;
        this.presentToast(mensaje);
      } catch (error: any) {
        console.error('Error al guardar tarea:', error);
        this.presentToast(`Error al guardar la tarea: ${error?.message || error}`);
      }
    };

    // Verificar si la tarea tiene momentos definidos
    if (tarea.tieneMomentos && tarea.momentos) {
      const momentosDisponibles = Object.keys(tarea.momentos);

      if (momentosDisponibles.length > 0) {
        // Mostrar selector de momentos antes de descargar
        const alert = await this.alertController.create({
          header: 'Seleccionar Momento',
          message: '¿En qué momento se realizó esta tarea?',
          inputs: momentosDisponibles.map(momento => ({
            type: 'radio',
            label: momento,
            value: momento,
            checked: false
          })),
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel'
            },
            {
              text: 'Descargar',
              handler: (momentoSeleccionado) => {
                if (momentoSeleccionado) {
                  realizarDescarga(momentoSeleccionado);
                  return true; // Permite que se cierre el alert
                } else {
                  this.presentToast('Debes seleccionar un momento');
                  return false; // Previene que se cierre el alert
                }
              }
            }
          ]
        });

        await alert.present();
      } else {
        // No hay momentos, descargar directamente
        await realizarDescarga();
      }
    } else {
      // Tarea sin momentos, descargar directamente
      await realizarDescarga();
    }
  }




}



