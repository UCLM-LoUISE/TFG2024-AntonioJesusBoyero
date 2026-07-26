import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as L from 'leaflet';
import { BackService } from 'src/app/services/back.service';


@Component({
  selector: 'app-fusion-tareas-mapa',
  templateUrl: './fusion-tareas-mapa.component.html',
  styleUrls: ['./fusion-tareas-mapa.component.css']
})
export class FusionTareasMapaComponent implements OnInit {

  @Output() cerrar = new EventEmitter<void>();
  @Input() tarea!: any;
  @Input() idEstudio!: any;

  seccionActiva: string = 'mapa'; // Estado inicial: pestaña Mapa
  indicadorPosicion: any = 0; // Posición inicial de la barra indicadora


  //atributos para el mapa y figuras
  private map!: L.Map;
  private drawnItems!: L.FeatureGroup;

  circulos: any[] = [];
  parcelasData: any;

  datosTarea: any;
  columnasDatos: any;

  readonly NOMBRES_COLUMNAS: { [key: string]: string } = {
    momento: 'Momento', // 🆕 Agregar columna Momento
    especie: 'Especie',
    dn: 'Diámetro Normal (Dn)',
    ht: 'Altura Total (Ht)',
    hs: 'Altura de Copa Seca (Hs)',
    hv: 'Altura de Copa Viva (Hv)',
    dc1: 'Diámetro de Copa 1 (Dc1)',
    dc2: 'Diámetro de Copa 2 (Dc2)',
    superficieCopa: 'Superficie de Copa (Sc)',
    edad: 'Edad',
    longitud: 'Longitud Horizontal',
    altura: 'Altura Total',
    porcionVerde: 'Altura Porción Verde',
    porcionSeca: 'Altura Porción Seca',
    total: 'Porcentaje de Cobertura',
    notas: 'Notas'
  };

  constructor(private backService: BackService) { }

