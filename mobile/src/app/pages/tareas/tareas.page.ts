import { Component, EventEmitter, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AlertController, NavController, Platform, ToastController } from '@ionic/angular';
import { EstudiosBuffer } from 'src/app/data/estudios';
import { Media, MediaObject } from '@awesome-cordova-plugins/media/ngx';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Geolocation } from '@capacitor/geolocation';
import { DeviceOrientation } from '@awesome-cordova-plugins/device-orientation/ngx';
import * as L from 'leaflet';
import 'leaflet-draw';
import { TipoTarea, crearCapasBaseMapa, copiarArchivoACarpeta, rutaExportacionTarea } from 'src/app/utils/utils';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Subscription } from 'rxjs';
import { SpeciesScoreService } from 'src/app/services/species-score.service';

type TipoAdjunto = 'audio' | 'imagen';

interface AdjuntoMultimedia {
  id: string;
  tipo: TipoAdjunto;
  nombre: string;
  path: string;
  fechaCreacion: string;
  entidadNombre?: string;
  entidadTipo?: 'arbol' | 'sotobosque' | 'normal';
  pendienteSubida: boolean;
}

@Component({
  selector: 'app-tareas',
  templateUrl: './tareas.page.html',
  styleUrls: ['./tareas.page.scss'],
})
export class TareasPage implements OnInit {

  public static instance: TareasPage;

  tarea: any;
  tipoTarea: TipoTarea = TipoTarea.MedicionArbolado;
  idTarea: any

  estudio: any;
  idEstudio: any;

  private recording: MediaObject | null = null;
  private filePath: string = '';
  audios: { name: string; path: string }[] = [];
  imagenes: AdjuntoMultimedia[] = [];
  multimediaAdjuntos: AdjuntoMultimedia[] = [];
  showAudios: boolean = true

  //atributos para el mapa y figuras
  private map!: L.Map;
  private drawnItems!: L.FeatureGroup;
  parcelasData: any;

  isRecording: boolean = false;
  modalAbierto: boolean = false;

  private locationMarker: L.Marker | null = null;
  private orientationMarker: L.Marker | null = null;
  private watchId: any = null;
  modalInfoAbierto = false;

  //Formulario de meducion del arbolado
  eventoFormularioArbolado = new EventEmitter<any>();
  modalFormularioArboladoAbierto = false;
  hayArboles: boolean = false;
  arboles: any[] = [];
  arbolActualNombre: any = '';

  //Formulario de meducion del sotobosque
  eventoFormularioSotobosque = new EventEmitter<any>();
  modalFormularioSotobosqueAbierto = false;
  haySotobosque: boolean = false;
  sotobosque: any[] = [];
  sotobosqueActualNombre: any = '';


  //Para calcular transectos
  circulos: any[] = [];
  private headingActual: number = 0;

  //Suscripción al botón/gesto de retroceso de Android
  private backButtonSub?: Subscription;

  //Temporizador del autoguardado (debounce)
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Los transectos solo se calculan en tareas de sotobosque. */
  get esTareaSotobosque(): boolean {
    return this.tipoTarea === TipoTarea.MedicionSotobosque;
  }

  constructor(private platform: Platform, private toastController: ToastController, private media: Media,
    private file: File, private alertController: AlertController, private deviceOrientation: DeviceOrientation,
    private androidPermissions: AndroidPermissions, private navCtrl: NavController,
    private speciesScoreService: SpeciesScoreService) { TareasPage.instance = this; }

  ngOnInit() {
    this.estudio = EstudiosBuffer.getEstudioDetalle();
    this.idEstudio = this.estudio.id;
    console.log('Estudio recibido:', this.estudio);
    this.tarea = EstudiosBuffer.getTarea();
    this.tipoTarea = this.tarea.tipoTarea;
    this.idTarea = this.tarea.id;
    console.log('Tarea recibida:', this.tarea);

    // Puntuaciones del recomendador de especies: compartidas entre las tareas
    // del mismo estudio (misma zona, especies parecidas) pero separadas por
    // tipo (arbolado y sotobosque son estratos con flora distinta)
    this.speciesScoreService.setContexto(this.idEstudio, this.tipoTarea);

    // Buscar datos específicos para esta tarea
    const tareaKey = `ParcelasDataTarea_${this.idTarea}`;
    this.parcelasData = this.estudio?.data?.[tareaKey] || this.estudio?.data?.ParcelasData || [];

    this.tengoDatosParaEstaTarea();
    this.cargarMultimedia();
    setTimeout(() => {
      this.initMap();
      // Esperamos un poco más para asegurarnos que el mapa se renderiza completamente
      setTimeout(() => this.iniciarSeguimientoUbicacion(), 300);
    }, 100);
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }

