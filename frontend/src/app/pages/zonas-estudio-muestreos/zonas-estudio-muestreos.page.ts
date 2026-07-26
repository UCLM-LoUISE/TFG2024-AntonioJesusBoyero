import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import L from 'leaflet';
import 'leaflet-draw';
import { EstudioData } from 'src/app/data/estudios-data';
import { TipoModal } from 'src/app/enums/tipoModal-enum';
import { FiguraResumen } from 'src/app/interfaces/figura-resumen';
import { LocalidadesService } from 'src/app/services/localidades.service';
import { GestionTareasPage } from '../gestion-tareas/gestion-tareas.page';
import { EstudiosPage } from '../estudios/estudios.page';
import { firstValueFrom } from 'rxjs';
import { BackService } from 'src/app/services/back.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { PasosEstudio } from 'src/app/enums/estados-estudios';

// Modal
declare var bootstrap: any;
declare var window: any;

@Component({
  selector: 'app-zonas-estudio-muestreos',
  templateUrl: './zonas-estudio-muestreos.page.html',
  styleUrls: ['./zonas-estudio-muestreos.page.css']
})
export class ZonasEstudioMuestreosPage implements OnInit {

  public static instance: ZonasEstudioMuestreosPage;
  private map: L.Map | undefined;
  public drawnItems: L.FeatureGroup | undefined;
  layerOpen: string = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  noFiguras: TipoModal = TipoModal.noHasIntroducidoFiguras
  nombre: TipoModal = TipoModal.introducirNombre
  noHasGuardado: TipoModal = TipoModal.noHasGuardado
  public nombreFigura: string = '';
  private resolveNombre!: (value: string | null) => void;
  public resumenFiguras: FiguraResumen[] = []; // Estructura jerárquica de las figuras
  nombreEstudio: any;

  //variables para el modo edicion
  editMode: boolean = EstudiosPage.Instance.editMode;
  idEstudio: any = EstudiosPage.Instance.idEstudioEdit;

  resumenExpandido: boolean = false;
  cargando: boolean = false
  cambioFigurasEnElMapa: boolean = false

  eliminarZona: TipoModal = TipoModal.eliminarZona

  private idsZonasAEliminar: string[] = [];
  private layersZonasAEliminar: any[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private localidadesService: LocalidadesService,
    private router: Router,
    private backend: BackService,
    private afAuth: AngularFireAuth
  ) {
    ZonasEstudioMuestreosPage.instance = this;
  }

  ngOnInit(): void {
    console.log(EstudioData.getNuevoEstudioFormData())
    this.initMap();
    // Cargar el nombre del estudio (si existe)
    const estudioData = EstudioData.getNuevoEstudioFormData();
    this.nombreEstudio = estudioData?.nombre || '';

    if (this.editMode && this.idEstudio) {
      // Cargar las figuras asociadas al estudio en modo edición
      this.cargarFigurasModoEdicion(this.idEstudio);
    } else {
      // Flujo normal
      this.cargarFigurasDesdeBuffer();
    }
    this.verificarMarcadores();
  }

  //#region MAPA