  async ngOnInit(): Promise<void> {

    if (this.tarea.fusionada) {
      this.parcelasData = this.tarea.fusion.mapa || null;

      if (!this.parcelasData) {
        console.error('❌ No se encontró el mapa en los archivos JSON.');
        return;
      }
      console.log('Datos del mapa:', this.parcelasData);

      // this.datosTarea = archivosJson[0]?.contenido.contenido.datos || null;
      let datos = this.tarea.fusion.datos || [];
      // 🆕 Expandir ocurrencias si es sotobosque
      datos = this.expandirOcurrencias(datos);
      this.datosTarea = datos;
      this.columnasDatos = this.obtenerColumnas(datos);

      if (!this.datosTarea) {
        console.error('❌ No se encontraron datos de la tarea en los archivos JSON.');
        return;
      }

      console.log('Datos de la tarea:', this.datosTarea);

      setTimeout(() => {
        this.initMap();
      }, 1000);
    } else {
      console.log("Datos de la tarea:", this.tarea);
      console.log("ID del estudio:", this.idEstudio);

      // 🆕 Si la tarea tiene momentos, combinar datos de todos los momentos
      if (this.tarea.tieneMomentos && this.tarea.momentos) {
        let datosCombinados: any[] = [];
        let primerMapa: any = null;

        for (const nombreMomento of Object.keys(this.tarea.momentos)) {
          const momento = this.tarea.momentos[nombreMomento];

          // 🆕 Si este momento está fusionado, usar datos fusionados
          if (momento.fusionado && momento.fusion?.datos) {
            if (!primerMapa && momento.fusion?.mapa) {
              primerMapa = momento.fusion.mapa;
            }
            let datos = momento.fusion.datos;
            datos = datos.map((d: any) => ({ ...d, momento: nombreMomento }));
            datosCombinados.push(...datos);
          } else {
            // Usar datos originales del archivo JSON
            const archivoJSON = momento.archivosSubidos?.find((a: any) => a.tipo === 'application/json');

            if (archivoJSON) {
              try {
                const contenido = await this.backService.leerArchivoTarea(this.idEstudio, this.tarea.id, archivoJSON.nombre, nombreMomento);

                // Tomar el mapa del primer archivo
                if (!primerMapa) {
                  primerMapa = contenido?.contenido?.mapa || null;
                }

                // Combinar datos etiquetando con el momento y el autor
                let datos = contenido?.contenido?.datos || [];
                const nombreUsuario = contenido?.contenido?.nombreUsuario || archivoJSON.subidoPor || '';
                datos = datos.map((d: any) => ({ ...d, momento: nombreMomento, nombreUsuario }));
                datosCombinados.push(...datos);
              } catch (error) {
                console.error(`❌ Error al leer archivo del momento ${nombreMomento}:`, error);
              }
            }
          }
        }

        this.parcelasData = primerMapa;
        if (!this.parcelasData) {
          console.error('❌ No se encontró el mapa en ningún momento.');
          return;
        }

        // Expandir ocurrencias si es sotobosque
        datosCombinados = this.expandirOcurrencias(datosCombinados);
        this.datosTarea = datosCombinados;
        this.columnasDatos = this.obtenerColumnas(datosCombinados);

        console.log('Datos combinados de todos los momentos:', this.datosTarea);

        // Inicializar el mapa también para tareas con momentos
        // (antes faltaba y el mapa no se pintaba hasta cambiar de pestaña)
        setTimeout(() => {
          this.initMap();
        }, 300);

      } else {
        // Lógica original para tareas SIN momentos
        const archivosAFusionar = this.archivosFiltradosJSON;

        console.log('Archivos a fusionar (filtrados):', archivosAFusionar);

      try {
        const archivosJson = await Promise.all(
          archivosAFusionar.map(async (a: any) => {
            const contenido = await this.backService.leerArchivoTarea(this.idEstudio, this.tarea.id, a.nombre);
            return {
              nombre: a.nombre,
              contenido
            };
          })
        );

        console.log('Contenido de los archivos leídos del backend:', archivosJson);

        this.parcelasData = archivosJson[0]?.contenido.contenido.mapa || null;

        if (!this.parcelasData) {
          console.error('❌ No se encontró el mapa en los archivos JSON.');
          return;
        }
        console.log('Datos del mapa:', this.parcelasData);

        // this.datosTarea = archivosJson[0]?.contenido.contenido.datos || null;
        let datos = archivosJson[0]?.contenido.contenido.datos || [];
        // Etiquetar cada registro con su autor
        const nombreUsuario = archivosJson[0]?.contenido?.contenido?.nombreUsuario
          || archivosAFusionar[0]?.subidoPor || '';
        datos = datos.map((d: any) => ({ ...d, nombreUsuario }));
        // 🆕 Expandir ocurrencias si es sotobosque
        datos = this.expandirOcurrencias(datos);
        this.datosTarea = datos;
        this.columnasDatos = this.obtenerColumnas(datos);

        if (!this.datosTarea) {
          console.error('❌ No se encontraron datos de la tarea en los archivos JSON.');
          return;
        }

        console.log('Datos de la tarea:', this.datosTarea);


      } catch (error) {
        console.error('❌ Error al leer archivos:', error);
      }

      setTimeout(() => {
        this.initMap();
      }, 1000);
      } // 🆕 Cerrar el bloque else
    }
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  get archivosFiltradosJSON() {
    return this.tarea?.archivosSubidos?.filter((a: any) => a.tipo === 'application/json') || [];
  }

  /**
   * 🆕 Expande las ocurrencias de sotobosque en filas individuales
   */
  expandirOcurrencias(datos: any[]): any[] {
    const resultado: any[] = [];

    datos.forEach(item => {
      // Si tiene ocurrencias (sotobosque nuevo formato)
      if (item.ocurrencias && Array.isArray(item.ocurrencias)) {
        item.ocurrencias.forEach((ocurrencia: any, index: number) => {
          resultado.push({
            nombre: `${item.nombre}-${ocurrencia.id || index + 1}`,
            tipo: item.tipo,
            momento: item.momento, // 🆕 Preservar momento
            nombreUsuario: item.nombreUsuario ?? '', // Preservar autor
            datos: {
              especie: ocurrencia.especie,
              longitud: ocurrencia.longitud,
              altura: ocurrencia.altura,
              porcionVerde: ocurrencia.porcionVerde,
              porcionSeca: ocurrencia.porcionSeca,
              total: ocurrencia.total,
              notas: ocurrencia.notas
            }
          });
        });
      } else {
        // Formato antiguo (arboles o sotobosque viejo)
        resultado.push(item);
      }
    });

    return resultado;
  }

  // obtenerColumnas(datos: any[]): string[] {
  //   const primerItem = datos?.[0]?.datos || {};
  //   return Object.keys(primerItem);
  // }

  obtenerColumnas(datos: any[]): string[] {
    // 🆕 Para sotobosque con ocurrencias, usar estructura de ocurrencias
    if (this.tarea.tipoTarea === 'medicion_sotobosque' && datos?.[0]?.ocurrencias) {
      const primerOcurrencia = datos[0].ocurrencias[0] || {};
      let ordenDeseado = ['especie', 'longitud', 'altura', 'porcionSeca', 'porcionVerde', 'total', 'notas'];
      // Agregar momento si existe
      if (datos[0]?.momento) {
        ordenDeseado.unshift('momento');
      }
      return ordenDeseado.filter(col => col in primerOcurrencia || col === 'momento');
    }

    const primerItem = datos?.[0]?.datos || {};
    let ordenDeseado: string[] = [];

    switch (this.tarea.tipoTarea) {
      case 'medicion_arboles':
        ordenDeseado = ['especie', 'dn', 'ht', 'hs', 'hv', 'dc1', 'dc2', 'superficieCopa', 'edad', 'notas'];
        break;

      case 'medicion_sotobosque':
        ordenDeseado = ['especie', 'longitud', 'altura', 'porcionSeca', 'porcionVerde', 'total', 'notas'];
        break;

      default:
        ordenDeseado = Object.keys(primerItem);
        break;
    }

    // 🆕 Agregar columna momento si los datos la tienen
    if (datos[0]?.momento) {
      ordenDeseado.unshift('momento');
    }

    return ordenDeseado.filter(col => col in primerItem || col === 'momento');
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

      // --- Capas base seleccionables (mismas que en crear-zonas-muestreos) ---
      const capaRelieve = L.tileLayer('https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=9ed48a0fdb4345aca36f4ec394272dd7', {
        attribution: '&copy; Thunderforest, OpenStreetMap contributors',
        maxZoom: 22,
        subdomains: ['a', 'b', 'c']
      });

      const capaCalles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      });