  async mostrarDialogoNombreFigura(): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Nueva figura',
        message: 'Introduce un nombre para esta figura:',
        inputs: [
          {
            name: 'nombre',
            type: 'text',
            placeholder: 'Nombre de la figura'
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(null)
          },
          {
            text: 'Guardar',
            handler: data => resolve(data.nombre)
          }
        ]
      });

      await alert.present();
    });
  }

  /**
   * Comprueba si ya existe un árbol / transecto con ese nombre (ignorando
   * mayúsculas y espacios), para no permitir duplicados.
   */
  private nombreEntidadDuplicado(tipo: 'arbol' | 'sotobosque', nombre: string): boolean {
    const lista = tipo === 'arbol' ? this.arboles : this.sotobosque;
    const clave = nombre.trim().toLowerCase();
    return lista.some((e) => (e.nombre || '').trim().toLowerCase() === clave);
  }

  /**
   * Pide el nombre del marcador y, si es un árbol o transecto, repite la
   * petición mientras el nombre ya exista. Devuelve null si se cancela.
   */
  async pedirNombreMarcadorUnico(tipo: 'normal' | 'arbol' | 'sotobosque'): Promise<string | null> {
    while (true) {
      const nombre = (await this.mostrarDialogoNombreFigura())?.trim() || null;
      if (!nombre) return null; // cancelado o vacío

      if (tipo === 'normal' || !this.nombreEntidadDuplicado(tipo, nombre)) {
        return nombre;
      }

      const etiqueta = tipo === 'arbol' ? 'un árbol' : 'un transecto';
      const aviso = await this.alertController.create({
        header: 'Nombre duplicado',
        message: `Ya existe ${etiqueta} llamado "${nombre}".\n\nElige otro nombre.`,
        buttons: ['Entendido'],
      });
      await aviso.present();
      await aviso.onDidDismiss();
    }
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
        this.circulos.push(circle);

      } else if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates;
        const latlng: [number, number] = [coords[1], coords[0]];

        let marker;

        if (feature.properties.tipo === 'arbol') {
          const arbolIcon = L.icon({
            iconUrl: 'assets/leaflet/images/arbol.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          });

          marker = L.marker(latlng, { icon: arbolIcon });
        } else if (feature.properties.tipo === 'sotobosque') {
          const sotobosqueIcon = L.icon({
            iconUrl: 'assets/leaflet/images/sotobosque.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          });

          marker = L.marker(latlng, { icon: sotobosqueIcon });
        } else {
          marker = L.marker(latlng); // marcador por defecto
        }

        if (feature.properties.name) {
          marker.bindPopup(feature.properties.name);
        }

        marker.feature = feature;

        this.drawnItems.addLayer(marker);
      }
      else if (feature.geometry.type === 'LineString') {
        // 🔹 Es una polyline -> Convertir correctamente las coordenadas
        // const latlngs = feature.geometry.coordinates.map((coord: any) => [coord.lat, coord.lng]);
        const latlngs = this.normalizarLineStringCoords(feature.geometry.coordinates);

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

  private normalizarLineStringCoords(coords: any[]): { lat: number, lng: number }[] {
    return coords.map((coord: any) => {
      if (Array.isArray(coord)) {
        // Formato GeoJSON clásico [lng, lat]
        const [lng, lat] = coord;
        return { lat, lng };
      } else if ('lat' in coord && 'lng' in coord) {
        // Ya en formato Leaflet
        return coord;
      } else {
        console.warn('Coordenada inválida en LineString:', coord);
        return null;
      }
    }).filter(Boolean); // eliminar nulos
  }

  async iniciarSeguimientoUbicacion() {
    try {
      // 1. Pedimos permisos de geolocalización si no están concedidos
      const permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        const reqStatus = await Geolocation.requestPermissions();
        if (reqStatus.location !== 'granted') {
          console.warn('Permiso de ubicación no concedido');
          return;
        }
      }

      // 2. Activamos el seguimiento de la ubicación en tiempo real
      this.watchId = Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          maximumAge: 0
        },
        (position, err) => {
          if (err) {
            console.error('Error de ubicación:', err);
            return;
          }

          if (position) {
            const { latitude, longitude } = position.coords;

            // ✅ Actualizamos o creamos el marcador azul de ubicación
            if (this.locationMarker) {
              this.locationMarker.setLatLng([latitude, longitude]);
            } else {
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

              this.locationMarker = L.marker([latitude, longitude], { icon: myLocationIcon })
                .bindPopup('Tu ubicación')
                .addTo(this.map);
            }

            // ✅ Centrar el mapa en tu ubicación cada vez que se actualice
            // this.map.setView([latitude, longitude], 16);
          }
        }
      );

      // 3. Activamos la brújula (sensor de orientación) para rotar la flecha flotante
      this.deviceOrientation.watchHeading().subscribe((data) => {
        this.headingActual = data.magneticHeading || 0;

        const flecha = document.getElementById('flecha-direccion') as HTMLElement;
        if (flecha) {
          flecha.style.transform = `translate(-50%, -50%) rotate(${this.headingActual}deg)`;
        }

        const leyenda = document.getElementById('brujula-leyenda');
        if (leyenda) {
          const dir = this.toCardinal(this.headingActual);
          leyenda.textContent = `${Math.round(((this.headingActual % 360) + 360) % 360)}° ${dir}`;
        }

      });


    } catch (error) {
      console.error('Error en seguimiento de ubicación:', error);
    }
  }

  private toCardinal(deg: number): string {
    // 8 vientos: N, NE, E, SE, S, SO, O, NO
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const d = ((deg % 360) + 360) % 360;        // normaliza
    const idx = Math.round(d / 45) % 8;
    return dirs[idx];
  }


  abrirModalAudios() {
    this.modalAbierto = true;
  }

  async preguntarTipoMarcador(): Promise<'normal' | 'arbol' | 'sotobosque' | null> {
    return new Promise(resolve => {
      const alert = document.createElement('ion-alert');
      alert.header = '¿Qué tipo de marcador deseas añadir?';

      const buttons: any[] = [
        {
          text: '📍 Normal',
          handler: () => resolve('normal')
        }
      ];

      if (this.tipoTarea === TipoTarea.MedicionArbolado) {
        buttons.push({
          text: '🌳 Árbol',
          handler: () => resolve('arbol')
        });
      } else if (this.tipoTarea === TipoTarea.MedicionSotobosque) {
        buttons.push({
          text: '🌿 Sotobosque',
          handler: () => resolve('sotobosque')
        });
      }

      buttons.push({
        text: 'Cancelar',
        role: 'cancel',
        handler: () => resolve(null)
      });

      alert.buttons = buttons;
      document.body.appendChild(alert);
      alert.present();
    });
  }

  datosFormulario(nombre?: string): Promise<any> {
    return new Promise((resolve) => {
      this.abrirFormulario();
      if (nombre) {
        if (this.tipoTarea === TipoTarea.MedicionArbolado) {
          this.arbolActualNombre = nombre;
        } else if (this.tipoTarea === TipoTarea.MedicionSotobosque) {
          this.sotobosqueActualNombre = nombre;
        }
      }
      const eventoFormulario = this.tipoTarea === TipoTarea.MedicionArbolado
        ? this.eventoFormularioArbolado
        : this.eventoFormularioSotobosque;

      const subscription = eventoFormulario.subscribe((resultado) => {
        subscription.unsubscribe(); // para evitar múltiples subscripciones
        this.cerrarFormulario();
        resolve(resultado);
      });
    });
  }

  initMap(): void {
    setTimeout(() => {

      // const arbolIcon = L.icon({
      //   iconUrl: 'assets/leaflet/images/arbol.png',
      //   iconSize: [32, 32],
      //   iconAnchor: [16, 32],
      //   popupAnchor: [0, -32]
      // });


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
        position: 'bottomright', // arriba-derecha está ocupado por la brújula
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

      // Agregar el control de dibujo después de inicializar el mapa
      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: this.drawnItems,
        },
        draw: {
          polygon: {
            allowIntersection: true, // No permitir intersección de polígonos
            shapeOptions: {
              color: '#00008B', // Cambiar el color del polígono
            },
          },
          // Cómo restringir la línea al interior del círculo (Opcional), mirarlo en gpt en el chat capas de mapas con un zoom mayor
          polyline: {
            shapeOptions: {
              color: '#0000FF',
              weight: 3
            }
          },
          rectangle: {
            shapeOptions: {
              color: '#006400', // Cambiar el color del rectángulo
            },
          },
          circle: {
            shapeOptions: {
              color: '#ff0000',
            },
          },
          marker: {
            icon: DefaultIcon,
            // icon: arbolIcon
          },
        },
      });
      this.map.addControl(drawControl);

      this.map.on(L.Draw.Event.CREATED, async (event: any) => {

        const layer = event.layer;

        let tipo = '';
        if (event.layerType === 'circle') {
          tipo = 'Círculo';
          const radius = layer.getRadius();
          const center = layer.getLatLng();

          // Mostrar el modal y esperar el nombre
          const nombre = await this.mostrarDialogoNombreFigura();

          if (nombre) {
            // Guardar las propiedades del círculo
            layer.feature = layer.feature || {};
            layer.feature.type = 'Feature';
            layer.feature.properties = layer.feature.properties || {};
            layer.feature.properties.name = nombre;
            layer.feature.properties.radius = radius; // Guardar el radio
            layer.feature.geometry = {
              type: 'Point',
              coordinates: [center.lng, center.lat], // Guardar como punto con centro
            };

            layer.bindPopup(nombre).openPopup();
            this.drawnItems?.addLayer(layer); // Añade el layer al FeatureGroup
            this.circulos.push(layer); // 👈 Añadir nuevo círculo a la lista

          }
        } else if (event.layerType === 'marker') {
          tipo = 'Punto';
          const coordinates = layer.getLatLng();

          const tipoMarcador = await this.preguntarTipoMarcador();
          if (!tipoMarcador) return;

          // Para árboles y transectos el nombre debe ser único
          const nombre = await this.pedirNombreMarcadorUnico(tipoMarcador);
          if (!nombre) return;

          // Inicializar estructura base
          const nuevoObjeto: any = {
            nombre,
            tipo: tipoMarcador,
            coordenadas: [coordinates.lng, coordinates.lat]
          };

          this.activarFormulario(tipoMarcador);
          this.guardarEntidad(tipoMarcador, nuevoObjeto);
          const resultado = await this.datosFormulario(nombre);
          if (resultado) {
            // Para árboles se guarda en 'datos', para sotobosque en 'ocurrencias'
            if (tipoMarcador === 'arbol') {
              nuevoObjeto.datos = resultado;
            } else if (tipoMarcador === 'sotobosque') {
              nuevoObjeto.ocurrencias = resultado;
            }
            console.log(`🌳 Datos guardados para ${tipoMarcador}:`, nuevoObjeto);
          } else {
            console.log('🚫 El usuario canceló el formulario');
          }

          if (nombre && tipoMarcador) {
            // Asignar el icono según el tipo
            const icono = tipoMarcador === 'arbol'
              ? L.icon({
                iconUrl: 'assets/leaflet/images/arbol.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
              })
              : tipoMarcador === 'sotobosque'
                ? L.icon({
                  iconUrl: 'assets/leaflet/images/sotobosque.png',
                  iconSize: [32, 32],
                  iconAnchor: [16, 32],
                  popupAnchor: [0, -32]
                })
                : L.icon({
                  iconUrl: 'assets/leaflet/images/marker-icon.png',
                  shadowUrl: 'assets/leaflet/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41],
                });

            layer.setIcon(icono);

            layer.feature = layer.feature || {};
            layer.feature.type = 'Feature';
            layer.feature.properties = { name: nombre, tipo: tipoMarcador };
            layer.feature.geometry = {
              type: 'Point',
              coordinates: [coordinates.lng, coordinates.lat]
            };

            layer.bindPopup(nombre).openPopup();
            this.drawnItems?.addLayer(layer);
          }
        } else if (event.layerType === 'polyline') {
          tipo = 'Línea';
          const coordinates = layer.getLatLngs().map((latlng: any) => [latlng.lng, latlng.lat]);

          // Mostrar el modal y esperar el nombre
          const nombre = await this.mostrarDialogoNombreFigura();



          if (nombre) {
            // Guardar las propiedades de la línea
            layer.feature = layer.feature || {};
            layer.feature.type = 'Feature';
            layer.feature.properties = layer.feature.properties || {};
            layer.feature.properties.name = nombre;
            layer.feature.geometry = {
              type: 'LineString',
              coordinates: coordinates, // Guardar como LineString correctamente
            };

            layer.bindPopup(nombre).openPopup();
            this.drawnItems?.addLayer(layer);

          }
        } else {
          tipo = 'Figura';
          // Mostrar el modal y esperar el nombre
          const nombre = await this.mostrarDialogoNombreFigura();



          if (nombre) {
            // Guardar las propiedades de otras figuras
            layer.feature = layer.feature || {};
            layer.feature.type = 'Feature';
            layer.feature.properties = layer.feature.properties || {};
            layer.feature.properties.name = nombre;

            layer.bindPopup(nombre).openPopup();
            this.drawnItems?.addLayer(layer);
          }
        }

        // Autoguardado tras crear cualquier figura
        this.autoGuardar();
      });

      // Autoguardado al editar figuras (mover, redimensionar...)
      this.map.on(L.Draw.Event.EDITED, () => this.autoGuardar());

      this.map.on(L.Draw.Event.DELETED, async (event: any) => {
        const layers = event.layers;

        const eliminados: any[] = [];
        layers.eachLayer((layer: any) => eliminados.push(layer));

        if (eliminados.length === 0) return;

        // Entidades (árbol / sotobosque) afectadas por el borrado del mapa
        const entidadesAfectadas = eliminados
          .map((layer) => ({
            tipo: layer.feature?.properties?.tipo,
            nombre: layer.feature?.properties?.name,
          }))
          .filter((e) => e.tipo === 'arbol' || e.tipo === 'sotobosque');

        // Aviso de confirmación antes de borrar definitivamente
        const confirmado = await this.confirmarBorradoMapa(eliminados.length, entidadesAfectadas);

        if (!confirmado) {
          // El usuario cancela -> restauramos los elementos en el mapa
          eliminados.forEach((layer) => this.drawnItems.addLayer(layer));
          return;
        }

        // Confirmado -> limpiamos círculos y los datos del formulario asociados
        eliminados.forEach((layer) => {
          const index = this.circulos.indexOf(layer);
          if (index !== -1) this.circulos.splice(index, 1);

          const tipo = layer.feature?.properties?.tipo;
          const nombre = layer.feature?.properties?.name;
          if ((tipo === 'arbol' || tipo === 'sotobosque') && nombre) {
            this.eliminarEntidadArrayPorNombre(tipo, nombre);
            if (tipo === 'arbol' && this.arbolActualNombre === nombre) this.arbolActualNombre = '';
            if (tipo === 'sotobosque' && this.sotobosqueActualNombre === nombre) this.sotobosqueActualNombre = '';
          }
        });

        this.hayArboles = this.arboles.length > 0;
        this.haySotobosque = this.sotobosque.length > 0;

        // Autoguardado tras el borrado confirmado
        this.autoGuardar();

        if (entidadesAfectadas.length > 0) {
          await this.showToast('🗑️ Elemento(s) eliminado(s) del mapa y de los datos');
        }
      });

      this.cargarFiguras();
      this.centrarMapa();
    }, 100);
  }

  /**
   * Centra el mapa con esta prioridad:
   * 1º encuadrar las figuras de la tarea (la zona de trabajo),
   * 2º la ubicación actual, 3º el centro por defecto (Albacete).
   */
  private centrarMapa(): void {
    if (!this.map) return;

    const bounds = this.drawnItems?.getBounds();
    if (bounds && bounds.isValid()) {
      this.map.fitBounds(bounds.pad(0.2), { maxZoom: 17 });
      return;
    }

    Geolocation.getCurrentPosition({ enableHighAccuracy: true })
      .then((pos) => {
        this.map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      })
      .catch(() => {
        // Sin permiso o sin señal: se mantiene el centro por defecto
      });
  }

  /**
   * Autoguardado silencioso con debounce: agrupa ráfagas de cambios (teclear en
   * el formulario, dibujar varias figuras...) en un único guardado. Todo va al
   * buffer en memoria, así que el coste es despreciable.
   */
  autoGuardar(): void {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      this.guardarZonas();
      console.log('💾 Autoguardado completado');
    }, 800);
  }

  /** Si hay un autoguardado pendiente, lo ejecuta inmediatamente. */
  private volcarAutoGuardadoPendiente(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.guardarZonas();
    }
  }

  guardarZonas() {
    if (this.drawnItems) {

      try {

        // 🔹 Asegurar que los círculos tengan la propiedad radius antes de convertir a GeoJSON
        this.drawnItems.eachLayer((layer: any) => {
          if (layer instanceof L.Circle) {
            if (!layer.feature) {
              layer.feature = { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [] } };
            }

            layer.feature.geometry.type = "Point";
            layer.feature.geometry.coordinates = [layer.getLatLng().lng, layer.getLatLng().lat];

            // 🔹 Volver a establecer el radio antes de guardar
            console.log("PRUEBA DE NOMBRE", layer.feature.properties);
            // layer.feature.properties.radius = layer.getRadius();
            layer.feature.properties.radius = layer.options.radius;
            // layer.feature.properties.name = layer.feature.properties.name || "Círculo sin nombre";
            const popup = layer.getPopup();
            layer.feature.properties.name = (popup && popup.getContent && popup.getContent()) || "Círculo sin nombre";
          }
        });

        const dataJson = this.drawnItems.toGeoJSON();
        console.log("Probando la salida antes de enviar al backend", dataJson);

        this.actualizarFigurasLocalmente(this.estudio.id, dataJson);

      } catch (error) {
        console.error('Error al guardar zonas:', error);
      }
    } else {
      console.log('No hay zonas para guardar.');
    }


    // Se guarda también con la lista vacía: si se borra el último árbol o
    // transecto, ese borrado debe persistir igualmente.
    switch (this.tipoTarea) {

      case TipoTarea.MedicionArbolado:
        this.guardarDatosTarea(this.arboles);
        break;

      case TipoTarea.MedicionSotobosque:
        this.guardarDatosTarea(this.sotobosque);
        break;

      default:
        console.warn('Tipo de tarea no reconocido');
        break;
    }

    this.guardarMultimedia();
  }

  actualizarFigurasLocalmente(idEstudio: string, dataJson: any) {
    const estudio = EstudiosBuffer.getEstudios().find((estudio: any) => estudio.id === idEstudio);
    if (estudio) {
      // estudio.data.ParcelasData = dataJson;
      const tareaKey = `ParcelasDataTarea_${this.idTarea}`;
      estudio.data[tareaKey] = dataJson;
      console.log('Figuras actualizadas en el buffer:', estudio);
    } else {
      console.error('No se encontró el estudio con ID:', idEstudio);
    }
  }

  abrirFormulario() {

    switch (this.tipoTarea) {

      case TipoTarea.MedicionArbolado:
        this.modalFormularioArboladoAbierto = true;
        break;

      case TipoTarea.MedicionSotobosque:
        this.modalFormularioSotobosqueAbierto = true;
        break;

      default:
        console.warn('Tipo de tarea no reconocido');
        // Lógica para manejar tipos de tarea desconocidos
        break;
    }

  }

  cerrarFormulario() {
    switch (this.tipoTarea) {

      case TipoTarea.MedicionArbolado:
        this.modalFormularioArboladoAbierto = false;
        break;

      case TipoTarea.MedicionSotobosque:
        this.modalFormularioSotobosqueAbierto = false;
        break;

      default:
        console.warn('Tipo de tarea no reconocido');
        // Lógica para manejar tipos de tarea desconocidos
        break;
    }
  }

  activarFormulario(tipo: string) {
    switch (tipo) {
      case 'arbol':
        this.hayArboles = true;
        break;
      case 'sotobosque':
        this.haySotobosque = true;
        break;
      default:
        console.warn('Tipo de marcador no soportado:', tipo);
        break;
    }
  }

  guardarEntidad(tipo: string, entidad: any) {
    switch (tipo) {
      case 'arbol':
        this.arboles.push(entidad);
        break;
      case 'sotobosque':
        this.sotobosque.push(entidad);
        break;
      default:
        console.warn('Tipo de marcador no soportado:', tipo);
        break;
    }
  }

  guardarDatosTarea(datos: any) {
    const estudio = EstudiosBuffer.getEstudios().find((estudio: any) => estudio.id === this.idEstudio);
    if (estudio) {
      estudio.data.TareasData.forEach((tarea: any) => {
        if (tarea.id === this.idTarea) {
          tarea.data = datos;
          console.log('Datos añadidos en la tarea', tarea);
        }
      });
    } else {
      console.error('No se encontró el estudio con ID:', this.idEstudio);
    }
  }

  guardarAudios() {
    const estudio = EstudiosBuffer.getEstudios().find((estudio: any) => estudio.id === this.idEstudio);
    if (estudio) {
      estudio.data.TareasData.forEach((tarea: any) => {
        if (tarea.id === this.idTarea) {
          tarea.audios = this.audios;
          console.log('Audios guardados en la tarea:', tarea);
        }
      });
    } else {
      console.error('No se encontró el estudio con ID:', this.idEstudio);
    }
  }

  guardarMultimedia() {
    const estudio = EstudiosBuffer.getEstudios().find((estudio: any) => estudio.id === this.idEstudio);
    if (estudio) {
      estudio.data.TareasData.forEach((tarea: any) => {
        if (tarea.id === this.idTarea) {
          tarea.audios = this.audios;
          tarea.imagenes = this.imagenes;
          tarea.multimedia = {
            adjuntos: this.multimediaAdjuntos,
            resumen: {
              total: this.multimediaAdjuntos.length,
              audios: this.multimediaAdjuntos.filter((a: AdjuntoMultimedia) => a.tipo === 'audio').length,
              imagenes: this.multimediaAdjuntos.filter((a: AdjuntoMultimedia) => a.tipo === 'imagen').length,
              pendientesSubida: this.multimediaAdjuntos.filter((a: AdjuntoMultimedia) => a.pendienteSubida).length
            }
          };
        }
      });
    } else {
      console.error('No se encontró el estudio con ID:', this.idEstudio);
    }
  }

  cargarAudios() {
    const estudio = EstudiosBuffer.getEstudios().find((estudio: any) => estudio.id === this.idEstudio);
    if (estudio) {
      estudio.data.TareasData.forEach((tarea: any) => {
        if (tarea.id === this.idTarea && tarea.audios) {
          this.audios = tarea.audios;
          console.log('Audios cargados desde la tarea:', this.audios);
        }
      });
    }
  }

  cargarMultimedia() {
    const estudio = EstudiosBuffer.getEstudios().find((estudio: any) => estudio.id === this.idEstudio);
    if (!estudio) return;

    estudio.data.TareasData.forEach((tarea: any) => {
      if (tarea.id !== this.idTarea) return;

      this.audios = tarea.audios || [];
      this.imagenes = tarea.imagenes || [];

      if (tarea.multimedia?.adjuntos?.length) {
        this.multimediaAdjuntos = tarea.multimedia.adjuntos;
      } else {
        const adjuntosAudio: AdjuntoMultimedia[] = (this.audios || []).map((audio: any) => ({
          id: `audio_legacy_${audio.name}`,
          tipo: 'audio',
          nombre: audio.name,
          path: audio.path,
          fechaCreacion: new Date().toISOString(),
          pendienteSubida: true
        }));

        const adjuntosImagen: AdjuntoMultimedia[] = (this.imagenes || []).map((img: any, index: number) => ({
          id: `img_legacy_${index}`,
          tipo: 'imagen',
          nombre: img.nombre || img.name || 'imagen.jpg',
          path: img.path,
          fechaCreacion: img.fechaCreacion || new Date().toISOString(),
          entidadNombre: img.entidadNombre,
          entidadTipo: img.entidadTipo,
          pendienteSubida: true
        }));

        this.multimediaAdjuntos = [...adjuntosAudio, ...adjuntosImagen];
      }
    });
  }

  tengoDatosParaEstaTarea() {
    if (this.tarea.data?.length > 0) {
      console.log('Hay datos para esta tarea:', this.tarea);
      this.activarFormulario(this.tarea.data[0].tipo);

      this.tarea.data.forEach((tarea: any) => {
        if (tarea.tipo === 'arbol') {
          const arbol = {
            nombre: tarea.nombre,
            tipo: tarea.tipo,
            coordenadas: tarea.coordenadas,
            datos: tarea.datos || null // 👈 usar el campo correcto
          };
          this.arboles.push(arbol);
          this.arbolActualNombre = tarea.nombre;
        } else if (tarea.tipo === 'sotobosque') {
          const sotobosque = {
            nombre: tarea.nombre,
            tipo: tarea.tipo,
            coordenadas: tarea.coordenadas,
            ocurrencias: tarea.ocurrencias || [] // ✅ Array de ocurrencias
          };
          this.sotobosque.push(sotobosque);
          this.sotobosqueActualNombre = tarea.nombre;
        }
      });

      console.log('Arboles cargados:', this.arboles);
    }
  }

  async calcularTransectos() {
    if (this.circulos.length === 0) {
      await this.showToast('❌ No hay círculos disponibles.');
      return;
    }

    // Crear opciones del alert
    console.log(this.circulos);
    const inputs = this.circulos.map((circle, index) => {
      const nombre = circle._popup?._content || `Círculo ${index + 1}`;
      console.log(nombre);
      return {
        name: 'circulo',
        type: 'radio' as const,
        label: nombre,
        value: index.toString()
      };
    });

    const alert = await this.alertController.create({
      header: 'Selecciona un círculo',
      inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Calcular',
          handler: (selectedIndex: string) => {
            const circuloSeleccionado = this.circulos[parseInt(selectedIndex, 10)];
            this.generarTransectos(circuloSeleccionado);
          }
        }
      ]
    });

    await alert.present();
  }


  generarTransectos(circulo: any) {
    const centro = circulo.getLatLng();
    const radio = circulo.getRadius(); // en metros

    const azimuts = [0, 120, 240]; // grados desde el norte
    const segmentos: L.Polyline[] = [];

    azimuts.forEach((azimut) => {
      const angulo = this.headingActual + azimut;
      const anguloRad = (angulo % 360) * (Math.PI / 180); // convertir a radianes

      // Cálculo de punto final del transecto
      const latFinal = centro.lat + (radio / 111320) * Math.cos(anguloRad);
      const lngFinal = centro.lng + (radio / (111320 * Math.cos(centro.lat * Math.PI / 180))) * Math.sin(anguloRad);

      const puntoFinal: L.LatLng = L.latLng(latFinal, lngFinal);
      const polyline = L.polyline([centro, puntoFinal], {
        color: '#8B0000',
        weight: 4
      });

      polyline.feature = {
        type: 'Feature',
        properties: { name: `Transecto ${azimut}°` },
        geometry: {
          type: 'LineString',
          coordinates: [
            [centro.lng, centro.lat],
            [lngFinal, latFinal]
          ]
        }
      };

      polyline.bindPopup(`Transecto ${azimut}°`);
      polyline.addTo(this.drawnItems);
      segmentos.push(polyline);
    });

    console.log('📐 Transectos generados:', segmentos);
    this.autoGuardar();
  }

  async confirmarSalida() {
    const alert = await this.alertController.create({
      header: '¿Salir de la tarea?',
      message: 'Vas a salir de esta tarea. ¿Deseas guardar antes de salir?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('🚫 Cancelado por el usuario');
          }
        },
        {
          text: 'Salir sin guardar',
          role: 'destructive',
          handler: () => {
            console.log('❌ Saliendo sin guardar');
            this.navCtrl.navigateBack('/estudios/detalle-estudio');
          }
        },
        {
          text: 'Guardar y salir',
          handler: async () => {
            console.log('💾 Guardando antes de salir...');
            await this.guardarZonas(); // Método de guardado que tú definas
            this.navCtrl.navigateBack('/estudios/detalle-estudio');
          }
        }
      ]
    });

    await alert.present();
  }


  // #region BORRADO SINCRONIZADO MAPA <-> FORMULARIO

  /**
   * Diálogo de confirmación genérico. Devuelve true si el usuario confirma.
   */
  async confirmarAccion(header: string, message: string, textoConfirmar: string = 'Eliminar'): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header,
        message,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: textoConfirmar, role: 'destructive', handler: () => resolve(true) },
        ],
      });
      // Fallback: si se cierra por backdrop o retroceso, se considera cancelado
      alert.onDidDismiss().then(() => resolve(false));
      await alert.present();
    });
  }

  private async confirmarBorradoMapa(
    total: number,
    entidades: { tipo: string; nombre: string }[],
  ): Promise<boolean> {
    let message: string;
    if (entidades.length > 0) {
      const listado = entidades
        .map((e) => `• ${e.tipo === 'arbol' ? 'Árbol' : 'Transecto'} "${e.nombre}"`)
        .join('\n');
      message =
        `Se eliminarán del mapa y también sus datos del formulario:\n\n${listado}\n\n` +
        `Esta acción no se puede deshacer.`;
    } else {
      message = `Vas a eliminar ${total} elemento(s) del mapa.\n\nEsta acción no se puede deshacer.`;
    }
    return this.confirmarAccion('¿Eliminar del mapa?', message);
  }

  /**
   * Elimina del array de datos (arboles / sotobosque) la entidad con ese nombre.
   */
  private eliminarEntidadArrayPorNombre(tipo: 'arbol' | 'sotobosque', nombre: string): void {
    const lista = tipo === 'arbol' ? this.arboles : this.sotobosque;
    const idx = lista.findIndex((e) => e.nombre === nombre);
    if (idx !== -1) lista.splice(idx, 1);
  }

  /**
   * Elimina del mapa el marcador asociado a una entidad (árbol / sotobosque).
   */
  private eliminarMarcadorEntidad(tipo: 'arbol' | 'sotobosque', nombre: string): void {
    if (!this.drawnItems) return;
    let objetivo: any = null;
    this.drawnItems.eachLayer((layer: any) => {
      const props = layer.feature?.properties;
      if (props && props.tipo === tipo && props.name === nombre) objetivo = layer;
    });
    if (objetivo) this.drawnItems.removeLayer(objetivo);
  }

  /**
   * Llamado desde los formularios: borra la entidad tanto del mapa como de los
   * datos, con confirmación. Devuelve true si finalmente se eliminó.
   */
  async eliminarEntidadDesdeFormulario(tipo: 'arbol' | 'sotobosque', nombre: string): Promise<boolean> {
    const etiqueta = tipo === 'arbol' ? 'árbol' : 'transecto';
    const confirmado = await this.confirmarAccion(
      `¿Eliminar ${etiqueta}?`,
      `Se eliminará "${nombre}" del mapa junto con todos sus datos asociados.\n\n` +
        `Esta acción no se puede deshacer.`,
    );
    if (!confirmado) return false;

    this.eliminarMarcadorEntidad(tipo, nombre);
    this.eliminarEntidadArrayPorNombre(tipo, nombre);

    if (tipo === 'arbol') {
      if (this.arbolActualNombre === nombre) this.arbolActualNombre = '';
      this.hayArboles = this.arboles.length > 0;
    } else {
      if (this.sotobosqueActualNombre === nombre) this.sotobosqueActualNombre = '';
      this.haySotobosque = this.sotobosque.length > 0;
    }

    this.autoGuardar();

    await this.showToast(`🗑️ ${etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)} eliminado`);
    return true;
  }

  // #endregion

  // #region CICLO DE VIDA / RETROCESO ANDROID

  ionViewDidEnter() {
    // Interceptamos el botón físico y el gesto de retroceso de Android para no
    // salir de la tarea perdiendo datos sin querer. Prioridad 10: por debajo de
    // los overlays de Ionic (modales/alertas usan 100) para que sigan cerrándose
    // ellos mismos, y por encima de la navegación por defecto.
    this.backButtonSub?.unsubscribe();
    this.backButtonSub = this.platform.backButton.subscribeWithPriority(10, () => {
      // Si hay un formulario abierto, el retroceso solo lo cierra
      if (this.modalFormularioArboladoAbierto) {
        this.eventoFormularioArbolado.emit(null);
        return;
      }
      if (this.modalFormularioSotobosqueAbierto) {
        this.eventoFormularioSotobosque.emit(null);
        return;
      }
      // En la pantalla principal de la tarea, pedimos confirmación de salida
      this.confirmarSalida();
    });
  }

  ionViewWillLeave() {
    this.backButtonSub?.unsubscribe();
    // Si queda un autoguardado pendiente del debounce, se vuelca antes de salir
    this.volcarAutoGuardadoPendiente();
  }

  // #endregion

  // #region AUDIO Y FOTO

  private sanitizarNombreArchivo(nombre: string): string {
    return nombre
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_()-]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Devuelve un nombre libre estilo Windows respecto a los audios ya grabados:
   * audio, audio(2), audio(3)... Evita que dos grabaciones con el mismo nombre
   * se sobrescriban entre sí en el almacenamiento interno.
   */
  private nombreAudioUnico(base: string): string {
    const existe = (n: string) => this.audios.some((a) => a.name === `${n}.mp3`);
    if (!existe(base)) return base;
    let i = 2;
    while (existe(`${base}(${i})`)) i++;
    return `${base}(${i})`;
  }

  /** Igual que nombreAudioUnico pero contra las imágenes ya capturadas. */
  private nombreImagenUnica(base: string): string {
    const existe = (n: string) => this.imagenes.some((img) => img.nombre === `${n}.jpg`);
    if (!existe(base)) return base;
    let i = 2;
    while (existe(`${base}(${i})`)) i++;
    return `${base}(${i})`;
  }

  private crearNombrePorDefecto(tipo: TipoAdjunto): string {
    const sello = new Date().toISOString().replace(/[:.]/g, '-');
    const prefijo = tipo === 'audio' ? 'aud' : 'img';
    const contexto = this.obtenerContextoEntidad();
    const entidad = contexto.entidadNombre
      ? this.sanitizarNombreArchivo(contexto.entidadNombre)
      : 'sin_entidad';
    return `${prefijo}_${this.idTarea}_${entidad}_${sello}`;
  }

  private obtenerContextoEntidad(): Pick<AdjuntoMultimedia, 'entidadNombre' | 'entidadTipo'> {
    if (this.tipoTarea === TipoTarea.MedicionArbolado && this.arbolActualNombre) {
      return { entidadNombre: this.arbolActualNombre, entidadTipo: 'arbol' };
    }

    if (this.tipoTarea === TipoTarea.MedicionSotobosque && this.sotobosqueActualNombre) {
      return { entidadNombre: this.sotobosqueActualNombre, entidadTipo: 'sotobosque' };
    }

    return { entidadNombre: undefined, entidadTipo: 'normal' };
  }

  private registrarAdjunto(tipo: TipoAdjunto, nombre: string, path: string): void {
    const contexto = this.obtenerContextoEntidad();

    const adjunto: AdjuntoMultimedia = {
      id: `${tipo}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      tipo,
      nombre,
      path,
      fechaCreacion: new Date().toISOString(),
      entidadNombre: contexto.entidadNombre,
      entidadTipo: contexto.entidadTipo,
      pendienteSubida: true
    };

    this.multimediaAdjuntos.push(adjunto);

    if (tipo === 'imagen') {
      this.imagenes.push(adjunto);
    }

    this.autoGuardar();
  }

  private async pedirNombreArchivo(tipo: 'foto' | 'audio'): Promise<string | null> {
    const base = this.crearNombrePorDefecto(tipo === 'foto' ? 'imagen' : 'audio');

    const alert = await this.alertController.create({
      header: `Nombre para el ${tipo}`,
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: `Ej: ${base}`
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aceptar',
          handler: (data) => {
            return data.nombre?.trim() || null;
          }
        }
      ]
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    const nombreUsuario = result.data?.values?.nombre?.trim();
    return this.sanitizarNombreArchivo(nombreUsuario || base);
  }

  async abrirCamara() {
    try {
      if (this.platform.is('android')) {
        await Camera.requestPermissions();
      }

      const nombreFoto = await this.pedirNombreArchivo('foto');
      if (!nombreFoto) return;

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true
      });

      const uri = photo.path || photo.webPath;

      if (uri) {
        // Nombre único (foto, foto(2)...) y copia al almacenamiento de la app:
        // la ruta que devuelve la cámara es temporal (caché) y Android puede
        // borrarla, con lo que la exportación posterior no la encontraría.
        const nombreArchivo = `${this.nombreImagenUnica(nombreFoto)}.jpg`;
        let rutaEstable = uri;
        try {
          await Filesystem.copy({ from: uri, to: nombreArchivo, toDirectory: Directory.External });
          rutaEstable = nombreArchivo; // relativo a la carpeta de archivos de la app
        } catch (copyErr) {
          console.warn('⚠️ No se pudo copiar la foto al almacenamiento de la app, se usa la ruta original:', copyErr);
        }
        this.registrarAdjunto('imagen', nombreArchivo, rutaEstable);
      }

      await this.showToast('📸 Foto capturada correctamente');
      console.log('Foto capturada:', uri);

      // Puedes mostrarla o almacenarla en la app si quieres

    } catch (error: any) {
      console.error('Error al tomar la foto:', error);
      await this.showToast(`❌ Error: ${error.message || 'No se pudo abrir la cámara'}`);
    }
  }

  reproducirAudio(path: string) {
    const audio = this.media.create(path);
    audio.play();
    this.showToast('▶️ Reproduciendo audio...');
  }

  /** Carpeta de exportación de la tarea actual: Descargas/TerrApp/<Estudio>/<Tarea> */
  private carpetaExportacionTarea(): string {
    const nombreEstudio = this.estudio?.data?.NuevoEstudioFormData?.nombre || 'Estudio';
    const nombreTarea = this.tarea?.nombreTarea || `tarea_${this.idTarea}`;
    return rutaExportacionTarea(nombreEstudio, nombreTarea);
  }

  /**
   * Copia un audio a la carpeta de la tarea en Descargas/TerrApp. Los nombres
   * repetidos se numeran (2), (3)... sin machacar nada.
   * Devuelve el nombre con el que quedó guardado.
   */
  private async copiarAudioACarpetaTarea(nombreArchivo: string): Promise<string> {
    // El audio vive en la carpeta de archivos de la app (Directory.External),
    // por eso se pasa el nombre relativo como origen.
    return copiarArchivoACarpeta(this.carpetaExportacionTarea(), nombreArchivo, nombreArchivo);
  }

  /** Traduce los errores del plugin de ficheros (FileError.code) a algo legible. */
  private describirErrorArchivo(err: any): string {
    const codigos: { [codigo: number]: string } = {
      1: 'archivo no encontrado',
      2: 'bloqueado por seguridad',
      3: 'operación abortada',
      4: 'archivo no legible',
      5: 'codificación inválida',
      6: 'no se puede modificar',
      7: 'estado inválido',
      9: 'ruta inválida',
      10: 'sin espacio en disco',
      12: 'el archivo ya existe',
    };
    if (err?.message) return err.message;
    if (typeof err?.code === 'number') return codigos[err.code] || `código ${err.code}`;
    return 'error desconocido';
  }

  /** Descarga un único audio del listado a la carpeta de la tarea. */
  async descargarAudio(audio: { name: string; path: string }) {
    try {
      await this.solicitarPermisos();
      const nombreFinal = await this.copiarAudioACarpetaTarea(audio.name);
      await this.showToast(`📥 Audio guardado en la carpeta de la tarea como ${nombreFinal}`);
    } catch (err: any) {
      console.error('❌ Error al copiar audio:', err);
      await this.showToast(`❌ No se pudo guardar el audio (${this.describirErrorArchivo(err)})`);
    }
  }

  async startRecording(nombre: string) {
    try {
      const nombreNormalizado = this.sanitizarNombreArchivo(nombre) || this.crearNombrePorDefecto('audio');
      // Si ya hay un audio con ese nombre, se numera: audio, audio(2), audio(3)...
      const fileName = `${this.nombreAudioUnico(nombreNormalizado)}.mp3`;
      this.filePath = this.file.externalDataDirectory + fileName;

      this.recording = this.media.create(this.filePath);
      this.recording.startRecord();

      await this.showToast('🎤 Grabando audio...');
    } catch (err) {
      console.error('Error al iniciar grabación:', err);
      await this.showToast('❌ No se pudo iniciar la grabación');
    }
  }


  async stopRecording() {
    try {
      if (this.recording) {
        this.recording.stopRecord();
        this.recording.release();

        const fileName = this.filePath.split('/').pop() || 'audio.mp3';
        const nuevoAudio = { name: fileName, path: this.filePath };

        this.audios.push(nuevoAudio);
        this.registrarAdjunto('audio', fileName, this.filePath);

        await this.showToast('✅ Grabación finalizada');
        console.log('Audio guardado internamente en:', this.filePath);

        // Mostrar alerta de confirmación para guardar
        const alert = await this.alertController.create({
          header: '¿Guardar audio?',
          message: '¿Quieres guardar este audio en la carpeta del estudio (Descargas/TerrApp)?',
          buttons: [
            {
              text: 'No',
              role: 'cancel',
              handler: () => {
                console.log('ℹ️ El usuario decidió no guardar el audio.');
              }
            },
            {
              text: 'Sí',
              handler: async () => {
                try {
                  console.log('🔐 Solicitando permisos...');
                  await this.solicitarPermisos();

                  const nombreFinal = await this.copiarAudioACarpetaTarea(fileName);
                  console.log(`✅ Audio copiado a la carpeta de la tarea: ${nombreFinal}`);
                  await this.showToast(`📥 Audio guardado en la carpeta de la tarea como ${nombreFinal}`);
                } catch (copyErr) {
                  console.error('❌ Error al copiar audio:', copyErr);
                  await this.showToast(`❌ No se pudo guardar el audio (${this.describirErrorArchivo(copyErr)})`);
                }
              }
            }
          ]
        });

        await alert.present();
      }
    } catch (err) {
      console.error('❌ Error al detener o guardar grabación:', err);
      await this.showToast('❌ Ocurrió un error al finalizar la grabación');
    }
  }

  async toggleGrabacion() {
    if (this.isRecording) {
      await this.stopRecording();
      this.isRecording = false;
    } else {
      const nombre = await this.pedirNombreArchivo('audio');
      if (!nombre) return;

      await this.startRecording(nombre);
      this.isRecording = true;
    }
  }

  async solicitarPermisos() {
    const permisos = [
      this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE,
      this.androidPermissions.PERMISSION.WRITE_EXTERNAL_STORAGE,
      this.androidPermissions.PERMISSION.RECORD_AUDIO,
      this.androidPermissions.PERMISSION.MANAGE_EXTERNAL_STORAGE
    ];

    console.log('🔐 Iniciando solicitud de permisos...');

    for (const permiso of permisos) {
      try {
        console.log(`🔍 Verificando permiso: ${permiso}`);
        const resultado = await this.androidPermissions.checkPermission(permiso);
        console.log(`📋 Resultado permiso ${permiso}:`, resultado.hasPermission);

        if (!resultado.hasPermission) {
          console.log(`📢 Solicitando permiso: ${permiso}`);
          const solicitud = await this.androidPermissions.requestPermission(permiso);
          console.log(`📥 Resultado solicitud ${permiso}:`, solicitud.hasPermission);

          if (!solicitud.hasPermission) {
            console.warn(`⚠️ Permiso NO concedido: ${permiso}`);
          }
        } else {
          console.log(`✅ Permiso ya concedido: ${permiso}`);
        }
      } catch (err) {
        console.error(`❌ Error al verificar/solicitar permiso ${permiso}:`, err);
      }
    }

    console.log('✅ Proceso de permisos finalizado.');
  }


  async descargarTodosLosAudios() {
    if (!this.audios.length) {
      console.warn('📭 No hay audios para descargar');
      await this.showToast('No hay audios para descargar');
      return;
    }

    try {
      console.log('🔄 Llamando a solicitarPermisos()...');
      await this.solicitarPermisos();

      console.log('📂 Comenzando descarga de audios...');
      const copiados: string[] = [];
      const fallidos: { nombre: string; error: any }[] = [];

      for (const audio of this.audios) {
        try {
          const nombreFinal = await this.copiarAudioACarpetaTarea(audio.name);
          console.log(`✅ Copiado con éxito: ${nombreFinal}`);
          copiados.push(nombreFinal);
        } catch (fileErr) {
          console.error(`❌ Error al copiar archivo ${audio.name}:`, fileErr);
          fallidos.push({ nombre: audio.name, error: fileErr });
        }
      }

      // Informar del resultado REAL (antes se mostraba éxito aunque fallasen)
      if (fallidos.length === 0) {
        await this.showToast(`✅ ${copiados.length} audio(s) copiados a la carpeta de la tarea`);
      } else if (copiados.length === 0) {
        await this.showToast(
          `❌ No se pudo copiar ningún audio (${this.describirErrorArchivo(fallidos[0].error)})`,
        );
      } else {
        await this.showToast(
          `⚠️ Copiados ${copiados.length} de ${this.audios.length}; falló "${fallidos[0].nombre}" ` +
            `(${this.describirErrorArchivo(fallidos[0].error)})`,
        );
      }
    } catch (err) {
      console.error('❌ Error general al copiar archivos:', err);
      await this.showToast('❌ No se pudieron copiar los audios');
    }
  }



  // #endregion AUDIO Y FOTO


}