  // afectado polyline
  private initMap(): void {
    const estudioData = EstudioData.getNuevoEstudioFormData();
    const provincia = estudioData.provincia;
    const municipio = estudioData.poblacion;

    // Buscar las coordenadas del municipio
    const coordenadas = this.localidadesService.getCoordenadas(provincia, municipio);
    // Si no se encuentran las coordenadas, usar un centro por defecto
    const centro = coordenadas || [38.994349, -1.858542]; // Coordenadas de Albacete

    // Inicializar el mapa
    this.map = L.map('map', {
      center: centro,
      zoom: 13,
      // maxZoom: 25 // Aumenta el zoom máximo permitido
    });

    // --- Capas base seleccionables ---
    // Mapa de relieve (Thunderforest Outdoors) - capa por defecto
    const capaRelieve = L.tileLayer('https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=9ed48a0fdb4345aca36f4ec394272dd7', {
      attribution: '&copy; Thunderforest, OpenStreetMap contributors',
      maxZoom: 22,
      subdomains: ['a', 'b', 'c']
    });

    // Callejero clásico de OpenStreetMap
    const capaCalles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    });

    // Satélite (Esri World Imagery) - uso libre con atribución
    const capaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics y la comunidad de usuarios GIS',
      maxZoom: 20
    });

    // Capa activa por defecto
    capaRelieve.addTo(this.map);

    // Control para elegir entre las distintas capas base
    const capasBase = {
      'Mapa (relieve)': capaRelieve,
      'Calles (OSM)': capaCalles,
      'Satélite': capaSatelite
    };

    L.control.layers(capasBase, undefined, { position: 'topright', collapsed: true }).addTo(this.map);

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

    // Crear un FeatureGroup para almacenar los elementos dibujados
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
        },
      },
    });
    this.map.addControl(drawControl);

    this.map.on(L.Draw.Event.CREATED, async (event: any) => {
      this.cambioFigurasEnElMapa = true
      const layer = event.layer;

      let tipo = '';
      if (event.layerType === 'circle') {
        tipo = 'Círculo';
        const radius = layer.getRadius();
        const center = layer.getLatLng();

        // Mostrar el modal y esperar el nombre
        this.showModal();
        const nombre = await this.getNombreFigura();

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

          // Actualizar resumen
          this.actualizarResumen(layer, nombre, tipo);
        }
      } else if (event.layerType === 'marker') { // Verificar si es un marcador
        tipo = 'Punto';
        const coordinates = layer.getLatLng();

        // Mostrar el modal y esperar el nombre
        this.showModal();
        const nombre = await this.getNombreFigura();

        if (nombre) {
          // Guardar las propiedades del marcador
          layer.feature = layer.feature || {};
          layer.feature.type = 'Feature';
          layer.feature.properties = layer.feature.properties || {};
          layer.feature.properties.name = nombre;
          layer.feature.geometry = {
            type: 'Point',
            coordinates: [coordinates.lng, coordinates.lat], // Guardar como punto
          };

          layer.bindPopup(nombre).openPopup();
          this.drawnItems?.addLayer(layer);

          // Actualizar resumen
          this.actualizarResumen(layer, nombre, tipo);

          // Abrir el modal de tareas solo si es un marcador
          GestionTareasPage.Instance.openModeCreateTask();
          this.verificarMarcadores();
        }
      } else if (event.layerType === 'polyline') {
        tipo = 'Línea';
        const coordinates = layer.getLatLngs().map((latlng: any) => [latlng.lng, latlng.lat]);

        // Mostrar el modal y esperar el nombre
        this.showModal();
        const nombre = await this.getNombreFigura();

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

          // Actualizar resumen
          this.actualizarResumen(layer, nombre, tipo);
        }
      } else {
        tipo = 'Figura';
        // Mostrar el modal y esperar el nombre
        this.showModal();
        const nombre = await this.getNombreFigura();

        if (nombre) {
          // Guardar las propiedades de otras figuras
          layer.feature = layer.feature || {};
          layer.feature.type = 'Feature';
          layer.feature.properties = layer.feature.properties || {};
          layer.feature.properties.name = nombre;

          layer.bindPopup(nombre).openPopup();
          this.drawnItems?.addLayer(layer);

          // Actualizar resumen
          this.actualizarResumen(layer, nombre, tipo);
        }
      }
      this.closeModal();
    });

    this.map.on(L.Draw.Event.DELETED, (event: any) => {
      this.cambioFigurasEnElMapa = true;
      const layers = event.layers;

      const idsAEliminar: string[] = [];
      const layersAEliminar: any[] = [];

      layers.eachLayer((layer: any) => {
        const id = L.Util.stamp(layer).toString();
        idsAEliminar.push(id);
        layersAEliminar.push(layer);
      });

      this.showModalZonas(idsAEliminar, layersAEliminar);
    });

  }

  //#endregion MAPA

  //#region MODAL Y FUNCIONES PARA INTRODUCIR EL NOMBRE


  showModal() {
    var modal = new window.bootstrap.Modal(
      document.getElementById('muestreosModal')
    );
    modal.show();
  }

  closeModal() {
    const modalElement = document.getElementById('muestreosModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }

  showModalnoFigurasModal() {
    var modal = new window.bootstrap.Modal(
      document.getElementById('noFigurasModal')
    );
    modal.show();
  }

  closeModalnoFigurasModal() {
    const modalElement = document.getElementById('noFigurasModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }

  showModalnoHasGuardado() {
    var modal = new window.bootstrap.Modal(
      document.getElementById('noHasGuardado')
    );
    modal.show();
  }

  closeModalnoHasGuardado() {
    const modalElement = document.getElementById('noHasGuardado');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }


  showModalZonas(ids: string[], layers: any[]) {
    // seteamos los id y los layer de las figuras a eliminar
    this.idsZonasAEliminar = ids;
    this.layersZonasAEliminar = layers;

    var modalElement = document.getElementById('eliminarZonasModal');
    if (modalElement) {
      var modal = new window.bootstrap.Modal(modalElement, { backdrop: 'static', keyboard: false });
      modal.show();
    }
  }


  closeModalZonas() {
    const modalElement = document.getElementById('eliminarZonasModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }

    // 🔹 Restaurar figuras si se cancela la eliminación
    if (this.layersZonasAEliminar.length > 0) {
      this.layersZonasAEliminar.forEach(layer => {
        if (layer) {
          this.drawnItems?.addLayer(layer); // 🔹 Ahora los layers existen correctamente
        }
      });
      console.log(`🔄 Figuras restauradas tras cancelar la eliminación.`);
    }

    // 🔹 Resetear valores
    this.idsZonasAEliminar = [];
    this.layersZonasAEliminar = [];
  }



  closeModalZonasSinReconstruir() {
    const modalElement = document.getElementById('eliminarZonasModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
  }

  confirmarEliminarZona(): void {
    if (this.idsZonasAEliminar.length > 0) {
      this.eliminarVariasFiguras(this.idsZonasAEliminar);
      console.log(`✅ Eliminadas ${this.idsZonasAEliminar.length} figuras.`);
    }
    if (this.drawnItems && this.drawnItems.getLayers().length > 0) {
      this.guardarZonas()
    }
    this.closeModalZonasSinReconstruir();
    this.verificarMarcadores();
  }

  private eliminarVariasFiguras(ids: string[]): void {
    ids.forEach(id => {
      this.eliminarFiguraYHijos(id);
    });

    console.log(`✅ Eliminadas ${ids.length} figuras correctamente.`);

    // 🔹 Eliminar todas las tareas si se borró todo
    if (this.drawnItems?.getLayers().length == 0) {
      GestionTareasPage.Instance.eliminarTodasLasTareas();
    }
  }


  /** Comprueba (sin distinguir mayúsculas) si ya existe una figura con ese nombre */
  public existeNombreFigura(nombre: string): boolean {
    const objetivo = (nombre || '').trim().toLowerCase();
    if (!objetivo) return false;
    const buscar = (figuras: FiguraResumen[]): boolean =>
      figuras.some(f =>
        (f.nombre || '').trim().toLowerCase() === objetivo || buscar(f.hijos || [])
      );
    return buscar(this.resumenFiguras);
  }

  introduceNombre(nombre: string) {
    this.nombreFigura = nombre;
    if (this.resolveNombre) {
      this.resolveNombre(nombre); // Resuelve la promesa con el nombre introducido
      this.resolveNombre = null as any; // Limpia el resolve para futuras llamadas
    }
  }

  getNombreFigura(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolveNombre = resolve; // Guarda la función `resolve` para resolver la promesa más tarde
    });
  }

  //#endregion

  //#region RESUMEN FIGURAS

  // eliminarMarcadorPorZona(nombreZona: string): void {
  //   let marcadorAEliminar: L.Marker | null = null;
  //   let idMarcador: string | null = null;

  //   this.drawnItems?.eachLayer((layer: any) => {
  //     if (layer instanceof L.Marker && layer.feature?.properties?.name === nombreZona) {
  //       marcadorAEliminar = layer;
  //       idMarcador = L.Util.stamp(layer).toString(); // Obtener el ID único del marcador
  //     }
  //   });

  //   if (marcadorAEliminar && idMarcador) {
  //     this.drawnItems?.removeLayer(marcadorAEliminar);
  //     console.log(`Marcador de la zona "${nombreZona}" eliminado del mapa.`);

  //     // 🔹 Ahora eliminamos también del resumen
  //     this.eliminarFiguraYHijos(idMarcador);
  //   } else {
  //     console.warn(`No se encontró un marcador para la zona "${nombreZona}".`);
  //   }
  // }

  public actualizarResumen(layer: any, nombre: string, tipo: string): void {
    const nuevaFigura: FiguraResumen = {
      id: L.Util.stamp(layer).toString(), // Identificador único basado en Leaflet
      tipo,
      nombre,
      hijos: [],
    };

    const anidarFigura = (figuras: FiguraResumen[], nueva: FiguraResumen): boolean => {
      for (const figura of figuras) {
        if (this.contieneFigura(figura, layer)) {
          if (anidarFigura(figura.hijos, nueva)) {
            return true; // Ya se anidó correctamente
          } else {
            figura.hijos.push(nueva); // Anidar como hijo
            return true;
          }
        }
      }
      return false; // No se pudo anidar en esta jerarquía
    };

    // Intentar anidar la nueva figura en las figuras existentes
    if (!anidarFigura(this.resumenFiguras, nuevaFigura)) {
      this.resumenFiguras.push(nuevaFigura); // Si no se pudo anidar, agregarla como raíz
    }

    this.actualizarVistaResumen();
  }

  private eliminarFiguraYHijos(id: string): void {
    const eliminarRecursivo = (figuras: FiguraResumen[]): FiguraResumen[] => {
      return figuras.filter((figura) => {
        if (figura.id === id) {
          // Eliminar la capa del mapa
          const layer = this.drawnItems?.getLayer(parseInt(figura.id));
          if (layer) {
            this.drawnItems?.removeLayer(layer);
          }

          const tieneTareas = GestionTareasPage.Instance.existeTareaEnZona(figura.nombre);

          if (tieneTareas) {
            console.log(`🚨 Eliminando tareas asociadas a la zona "${figura.nombre}"`);
            GestionTareasPage.Instance.eliminarTareasPorZona(figura.nombre);
          }

          // Llamar recursivamente para eliminar los hijos
          figura.hijos.forEach((hijo) => this.eliminarFiguraYHijos(hijo.id));

          return false; // Eliminar esta figura del resumen
        }

        // Si no es la figura a eliminar, revisa los hijos
        figura.hijos = eliminarRecursivo(figura.hijos);
        return true; // Mantener esta figura en el resumen
      });
    };

    this.resumenFiguras = eliminarRecursivo(this.resumenFiguras);
    this.actualizarVistaResumen();
  }


  private contieneFigura(figuraResumen: FiguraResumen, layer: any): boolean {
    const figuraLayer = this.drawnItems?.getLayer(parseInt(figuraResumen.id));

    if (figuraLayer instanceof L.Polygon || figuraLayer instanceof L.Rectangle) {
      const figuraBounds = figuraLayer.getBounds();
      const layerBounds = layer.getBounds ? layer.getBounds() : null;

      if (layerBounds) {
        return figuraBounds.contains(layerBounds);
      } else if (layer.getLatLng) {
        return figuraBounds.contains(layer.getLatLng());
      }
    }

    return false;
  }

  public actualizarVistaResumen(): void {
    this.cdr.detectChanges(); // Forzar actualización de la vista
    console.log('Resumen de figuras actualizado:', this.resumenFiguras);
  }

  // #TODO afectado polyline hacer la reconstruccion correcta para las polylines
  private reconstruirResumenDesdeDrawnItems(): void {
    const figuras: FiguraResumen[] = [];

    // Convertir las capas de drawnItems en FiguraResumen
    this.drawnItems?.eachLayer((layer: any) => {
      if (!layer.feature) return; // Saltar capas sin datos de feature

      // 🔹 Detectar si es un Círculo, porque en GeoJSON son "Point"
      const tipo = layer instanceof L.Circle ? 'Círculo' : layer.feature.geometry.type;
      const nombre = layer.feature.properties?.name || 'Sin nombre';

      const nuevaFigura: FiguraResumen = {
        id: L.Util.stamp(layer).toString(),
        tipo,
        nombre,
        hijos: [],
      };

      figuras.push(nuevaFigura);
    });

    // Función para anidar figuras (establecer jerarquía)
    const anidarFigura = (padres: FiguraResumen[], nueva: FiguraResumen): boolean => {
      for (const padre of padres) {
        if (this.contieneFiguraEdit(padre, nueva)) {
          if (anidarFigura(padre.hijos, nueva)) {
            return true; // La figura ya fue anidada en un subnivel
          } else {
            padre.hijos.push(nueva); // Anidar como hijo directo
            return true;
          }
        }
      }
      return false; // No se pudo anidar en este nivel
    };

    // Reconstruir la jerarquía del resumen
    this.resumenFiguras = [];
    figuras.forEach((figura) => {
      if (!anidarFigura(this.resumenFiguras, figura)) {
        this.resumenFiguras.push(figura); // Si no tiene padre, agregar como raíz
      }
    });

    this.actualizarVistaResumen(); // Actualizar la vista
  }

  private contieneFiguraEdit(figuraPadre: FiguraResumen, figuraHijo: FiguraResumen): boolean {
    const layerPadre = this.drawnItems?.getLayer(parseInt(figuraPadre.id));
    const layerHijo = this.drawnItems?.getLayer(parseInt(figuraHijo.id));

    if (layerPadre instanceof L.Polygon || layerPadre instanceof L.Rectangle) {
      const boundsPadre = layerPadre.getBounds();

      if (layerHijo instanceof L.Circle) {
        return boundsPadre.contains(layerHijo.getLatLng()); // ✅ Ahora verifica círculos
      } else if (layerHijo instanceof L.Marker) {
        return boundsPadre.contains(layerHijo.getLatLng());
      } else if (layerHijo instanceof L.Polygon || layerHijo instanceof L.Rectangle) {
        return boundsPadre.contains(layerHijo.getBounds());
      }
    }

    return false; // No hay relación padre-hijo
  }

  //#endregion

  //#region METODOS COMUNES


  goBack() {
    if (this.cambioFigurasEnElMapa) {
      this.showModalnoHasGuardado()
    } else {
      this.router.navigate(['/nuevo-estudio']);
    }
  }

  /** Encuadra el mapa sobre las figuras ya dibujadas (si las hay);
   *  si no hay figuras se mantiene el centro por municipio */
  private ajustarVistaAFiguras(): void {
    setTimeout(() => {
      const bounds = this.drawnItems?.getBounds();
      if (bounds && bounds.isValid()) {
        this.map?.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      }
    }, 100);
  }

  toggleResumen(): void {
    this.resumenExpandido = !this.resumenExpandido;
  }

  // Actualizar las figuras localmente tras modificar el backend
  private actualizarFigurasLocalmente(idEstudio: string, parcelasData: any): void {
    const estudio = EstudiosPage.Instance.estudios.find(est => est.id === idEstudio);

    if (estudio) {
      estudio.data.ParcelasData = parcelasData; // Actualizamos localmente las figuras
      console.log(`Figuras del estudio con ID ${idEstudio} actualizadas localmente.`);
    } else {
      console.warn(`No se encontró el estudio con ID ${idEstudio} para actualizar las figuras localmente.`);
    }
  }

  // aqui no me afecta polyline porque guardo los datos en el buffer antes de ser procesados por el backend
  private cargarFigurasDesdeBuffer(): void {
    const figurasGuardadas = EstudioData.getParcelasData();

    if (!figurasGuardadas || !Array.isArray(figurasGuardadas.features) || figurasGuardadas.features.length === 0) {
      console.log(`[ZonasEstudioLeafletPage] No se encontraron figuras válidas en el buffer local.`);
      return;
    }

    if (this.drawnItems) {
      console.log(`[Modo Edición] Cargando figuras del estudio.`);

      figurasGuardadas.features.forEach((feature: any) => {
        if (feature.geometry.type === 'Point' && feature.properties.radius) {
          // 🔹 Restauramos el círculo correctamente
          const circle = L.circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
            radius: feature.properties.radius,
            color: '#ff0000',
          });

          if (feature.properties.name) {
            circle.bindPopup(feature.properties.name);
          }

          // 🔹 Volver a asignar la propiedad radius al objeto feature del círculo
          circle.feature = feature;
          if (circle.feature) {
            circle.feature.properties.radius = feature.properties.radius; // Asegurar que la propiedad se mantenga
          }

          this.drawnItems?.addLayer(circle);
        } else {
          // 🔹 Si no es un círculo, se renderiza normalmente
          const layer = L.geoJSON(feature, {
            onEachFeature: (f, l) => {
              if (f.properties && f.properties.name) {
                l.bindPopup(f.properties.name);
              }
            },
          }).getLayers()[0];

          this.drawnItems?.addLayer(layer);
        }
      });

      // Reconstruir el resumen desde drawnItems
      this.reconstruirResumenDesdeDrawnItems();

      // Encuadrar el mapa sobre las figuras cargadas
      this.ajustarVistaAFiguras();
    } else {
      console.log(`[ZonasEstudioLeafletPage] No se encontraron figuras válidas en el buffer local.`);
    }
  }

  // afectado polyline
  private cargarFigurasModoEdicion(idEstudio: string): void {
    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.id === idEstudio
    );

    if (!estudioSeleccionado) {
      console.error(`Estudio con ID ${idEstudio} no encontrado.`);
      return;
    }

    const figurasGuardadas = estudioSeleccionado.data?.ParcelasData;

    if (figurasGuardadas && this.drawnItems) {
      console.log(`[Modo Edición] Cargando figuras del estudio ${idEstudio}.`);

      figurasGuardadas.features.forEach((feature: any) => {
        if (feature.geometry.type === 'Point' && feature.properties.radius) {
          // 🔹 Es un círculo -> Usamos L.circle en lugar de L.geoJSON
          const circle = L.circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
            radius: feature.properties.radius, // Se usa el radio guardado
            color: '#ff0000',
          });

          if (feature.properties.name) {
            circle.bindPopup(feature.properties.name);
          }

          circle.feature = feature;
          if (circle.feature) {
            circle.feature.properties.radius = feature.properties.radius; // Asegurar que la propiedad se mantenga
          }

          this.drawnItems?.addLayer(circle);
        } else if (feature.geometry.type === 'LineString') {
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
          // 🔹 No es un círculo, usar L.geoJSON normal
          const layer = L.geoJSON(feature, {
            onEachFeature: (f, l) => {
              if (f.properties && f.properties.name) {
                l.bindPopup(f.properties.name);
              }
            },
          }).getLayers()[0];

          this.drawnItems?.addLayer(layer);
        }
      });

      // 🔹 Reconstruir el resumen desde drawnItems
      this.reconstruirResumenDesdeDrawnItems();

      // Encuadrar el mapa sobre las figuras del estudio
      this.ajustarVistaAFiguras();
    } else {
      console.log(`[Modo Edición] No se encontraron figuras para el estudio ${idEstudio}.`);
    }
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


  // afectado polyline
  async guardarZonas(): Promise<void> {
    if (this.drawnItems && this.drawnItems.getLayers().length > 0) {
      this.cargando = true;

      try {
        const idFormulario = EstudioData.getNuevoEstudioFormData()?.idFormulario;
        const user = await this.afAuth.currentUser;
        const email = user ? user.email : null;

        if (!email || !idFormulario) {
          throw new Error('Faltan datos: email o idFormulario no disponible');
        }

        // 🔹 Asegurar que los círculos tengan la propiedad radius antes de convertir a GeoJSON
        this.drawnItems.eachLayer((layer: any) => {
          if (layer instanceof L.Circle) {
            if (!layer.feature) {
              layer.feature = { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [] } };
            }

            layer.feature.geometry.type = "Point";
            layer.feature.geometry.coordinates = [layer.getLatLng().lng, layer.getLatLng().lat];

            // 🔹 Volver a establecer el radio antes de guardar
            layer.feature.properties.radius = layer.getRadius();
            layer.feature.properties.name = layer.feature.properties.name || "Círculo sin nombre";
          }
        });

        const dataJson = this.drawnItems.toGeoJSON();
        console.log("Probando la salida antes de enviar al backend", dataJson);

        // Llamar al backend
        const response = await firstValueFrom(
          await this.backend.crearEstudioPorPartesZonasNew(
            email,
            dataJson,
            PasosEstudio.ZONAS,
            idFormulario,
            this.resumenFiguras
          )
        );

        console.log('Zonas guardadas:', response);
        this.cargando = false;
        this.cambioFigurasEnElMapa = false;
        EstudioData.setParcelasData(dataJson);
        this.actualizarFigurasLocalmente(EstudiosPage.Instance.idEstudioEdit, dataJson);

      } catch (error) {
        console.error('Error al guardar zonas:', error);
      }
    } else {
      this.showModalnoFigurasModal();
    }
  }

  async guardarZonasVacias(): Promise<void> {
    this.cargando = true;

    try {
      const idFormulario = EstudioData.getNuevoEstudioFormData()?.idFormulario;
      const user = await this.afAuth.currentUser;
      const email = user ? user.email : null;

      if (!email || !idFormulario) {
        throw new Error('Faltan datos: email o idFormulario no disponible');
      }

      const dataJson = { type: "FeatureCollection", features: [] }; // 🔹 Enviar estructura vacía
      console.log("Enviando datos vacíos al backend:", dataJson);

      // Llamar al backend con una estructura vacía
      const response = await firstValueFrom(
        await this.backend.crearEstudioPorPartesZonasNew(
          email,
          dataJson,
          PasosEstudio.ZONAS,
          idFormulario,
          [] // 🔹 También se envía el resumen vacío
        )
      );

      console.log('Guardado de zonas vacías exitoso:', response);
      this.cargando = false;
      this.cambioFigurasEnElMapa = false;
      EstudioData.setParcelasData(dataJson);
      this.actualizarFigurasLocalmente(EstudiosPage.Instance.idEstudioEdit, dataJson);

    } catch (error) {
      console.error('Error al guardar zonas vacías:', error);
    }
  }

  public getMap(): any {
    return this.map;
  }

  public getDrawnItems(): any {
    return this.drawnItems;
  }

  public verificarMarcadores() {
    let hayMarcadores = false;

    this.drawnItems?.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        hayMarcadores = true;
      }
    });
    // Solo actualizar si no hay tareas en la tabla
    if (!GestionTareasPage.Instance.hayTareas) {
      GestionTareasPage.Instance.hayTareas = hayMarcadores;
    }

    if (!hayMarcadores) {
      GestionTareasPage.Instance.hayTareas = hayMarcadores;
    }
  }


  //#endregion

}