      const capaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics y la comunidad de usuarios GIS',
        maxZoom: 20
      });

      capaRelieve.addTo(this.map);

      L.control.layers({
        'Mapa (relieve)': capaRelieve,
        'Calles (OSM)': capaCalles,
        'Satélite': capaSatelite
      }, undefined, { position: 'topright', collapsed: true }).addTo(this.map);

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

      // this.map.on(L.Draw.Event.CREATED, async (event: any) => {

      //   const layer = event.layer;

      //   let tipo = '';
      //   if (event.layerType === 'circle') {
      //     tipo = 'Círculo';
      //     const radius = layer.getRadius();
      //     const center = layer.getLatLng();

      //     // Mostrar el modal y esperar el nombre
      //     const nombre = await this.mostrarDialogoNombreFigura();

      //     if (nombre) {
      //       // Guardar las propiedades del círculo
      //       layer.feature = layer.feature || {};
      //       layer.feature.type = 'Feature';
      //       layer.feature.properties = layer.feature.properties || {};
      //       layer.feature.properties.name = nombre;
      //       layer.feature.properties.radius = radius; // Guardar el radio
      //       layer.feature.geometry = {
      //         type: 'Point',
      //         coordinates: [center.lng, center.lat], // Guardar como punto con centro
      //       };

      //       layer.bindPopup(nombre).openPopup();
      //       this.drawnItems?.addLayer(layer); // Añade el layer al FeatureGroup
      //       this.circulos.push(layer); // 👈 Añadir nuevo círculo a la lista

      //     }
      //   } else if (event.layerType === 'marker') {
      //     tipo = 'Punto';
      //     const coordinates = layer.getLatLng();

      //     const tipoMarcador = await this.preguntarTipoMarcador();
      //     if (!tipoMarcador) return;

      //     const nombre = await this.mostrarDialogoNombreFigura();
      //     if (!nombre) return;

      //     // Inicializar estructura base
      //     const nuevoObjeto: any = {
      //       nombre,
      //       tipo: tipoMarcador,
      //       coordenadas: [coordinates.lng, coordinates.lat],
      //       datos: []
      //     };

      //     this.activarFormulario(tipoMarcador);
      //     this.guardarEntidad(tipoMarcador, nuevoObjeto);
      //     const resultado = await this.datosFormulario(nombre);
      //     if (resultado) {
      //       nuevoObjeto.datos = resultado;
      //       // this.guardarEntidad(tipoMarcador, nuevoObjeto);
      //       console.log(`🌳 Datos guardados para ${tipoMarcador}:`, nuevoObjeto);
      //     } else {
      //       console.log('🚫 El usuario canceló el formulario');
      //     }

      //     if (nombre && tipoMarcador) {
      //       // Asignar el icono según el tipo
      //       const icono = tipoMarcador === 'arbol'
      //         ? L.icon({
      //           iconUrl: 'assets/leaflet/images/arbol.png',
      //           iconSize: [32, 32],
      //           iconAnchor: [16, 32],
      //           popupAnchor: [0, -32]
      //         })
      //         : tipoMarcador === 'sotobosque'
      //           ? L.icon({
      //             iconUrl: 'assets/leaflet/images/sotobosque.png',
      //             iconSize: [32, 32],
      //             iconAnchor: [16, 32],
      //             popupAnchor: [0, -32]
      //           })
      //           : L.icon({
      //             iconUrl: 'assets/leaflet/images/marker-icon.png',
      //             shadowUrl: 'assets/leaflet/images/marker-shadow.png',
      //             iconSize: [25, 41],
      //             iconAnchor: [12, 41],
      //             popupAnchor: [1, -34],
      //             shadowSize: [41, 41],
      //           });

      //       layer.setIcon(icono);

      //       layer.feature = layer.feature || {};
      //       layer.feature.type = 'Feature';
      //       layer.feature.properties = { name: nombre, tipo: tipoMarcador };
      //       layer.feature.geometry = {
      //         type: 'Point',
      //         coordinates: [coordinates.lng, coordinates.lat]
      //       };

      //       layer.bindPopup(nombre).openPopup();
      //       this.drawnItems?.addLayer(layer);
      //     }
      //   } else if (event.layerType === 'polyline') {
      //     tipo = 'Línea';
      //     const coordinates = layer.getLatLngs().map((latlng: any) => [latlng.lng, latlng.lat]);

      //     // Mostrar el modal y esperar el nombre
      //     const nombre = await this.mostrarDialogoNombreFigura();



      //     if (nombre) {
      //       // Guardar las propiedades de la línea
      //       layer.feature = layer.feature || {};
      //       layer.feature.type = 'Feature';
      //       layer.feature.properties = layer.feature.properties || {};
      //       layer.feature.properties.name = nombre;
      //       layer.feature.geometry = {
      //         type: 'LineString',
      //         coordinates: coordinates, // Guardar como LineString correctamente
      //       };

      //       layer.bindPopup(nombre).openPopup();
      //       this.drawnItems?.addLayer(layer);

      //     }
      //   } else {
      //     tipo = 'Figura';
      //     // Mostrar el modal y esperar el nombre
      //     const nombre = await this.mostrarDialogoNombreFigura();



      //     if (nombre) {
      //       // Guardar las propiedades de otras figuras
      //       layer.feature = layer.feature || {};
      //       layer.feature.type = 'Feature';
      //       layer.feature.properties = layer.feature.properties || {};
      //       layer.feature.properties.name = nombre;

      //       layer.bindPopup(nombre).openPopup();
      //       this.drawnItems?.addLayer(layer);
      //     }
      //   }

      // });

      // this.map.on(L.Draw.Event.DELETED, (event: any) => {
      //   const layers = event.layers;

      //   const idsAEliminar: string[] = [];
      //   const layersAEliminar: any[] = [];

      //   layers.eachLayer((layer: any) => {
      //     const id = L.Util.stamp(layer).toString();
      //     idsAEliminar.push(id);
      //     layersAEliminar.push(layer);
      //   });

      //   layers.eachLayer((layer: any) => {
      //     // Elimina el círculo si está en la lista
      //     const index = this.circulos.indexOf(layer);
      //     if (index !== -1) {
      //       this.circulos.splice(index, 1); // 👈 Eliminarlo de la lista
      //     }
      //   });

      // });

      this.cargarFiguras();

      // Leaflet calcula el tamaño del contenedor al crearse; si el modal
      // aún está abriéndose (animación fade) el contenedor mide 0 y el mapa
      // sale en blanco. Recalcular cuando el modal esté visible del todo y
      // encuadrar la vista sobre las figuras de la tarea (no sobre un
      // centro fijo).
      const ajustarVista = () => {
        this.map?.invalidateSize();
        const bounds = this.drawnItems?.getBounds();
        if (bounds && bounds.isValid()) {
          this.map?.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
        }
      };

      const modalElement = document.getElementById('verMapaFusion');
      if (modalElement) {
        modalElement.addEventListener('shown.bs.modal', ajustarVista, { once: true });
      }
      setTimeout(ajustarVista, 300);
      setTimeout(ajustarVista, 800);
    }, 100);

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

    this.cargarFigurasRestantes();

    // console.log(this.drawnItems.getLayers().length);
  }

  cargarFigurasRestantes() {
    if (this.tarea?.fusion?.mapaRestante?.length) {
      console.log('🔄 Pintando puntos del mapaRestante...');

      this.tarea.fusion.mapaRestante.forEach((elemento: any) => {
        const coords = elemento.coordenadas;
        if (!Array.isArray(coords) || coords.length !== 2) {
          console.warn('⚠️ Coordenadas inválidas:', coords);
          return;
        }

        const latlng: [number, number] = [coords[1], coords[0]];

        let icon = undefined;

        if (elemento.tipo === 'arbol') {
          icon = L.icon({
            iconUrl: 'assets/leaflet/images/arbol.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          });
        } else if (elemento.tipo === 'sotobosque') {
          icon = L.icon({
            iconUrl: 'assets/leaflet/images/sotobosque.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          });
        }

        const marker = L.marker(latlng, icon ? { icon } : undefined);

        if (elemento.nombre) {
          marker.bindPopup(elemento.nombre);
        }

        this.drawnItems.addLayer(marker);
      });

      console.log('✅ Puntos del mapaRestante pintados');
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


  cambiarSeccion(seccion: any) {
    this.seccionActiva = seccion;
    this.actualizarPosicionIndicador();

    switch (seccion) {
      case 'datos':
        break;

      case 'mapa':
        this.initMap();
        break;
    }
  }

  actualizarPosicionIndicador() {
    this.indicadorPosicion = this.seccionActiva === 'mapa' ? '0%' : '50%';
  }


}
