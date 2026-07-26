import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UserData } from 'src/app/data/user-data';
import { EstudiosPage } from 'src/app/pages/estudios/estudios.page';
import * as L from 'leaflet';
import { LocalidadesService } from 'src/app/services/localidades.service';
import { BackService } from 'src/app/services/back.service';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseConfig } from 'src/environments/firebase-config';


@Component({
  selector: 'app-ver-estudio-modal',
  templateUrl: './ver-estudio-modal.component.html',
  styleUrls: ['./ver-estudio-modal.component.css']
})
export class VerEstudioModalComponent implements OnInit {

  @Input() idEstudio!: string;
  @Output() cerrar = new EventEmitter<void>();
  seccionActiva: string = 'info'; // Estado inicial: pestaña Información
  indicadorPosicion: number = 0; // Posición inicial de la barra indicadora
  estudioData: any = null;
  tareasAsignadas: any[] = [];
  private map!: L.Map;
  private drawnItems!: L.FeatureGroup;
  parcelasData: any = null;
  esMiEstudio: boolean = true;
  estudioBack: any
  idTareaSeleccionada: any; // ID de la tarea seleccionada para subir datos
  archivosYaSubidos: any[] = []; // Archivos ya subidos para la tarea seleccionada
  momentoSeleccionado: string | null = null; // 🆕 Momento seleccionado para subida
  tareaActual: any = null; // 🆕 Tarea actual en modo subida
  momentosDisponibles: any[] = []; // 🆕 Momentos disponibles de la tarea

  //para el modo de subir datos de las tareas
  modoSubirDatos: boolean = false;
  dragOver = false;
  archivosSeleccionados: File[] = [];
  userEmail: any = UserData.getUserEmail(); // Email del usuario actual
  mensajeError: string = '';
  errorArchivoDuplicado: boolean = false;
  subiendoArchivos: boolean = false; // Loading mientras se suben los archivos
  subidaCompletada: boolean = false; // Subida finalizada con éxito
  archivoAEliminar: string | null = null; // Archivo con confirmación de borrado abierta
  eliminandoArchivo: string | null = null; // Archivo que se está eliminando (spinner)
  archivosMultimediaPendientes: {nombre: string, tipo: string, entidadNombre: string}[] = [];


  constructor(private localidades: LocalidadesService, private back: BackService) { }

  ngOnInit(): void {
    // Buscar el estudio en la lista de estudios cargados localmente
    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.id === this.idEstudio
    );

