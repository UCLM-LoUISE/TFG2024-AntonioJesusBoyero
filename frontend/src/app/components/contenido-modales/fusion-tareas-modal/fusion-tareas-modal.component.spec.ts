import { FusionTareasModalComponent } from './fusion-tareas-modal.component';

describe('FusionTareasModalComponent', () => {
  let component: FusionTareasModalComponent;
  let mockBack: any;

  const json1 = { nombre: 'a1.json', tipo: 'application/json', subidoPor: 'ana@x.com' };
  const json2 = { nombre: 'a2.json', tipo: 'application/json', subidoPor: 'luis@x.com' };
  const json3 = { nombre: 'b1.json', tipo: 'application/json', subidoPor: 'ana@x.com' };
  const json4 = { nombre: 'b2.json', tipo: 'application/json', subidoPor: 'marta@x.com' };
  const foto = { nombre: 'foto.png', tipo: 'image/png', subidoPor: 'ana@x.com' };

  function contenidoDe(nombre: string) {
    return {
      contenido: {
        mapa: { type: 'FeatureCollection', features: [{ id: nombre }] },
        datos: [{ nombre: `arbol-${nombre}`, tipo: 'arbol' }]
      }
    };
  }

  function crearTareaConMomentos() {
    return {
      id: 'tarea-1',
      tieneMomentos: true,
      momentos: {
        m1: { archivosSubidos: [json1, json2, foto] },
        m2: { archivosSubidos: [json3, json4] },
        m3: { archivosSubidos: [json1] } // solo un JSON: sin conflicto
      }
    };
  }

  beforeEach(() => {
    mockBack = {
      leerArchivoTarea: jasmine.createSpy('leerArchivoTarea').and.callFake(
        (_idEstudio: any, _idTarea: any, nombre: string, _momento?: any) =>
          Promise.resolve(contenidoDe(nombre))
      )
    };
    component = new FusionTareasModalComponent(mockBack);
    component.idEstudio = 'estudio-1';
  });

  describe('ngOnInit', () => {
    it('should detect conflicting momentos and pre-select the first pending one', () => {
      component.tarea = crearTareaConMomentos();
      component.ngOnInit();

      expect(component.momentosConConflictos).toEqual(['m1', 'm2']);
      expect(component.momentoSeleccionado).toBe('m1');
      expect(component.completado).toBeFalse();
      expect(component.archivoPrincipalSeleccionado).toBe(json1);
    });

    it('should show the completed state when every conflicting momento is already fused', () => {
      const tarea = crearTareaConMomentos();
      tarea.momentos.m1 = { ...tarea.momentos.m1, fusionado: true } as any;
      tarea.momentos.m2 = { ...tarea.momentos.m2, fusionado: true } as any;
      component.tarea = tarea;
      component.ngOnInit();

      expect(component.completado).toBeTrue();
      expect(component.momentoSeleccionado).toBeNull();
    });

    it('should mark completed for a fused task without momentos', () => {
      component.tarea = { id: 't', fusionada: true, archivosSubidos: [json1] };
      component.ngOnInit();
      expect(component.completado).toBeTrue();
      expect(component.archivoPrincipalSeleccionado).toBe(json1);
    });

    it('should preselect the first JSON for a plain task without momentos', () => {
      component.tarea = { id: 't', archivosSubidos: [foto, json1, json2] };
      component.ngOnInit();
      expect(component.momentosConConflictos).toEqual([]);
      expect(component.archivoPrincipalSeleccionado).toBe(json1);
    });

    it('should leave no principal file when there are no JSON files', () => {
      component.tarea = { id: 't', archivosSubidos: [foto] };
      component.ngOnInit();
      expect(component.archivoPrincipalSeleccionado).toBeNull();
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      component.tarea = crearTareaConMomentos();
      component.ngOnInit();
    });

    it('momentosPendientes and momentosFusionados should split by fusion state', () => {
      expect(component.momentosPendientes).toEqual(['m1', 'm2']);
      expect(component.momentosFusionados).toEqual([]);

      component.tarea.momentos.m1.fusionado = true;
      expect(component.momentosPendientes).toEqual(['m2']);
      expect(component.momentosFusionados).toEqual(['m1']);
    });

    it('porcentajeProgreso should compute the fused percentage', () => {
      expect(component.porcentajeProgreso).toBe(0);
      component.tarea.momentos.m1.fusionado = true;
      expect(component.porcentajeProgreso).toBe(50);
      component.tarea.momentos.m2.fusionado = true;
      expect(component.porcentajeProgreso).toBe(100);
    });

    it('porcentajeProgreso should be 0 without conflicting momentos', () => {
      component.momentosConConflictos = [];
      expect(component.porcentajeProgreso).toBe(0);
    });

    it('archivosFiltradosJSON should filter by selected momento', () => {
      component.momentoSeleccionado = 'm1';
      expect(component.archivosFiltradosJSON).toEqual([json1, json2]);
      component.momentoSeleccionado = 'm2';
      expect(component.archivosFiltradosJSON).toEqual([json3, json4]);
      component.momentoSeleccionado = 'inexistente';
      expect(component.archivosFiltradosJSON).toEqual([]);
    });

    it('archivosFiltradosJSON should use archivosSubidos for tasks without momentos', () => {
      component.tarea = { id: 't', archivosSubidos: [foto, json1] };
      component.momentoSeleccionado = null;
      expect(component.archivosFiltradosJSON).toEqual([json1]);

      component.tarea = { id: 't' };
      expect(component.archivosFiltradosJSON).toEqual([]);
    });
  });

  it('cerrarModal should emit cerrar', () => {
    component.tarea = { id: 't', archivosSubidos: [] };
    const spy = jasmine.createSpy('cerrar');
    component.cerrar.subscribe(spy);
    component.cerrarModal();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('verArchivo should open the url in a new tab', () => {
    const openSpy = spyOn(window, 'open');
    component.verArchivo('http://x/a.json');
    expect(openSpy).toHaveBeenCalledOnceWith('http://x/a.json', '_blank');
  });

  it('onMomentoChange should clear messages and re-preselect the principal file', () => {
    component.tarea = crearTareaConMomentos();
    component.ngOnInit();
    component.errorMsg = 'error';
    component.mensajeExito = 'ok';
    component.momentoSeleccionado = 'm2';
    component.onMomentoChange();
    expect(component.errorMsg).toBeNull();
    expect(component.mensajeExito).toBeNull();
    expect(component.archivoPrincipalSeleccionado).toBe(json3);
  });

  describe('seleccionarMomento', () => {
    beforeEach(() => {
      component.tarea = crearTareaConMomentos();
      component.ngOnInit();
    });

    it('should select a pending momento', () => {
      component.seleccionarMomento('m2');
      expect(component.momentoSeleccionado).toBe('m2');
      expect(component.archivoPrincipalSeleccionado).toBe(json3);
    });

    it('should ignore selection while loading', () => {
      component.cargando = true;
      component.seleccionarMomento('m2');
      expect(component.momentoSeleccionado).toBe('m1');
    });

    it('should ignore already fused momentos', () => {
      component.tarea.momentos.m2.fusionado = true;
      component.seleccionarMomento('m2');
      expect(component.momentoSeleccionado).toBe('m1');
    });
  });

  describe('fusionarTareas', () => {
    it('should fail when no principal file is selected', async () => {
      component.tarea = { id: 't', archivosSubidos: [foto] };
      component.ngOnInit();
      await component.fusionarTareas();
      expect(component.errorMsg).toBe('Debes seleccionar un archivo general antes de fusionar.');
      expect(mockBack.leerArchivoTarea).not.toHaveBeenCalled();
    });

    it('should fuse pending momentos one by one and finish with the completed state', async () => {
      component.tarea = crearTareaConMomentos();
      component.ngOnInit();

      const emitted: any[] = [];
      component.fusionTerminada.subscribe((e: any) => {
        emitted.push(e);
        // El padre guarda la fusión y marca el momento como fusionado
        component.tarea.momentos[e.momento].fusionado = true;
      });

      // Primera fusión: momento m1
      await component.fusionarTareas();

      expect(mockBack.leerArchivoTarea).toHaveBeenCalledWith('estudio-1', 'tarea-1', 'a1.json', 'm1');
      expect(mockBack.leerArchivoTarea).toHaveBeenCalledWith('estudio-1', 'tarea-1', 'a2.json', 'm1');
      expect(emitted.length).toBe(1);
      expect(emitted[0].idTarea).toBe('tarea-1');
      expect(emitted[0].momento).toBe('m1');
      expect(emitted[0].contenido.mapa).toEqual(contenidoDe('a1.json').contenido.mapa);
      // datos fusionados de ambos archivos con el autor incrustado
      expect(emitted[0].contenido.datos).toEqual([
        { nombre: 'arbol-a1.json', tipo: 'arbol', nombreUsuario: 'ana@x.com' },
        { nombre: 'arbol-a2.json', tipo: 'arbol', nombreUsuario: 'luis@x.com' }
      ]);
      // mapaRestante: datos de los archivos no principales
      expect(emitted[0].contenido.mapaRestante).toEqual([{ nombre: 'arbol-a2.json', tipo: 'arbol' }]);

      expect(component.completado).toBeFalse();
      expect(component.mensajeExito).toContain('m1');
      expect(component.momentoSeleccionado).toBe('m2');
      expect(component.archivoPrincipalSeleccionado).toBe(json3);
      expect(component.cargando).toBeFalse();

      // Segunda fusión: último momento pendiente
      await component.fusionarTareas();
      expect(emitted.length).toBe(2);
      expect(emitted[1].momento).toBe('m2');
      expect(component.completado).toBeTrue();
    });

    it('should complete directly for a task without momentos', async () => {
      component.tarea = { id: 't2', archivosSubidos: [json1, json2] };
      component.ngOnInit();

      const emitted: any[] = [];
      component.fusionTerminada.subscribe((e: any) => emitted.push(e));

      await component.fusionarTareas();

      expect(mockBack.leerArchivoTarea).toHaveBeenCalledWith('estudio-1', 't2', 'a1.json', null);
      expect(emitted.length).toBe(1);
      expect(emitted[0].momento).toBeNull();
      expect(component.completado).toBeTrue();
      expect(component.errorMsg).toBeNull();
    });

    it('should show an error when the principal file cannot be read', async () => {
      mockBack.leerArchivoTarea.and.returnValue(Promise.resolve(null));
      component.tarea = { id: 't2', archivosSubidos: [json1] };
      component.ngOnInit();

      await component.fusionarTareas();

      expect(component.errorMsg).toBe('No se pudo leer el archivo general seleccionado. Inténtalo de nuevo.');
      expect(component.cargando).toBeFalse();
      expect(component.completado).toBeFalse();
    });

    it('should show an error when reading files fails', async () => {
      mockBack.leerArchivoTarea.and.returnValue(Promise.reject(new Error('backend caído')));
      component.tarea = { id: 't2', archivosSubidos: [json1] };
      component.ngOnInit();

      const emitted: any[] = [];
      component.fusionTerminada.subscribe((e: any) => emitted.push(e));

      await component.fusionarTareas();

      expect(component.errorMsg).toBe('Ha ocurrido un error al fusionar los archivos. Inténtalo de nuevo.');
      expect(component.cargando).toBeFalse();
      expect(emitted.length).toBe(0);
    });
  });
});