    if (estudioSeleccionado) {
      // Si el estudio está en la lista local, lo cargamos
      this.esMiEstudio = true;
      this.cargarDatosEstudio(this.idEstudio);
    } else {
      // Si el estudio no está en la lista local, lo obtenemos del backend
      this.esMiEstudio = false;
      this.cargarDatosEstudioBack(this.idEstudio);
    }
    this.userEmail = UserData.getUserEmail();
  }

  // #region Cargar datos del estudio SI ES MI ESTUDIO

  cargarDatosEstudio(idEstudio: string): void {
    // Buscar el estudio en la lista de estudios de EstudiosPage
    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.id === idEstudio
    );

    if (!estudioSeleccionado) {
      console.error(`Estudio con ID ${idEstudio} no encontrado.`);
      return;
    }

    this.estudioData = estudioSeleccionado.data?.NuevoEstudioFormData;

    if (!this.estudioData) {
      console.error(`No se encontraron datos para el estudio con ID ${idEstudio}.`);
    } else {
      console.log('Datos del estudio desde EstudiosPage:', estudioSeleccionado.data);
    }
  }

  cargarDatosTareas(idEstudio: string): void {
    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.id === idEstudio
    );

    if (!estudioSeleccionado || !estudioSeleccionado.data?.TareasData) {
      console.error(`No se encontraron tareas para el estudio con ID ${idEstudio}.`);
      return;
    }

    const tareas = estudioSeleccionado.data.TareasData;
    const userEmail = UserData.getUserEmail(); // Obtener email del usuario actual

    // Filtrar tareas asignadas al usuario
    this.tareasAsignadas = tareas.filter((tarea: { trabajador: string | any[] }) => {
      if (Array.isArray(tarea.trabajador)) {
        return tarea.trabajador.includes(userEmail);
      }

      // Si es un string, dividimos por coma y comparamos
      if (typeof tarea.trabajador === 'string') {
        const trabajadores = tarea.trabajador
          .split(',')
          .map((t: string) => t.trim().toLowerCase());

        return trabajadores.includes(userEmail.toLowerCase());
      }

      return false;
    });


    console.log('Tareas asignadas:', this.tareasAsignadas);
  }

  cargarParcelasData(idEstudio: string): void {
    const estudioSeleccionado = EstudiosPage.Instance.estudios.find(
      (estudio) => estudio.id === idEstudio
    );

    if (!estudioSeleccionado || !estudioSeleccionado.data?.ParcelasData) {
      console.error(`No se encontraron parcelas para el estudio con ID ${idEstudio}.`);
      return;
    }

    this.parcelasData = estudioSeleccionado.data.ParcelasData;
    this.initMap();
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

      const provincia = this.estudioData?.provincia;
      const municipio = this.estudioData?.poblacion;
      const coordenadas = this.localidades.getCoordenadas(provincia, municipio);
      const centro = coordenadas || [38.994349, -1.858542]; // Coordenadas de Albacete por defecto

      this.map = L.map('map', {
        center: centro,
        zoom: 13,
        zoomControl: true, // Permitir zoom pero sin edición
        dragging: true,
        doubleClickZoom: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
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
      } else {
        const layer = L.geoJSON(feature, {
          onEachFeature: (f, l) => {
            if (f.properties && f.properties.name) {
              l.bindPopup(f.properties.name);
            }
          },
        }).getLayers()[0];

        console.log("Layer que se va a añadir:", layer);
        this.drawnItems.addLayer(layer);
      }
    });

    console.log(this.drawnItems.getLayers().length);
  }


  // #endregion

  // #region Cargar datos del estudio SI ES MI ESTUDIO

  async cargarDatosEstudioBack(idEstudio: string) {
    try {
      const data = await this.back.obtenerEstudioPorIdParaUsuario(idEstudio, UserData.getUserEmail());
      console.log('Datos del estudio cargados desde el backend:', data);

      this.estudioBack = data;
      this.estudioData = data.NuevoEstudioFormData || null;
      this.parcelasData = data.ParcelasData || null;
      this.tareasAsignadas = data.TareasData || [];

      // if (this.parcelasData) {
      //   this.initMap();
      // }
    } catch (error) {
      console.error('Error al cargar el estudio desde el backend:', error);
    }
  }

  // #endregion

  cerrarModal() {
    this.cerrar.emit();
  }

  // #region Navegación entre secciones

  cambiarSeccion(seccion: string) {
    this.seccionActiva = seccion;
    this.modoSubirDatos = false; // Resetear el modo de subir datos al cambiar de sección
    this.resetearVariablesSubida(); // 🆕 Limpiar variables
    this.actualizarPosicionIndicador();

    switch (seccion) {
      case 'tareas':
        this.esMiEstudio && this.cargarDatosTareas(this.idEstudio);
        break;

      case 'mapa':
        this.esMiEstudio ? this.cargarParcelasData(this.idEstudio) : this.initMap();
        break;
    }
  }


  anteriorSeccion() {
    if (this.seccionActiva === 'mapa') {
      this.cambiarSeccion('info');
    } else if (this.seccionActiva === 'tareas') {
      this.cambiarSeccion('mapa');
    }
  }

  siguienteSeccion() {
    if (this.seccionActiva === 'info') {
      this.cambiarSeccion('mapa');
    } else if (this.seccionActiva === 'mapa') {
      this.cambiarSeccion('tareas');
    }
  }

  actualizarPosicionIndicador() {
    if (this.seccionActiva === 'info') {
      this.indicadorPosicion = 0;
    } else if (this.seccionActiva === 'mapa') {
      this.indicadorPosicion = 33.3;
    } else if (this.seccionActiva === 'tareas') {
      this.indicadorPosicion = 66.6;
    }
  }

  // #endregion


  // #region SUBIR DATOS TAREAS

  // 🆕 Resetear variables de subida
  resetearVariablesSubida() {
    this.momentoSeleccionado = null;
    this.tareaActual = null;
    this.momentosDisponibles = [];
    this.archivosSeleccionados = [];
    this.archivosYaSubidos = [];
    this.mensajeError = '';
    this.errorArchivoDuplicado = false;
    this.archivosMultimediaPendientes = [];
  }

  async subirDatosTarea(tarea: any) {
    console.log('Iniciando subida de datos para tarea:', tarea);

    this.archivosSeleccionados = [];
    this.archivosMultimediaPendientes = [];
    this.mensajeError = '';
    this.errorArchivoDuplicado = false;
    this.subiendoArchivos = false;
    this.subidaCompletada = false;
    this.archivoAEliminar = null;
    this.eliminandoArchivo = null;

    this.idTareaSeleccionada = tarea.id;
    this.tareaActual = tarea; // 🆕 Guardar la tarea actual
    this.modoSubirDatos = true;

    // 🆕 Si la tarea tiene momentos, cargar la lista y NO preseleccionar ninguno
    if (tarea.tieneMomentos && tarea.momentos) {
      this.momentosDisponibles = Object.keys(tarea.momentos).map(nombreMomento => ({
        nombre: nombreMomento,
        tieneArchivos: tarea.momentos[nombreMomento]?.archivosSubidos?.length > 0,
        status: tarea.momentos[nombreMomento]?.status || 'pending'
      }));
      this.momentoSeleccionado = null; // El usuario debe seleccionar uno
      this.archivosYaSubidos = []; // Vacío hasta que se seleccione un momento
    } else {
      // 🔄 Tarea SIN momentos - Cargar archivos directamente
      this.momentosDisponibles = [];
      this.momentoSeleccionado = null;

      await this.back.obtenerEstudioPorIdParaUsuario(this.idEstudio, UserData.getUserEmail())
        .then(estudio => {
          const tareaActualizada = estudio.TareasData.find((t: any) => t.id === tarea.id);
          if (tareaActualizada?.archivosSubidos) {
            this.archivosYaSubidos = tareaActualizada.archivosSubidos;
          } else {
            this.archivosYaSubidos = [];
          }
        });
    }
  }

  // 🆕 Método que se ejecuta cuando cambia la selección del momento
  async onMomentoChange() {
    if (!this.momentoSeleccionado || !this.tareaActual) return;

    console.log('Momento seleccionado:', this.momentoSeleccionado);

    // Cargar archivos ya subidos para este momento
    await this.back.obtenerEstudioPorIdParaUsuario(this.idEstudio, UserData.getUserEmail())
      .then(estudio => {
        const tareaActualizada = estudio.TareasData.find((t: any) => t.id === this.tareaActual.id);
        if (tareaActualizada?.momentos?.[this.momentoSeleccionado!]?.archivosSubidos) {
          this.archivosYaSubidos = tareaActualizada.momentos[this.momentoSeleccionado!].archivosSubidos;
        } else {
          this.archivosYaSubidos = [];
        }
      });
  }

  // 🆕 Controlar el clic en la zona de subida
  onDropzoneClick(fileInput: HTMLInputElement) {
    // Si la tarea tiene momentos y no se ha seleccionado uno, intentar subir para auto-detectar
    if (this.tareaActual?.tieneMomentos && !this.momentoSeleccionado) {
      // Permitir seleccionar archivos para que se auto-detecte el momento
      fileInput.click();
      return;
    }
    fileInput.click();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    // Siempre permitir drag, la validación se hace al procesar los archivos
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;

    // No validar aquí, dejar que handleFiles se encargue de la auto-detección
    if (event.dataTransfer?.files.length) {
      const files = Array.from(event.dataTransfer.files);
      this.handleFiles(files);
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const files = Array.from(input.files);
      this.handleFiles(files);
    }
  }

  async handleFiles(files: File[]) {
    // Al añadir archivos nuevos, ocultar el estado de subida completada
    this.subidaCompletada = false;

    const nuevosArchivos = files.filter(file => {
      const yaExiste =
        this.archivosSeleccionados.some(a => a.name === file.name) ||
        this.archivosYaSubidos.some(a => a.nombre === file.name);
      return !yaExiste;
    });

    if (nuevosArchivos.length < files.length) {
      this.mostrarErrorArchivoDuplicado();
    }

    this.archivosSeleccionados.push(...nuevosArchivos);

    // 🆕 Auto-detección de momento desde archivos JSON
    if (this.tareaActual?.tieneMomentos && !this.momentoSeleccionado) {
      await this.detectarMomentoDesdeJSON(nuevosArchivos);
    }

    // Detectar archivos multimedia referenciados en el JSON
    await this.procesarMultimediaDelJSON();
  }

  // 🆕 Detectar momento automáticamente desde archivos JSON
  async detectarMomentoDesdeJSON(archivos: File[]) {
    // Buscar el primer archivo JSON
    const archivoJSON = archivos.find(f => f.type === 'application/json' || f.name.endsWith('.json'));

    if (!archivoJSON) {
      console.log('📄 No hay archivos JSON, el usuario debe seleccionar el momento manualmente');
      return;
    }

    try {
      // Leer el contenido del JSON
      const contenido = await this.leerArchivoComoTexto(archivoJSON);
      const json = JSON.parse(contenido);

      // Extraer el atributo "momento"
      const momentoDetectado = json.momento || json.mapa?.momento;

      if (!momentoDetectado) {
        console.log('⚠️ El JSON no contiene atributo "momento"');
        return;
      }

      // Verificar que el momento existe en los momentos disponibles
      const momentoExiste = this.momentosDisponibles.some(m => m.nombre === momentoDetectado);

      if (momentoExiste) {
        this.momentoSeleccionado = momentoDetectado;
        console.log(`✅ Momento detectado automáticamente: "${momentoDetectado}"`);

        // Cargar archivos ya subidos para este momento
        await this.onMomentoChange();
      } else {
        console.warn(`⚠️ El momento "${momentoDetectado}" del JSON no existe en esta tarea`);
        console.log('Momentos disponibles:', this.momentosDisponibles.map(m => m.nombre));
      }

    } catch (error) {
      console.error('❌ Error al leer el JSON para detectar momento:', error);
    }
  }

  // 🆕 Método auxiliar para leer archivo como texto
  private leerArchivoComoTexto(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(archivo);
    });
  }

  // 🆕 Validar que todos los JSON tengan el mismo momento que el seleccionado
  async validarMomentosJSON(): Promise<{ valido: boolean, mensaje: string }> {
    const archivosJSON = this.archivosSeleccionados.filter(
      f => f.type === 'application/json' || f.name.endsWith('.json')
    );

    if (archivosJSON.length === 0) {
      // No hay JSON, solo fotos/audios - está bien
      return { valido: true, mensaje: '' };
    }

    try {
      for (const archivo of archivosJSON) {
        const contenido = await this.leerArchivoComoTexto(archivo);
        const json = JSON.parse(contenido);
        const momentoJSON = json.momento || json.mapa?.momento;

        if (momentoJSON && momentoJSON !== this.momentoSeleccionado) {
          return {
            valido: false,
            mensaje: `⚠️ El archivo "${archivo.name}" tiene momento "${momentoJSON}" pero has seleccionado "${this.momentoSeleccionado}". Por favor, corrige la selección o el archivo.`
          };
        }

        if (!momentoJSON) {
          return {
            valido: false,
            mensaje: `⚠️ El archivo "${archivo.name}" no contiene el atributo "momento". Asegúrate de que el JSON sea válido.`
          };
        }
      }

      return { valido: true, mensaje: '' };

    } catch (error) {
      return {
        valido: false,
        mensaje: '❌ Error al validar los archivos JSON. Verifica que sean archivos válidos.'
      };
    }
  }



  async eliminarArchivo(index: number) {
    this.archivosSeleccionados.splice(index, 1);

    // 🆕 Si se eliminan todos los archivos JSON, resetear el momento auto-detectado
    if (this.tareaActual?.tieneMomentos) {
      const tieneJSON = this.archivosSeleccionados.some(
        f => f.type === 'application/json' || f.name.endsWith('.json')
      );

      if (!tieneJSON) {
        console.log('📄 No quedan archivos JSON, reseteando momento');
        this.momentoSeleccionado = null;
        this.archivosYaSubidos = [];
      }
    }

    // Reprocesar multimedia tras eliminar un archivo
    await this.procesarMultimediaDelJSON();
  }


  async confirmarSubida() {
    // 🆕 Validar que se haya seleccionado momento si la tarea lo requiere
    if (this.tareaActual?.tieneMomentos && !this.momentoSeleccionado) {
      this.mensajeError = 'Debes seleccionar un momento antes de subir archivos';
      setTimeout(() => this.mensajeError = '', 3000);
      return;
    }

    // 🆕 Validar que los JSON coincidan con el momento seleccionado
    if (this.tareaActual?.tieneMomentos && this.momentoSeleccionado) {
      const validacion = await this.validarMomentosJSON();
      if (!validacion.valido) {
        this.mensajeError = validacion.mensaje;
        setTimeout(() => this.mensajeError = '', 5000);
        return;
      }
    }

    // Mostrar el estado de carga en el botón durante toda la subida
    this.subiendoArchivos = true;
    this.subidaCompletada = false;
    this.mensajeError = '';

    try {
      const archivosSubidos = await this.subirArchivosAFirebase(
        this.archivosSeleccionados,
        this.idEstudio,
        this.idTareaSeleccionada,
        this.momentoSeleccionado // 🆕 Pasar el momento (puede ser null)
      );

      this.back
        .subirArchivosTarea(
          this.idEstudio,
          this.idTareaSeleccionada,
          archivosSubidos,
          UserData.getUserEmail(),
          this.momentoSeleccionado // 🆕 Enviar momento al backend
        )
        .then(obs => obs.subscribe({
          next: () => {
            console.log('Archivos guardados correctamente');
            this.archivosYaSubidos.push(...archivosSubidos);
            this.archivosSeleccionados = [];
            this.archivosMultimediaPendientes = [];
            // No salimos del modo subida ni cerramos: se muestra el estado de
            // éxito y el usuario cierra el modal manualmente cuando quiera
            this.subiendoArchivos = false;
            this.subidaCompletada = true;
          },
          error: (error: any) => {
            console.error('Error al subir archivos:', error);
            this.subiendoArchivos = false;
            this.mensajeError = 'Error al guardar los archivos. Inténtalo de nuevo.';
          }
        }))
        .catch(error => {
          console.error('Error al subir archivos:', error);
          this.subiendoArchivos = false;
          this.mensajeError = 'Error al guardar los archivos. Inténtalo de nuevo.';
        });
    } catch (error) {
      console.error('Error al subir archivos a Firebase:', error);
      this.subiendoArchivos = false;
      this.mensajeError = 'Error al subir los archivos. Inténtalo de nuevo.';
    }
  }


  async subirArchivosAFirebase(
    archivos: File[],
    idEstudio: string,
    idTarea: string,
    momento: string | null = null // 🆕 Parámetro opcional
  ) {
    // Inicializar Firebase storage
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);

    const urls: any[] = [];

    for (const archivo of archivos) {
      // 🆕 Estructura de rutas diferenciada por momento
      const ruta = momento
        ? `estudios/${idEstudio}/tareas/${idTarea}/${momento}/${archivo.name}` // CON momento
        : `estudios/${idEstudio}/tareas/${idTarea}/${archivo.name}`;            // SIN momento

      const archivoRef = ref(storage, ruta);
      await uploadBytes(archivoRef, archivo);
      const url = await getDownloadURL(archivoRef);

      urls.push({
        nombre: archivo.name,
        url,
        tipo: archivo.type,
        fecha: new Date().toISOString()
      });
    }

    return urls;
  }

  /** Abre la confirmación inline de borrado para un archivo */
  pedirConfirmacionEliminar(archivo: any) {
    this.archivoAEliminar = archivo.nombre;
  }

  /** Cierra la confirmación inline sin borrar */
  cancelarEliminarArchivo() {
    this.archivoAEliminar = null;
  }

  async eliminarArchivoSubido(archivo: any) {
    this.archivoAEliminar = null;
    this.eliminandoArchivo = archivo.nombre; // Mostrar spinner en la fila

    try {
      // 🆕 Incluir momento si la tarea lo requiere
      const momento = this.tareaActual?.tieneMomentos ? this.momentoSeleccionado : null;
      await this.back.eliminarArchivoTarea(this.idEstudio, this.idTareaSeleccionada, archivo.nombre, momento);
      this.archivosYaSubidos = this.archivosYaSubidos.filter(a => a.nombre !== archivo.nombre);
    } catch (error) {
      console.error('Error al eliminar el archivo:', error);
      this.mensajeError = `No se pudo eliminar "${archivo.nombre}". Inténtalo de nuevo.`;
      setTimeout(() => this.mensajeError = '', 4000);
    } finally {
      this.eliminandoArchivo = null;
    }
  }

  mostrarErrorArchivoDuplicado() {
    this.errorArchivoDuplicado = true;
    this.mensajeError = 'Algunos archivos ya han sido seleccionados o subidos previamente.';

    setTimeout(() => {
      this.errorArchivoDuplicado = false;
      this.mensajeError = '';
    }, 5000);
  }

  // Leer el JSON seleccionado y extraer los archivos multimedia referenciados
  async procesarMultimediaDelJSON() {
    const archivoJSON = this.archivosSeleccionados.find(
      f => f.type === 'application/json' || f.name.endsWith('.json')
    );

    if (!archivoJSON) {
      this.archivosMultimediaPendientes = [];
      return;
    }

    try {
      const contenido = await this.leerArchivoComoTexto(archivoJSON);
      const json = JSON.parse(contenido);

      // Validar que el JSON pertenece al usuario actual
      const nombreUsuarioJSON = json?.nombreUsuario;
      const emailActual = UserData.getUserEmail();
      if (nombreUsuarioJSON && nombreUsuarioJSON.toLowerCase() !== emailActual?.toLowerCase()) {
        // Eliminar el JSON de la selección y mostrar error
        this.archivosSeleccionados = this.archivosSeleccionados.filter(
          f => f !== archivoJSON
        );
        this.archivosMultimediaPendientes = [];
        this.mensajeError = `❌ Este archivo pertenece al usuario "${nombreUsuarioJSON}" y no puede ser subido con tu cuenta.`;
        setTimeout(() => this.mensajeError = '', 6000);
        return;
      }

      const adjuntos = json?.multimedia?.adjuntos;

      if (!adjuntos || adjuntos.length === 0) {
        this.archivosMultimediaPendientes = [];
        return;
      }

      this.archivosMultimediaPendientes = adjuntos.map((adjunto: any) => ({
        nombre: adjunto.path.split('/').pop() || adjunto.nombre,
        tipo: adjunto.tipo,
        entidadNombre: adjunto.entidadNombre || ''
      }));
    } catch (error) {
      console.error('Error al procesar multimedia del JSON:', error);
      this.archivosMultimediaPendientes = [];
    }
  }

  estaMultimediaSeleccionada(nombre: string): boolean {
    const nombreLower = nombre.toLowerCase();
    return this.archivosSeleccionados.some(f => f.name.toLowerCase() === nombreLower) ||
           this.archivosYaSubidos.some(a => a.nombre.toLowerCase() === nombreLower);
  }


  // #endregion


}


