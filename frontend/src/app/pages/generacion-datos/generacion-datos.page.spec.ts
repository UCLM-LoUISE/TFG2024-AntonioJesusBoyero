import { fakeAsync, tick } from '@angular/core/testing';
import { GeneracionDatosPage } from './generacion-datos.page';
import { EstudiosPage } from '../estudios/estudios.page';
import { EstudioData } from 'src/app/data/estudios-data';

describe('GeneracionDatosPage', () => {
  let page: GeneracionDatosPage;
  let mockRouter: any;
  let mockBack: any;
  const addedEls: HTMLElement[] = [];

  const crearDiv = (id: string): HTMLElement => {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    addedEls.push(el);
    return el;
  };

  const json = (nombre = 'datos.json') => ({ nombre, tipo: 'application/json' });
  const foto = (nombre = 'foto.png') => ({ nombre, tipo: 'image/png' });

  beforeEach(() => {
    (window as any).bootstrap = {
      Modal: class {
        constructor(el: any, opts?: any) { }
        show() { }
        hide() { }
        static getInstance(el: any) { return { hide() { }, show() { } }; }
      }
    };
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockBack = jasmine.createSpyObj('BackService', ['leerArchivoTarea']);
    page = new GeneracionDatosPage(mockRouter, mockBack);
  });

  afterEach(() => {
    addedEls.splice(0).forEach(el => el.remove());
    EstudioData.setEstudioFusionData(undefined);
  });

  it('el constructor registra la instancia estática', () => {
    expect(GeneracionDatosPage.Instance).toBe(page);
  });

  describe('ngOnInit', () => {
    it('recupera id, estudio y tareas de los singletons', () => {
      EstudiosPage.Instance = { idEstudioFusion: 'est-1' } as any;
      const estudio = { data: { TareasData: [{ id: 't1' }] } };
      EstudioData.setEstudioFusionData(estudio);
      page.ngOnInit();
      expect(page.idEstudio).toBe('est-1');
      expect(page.estudio).toBe(estudio);
      expect(page.tareas).toEqual([{ id: 't1' }]);
    });

    it('deja tareas vacías si no hay datos', () => {
      EstudiosPage.Instance = { idEstudioFusion: null } as any;
      EstudioData.setEstudioFusionData(undefined);
      page.ngOnInit();
      expect(page.idEstudio).toBeUndefined();
      expect(page.tareas).toEqual([]);
    });
  });

  it('goBack navega a /estudios', () => {
    page.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudios']);
  });

  describe('esFusionable', () => {
    it('true si algún momento tiene más de un JSON', () => {
      const tarea = {
        tieneMomentos: true,
        momentos: {
          M1: { archivosSubidos: [json('a.json'), json('b.json')] },
          M2: { archivosSubidos: [json('c.json')] }
        }
      };
      expect(page.esFusionable(tarea)).toBeTrue();
    });

    it('false si ningún momento tiene conflicto (o sin archivos)', () => {
      const tarea = {
        tieneMomentos: true,
        momentos: { M1: { archivosSubidos: [json()] }, M2: {} }
      };
      expect(page.esFusionable(tarea)).toBeFalse();
    });

    it('sin momentos: false si archivosSubidos no es array', () => {
      expect(page.esFusionable({})).toBeFalse();
    });

    it('sin momentos: true solo con más de un JSON', () => {
      expect(page.esFusionable({ archivosSubidos: [json('a.json'), foto(), json('b.json')] })).toBeTrue();
      expect(page.esFusionable({ archivosSubidos: [json(), foto()] })).toBeFalse();
    });
  });

  describe('guardarFusionTarea', () => {
    beforeEach(() => {
      page.tareas = [
        { id: 't1', tieneMomentos: true, momentos: { M1: { archivosSubidos: [json('a.json'), json('b.json')] } } },
        { id: 't2', archivosSubidos: [json('a.json'), json('b.json')] }
      ];
    });

    it('no hace nada si la tarea no existe', () => {
      page.guardarFusionTarea({ idTarea: 'nope', contenido: {} });
      expect(page.tareas[0].momentos.M1.fusionado).toBeUndefined();
    });

    it('guarda la fusión en el momento indicado', () => {
      page.guardarFusionTarea({ idTarea: 't1', contenido: { datos: [1] }, momento: 'M1' });
      expect(page.tareas[0].momentos.M1.fusionado).toBeTrue();
      expect(page.tareas[0].momentos.M1.fusion).toEqual({ datos: [1] });
    });

    it('no guarda nada si el momento no existe', () => {
      page.guardarFusionTarea({ idTarea: 't1', contenido: {}, momento: 'MX' });
      expect(page.tareas[0].momentos.M1.fusionado).toBeUndefined();
    });

    it('guarda la fusión en la tarea sin momentos', () => {
      page.guardarFusionTarea({ idTarea: 't2', contenido: { datos: [2] } });
      expect(page.tareas[1].fusionada).toBeTrue();
      expect(page.tareas[1].fusion).toEqual({ datos: [2] });
    });
  });

  describe('puedeVerTarea', () => {
    it('con momentos: false si hay conflictos sin fusionar', () => {
      const tarea = {
        tieneMomentos: true,
        momentos: { M1: { archivosSubidos: [json('a.json'), json('b.json')] } }
      };
      expect(page.puedeVerTarea(tarea)).toBeFalse();
    });

    it('con momentos: true si el conflicto está fusionado', () => {
      const tarea = {
        tieneMomentos: true,
        momentos: { M1: { archivosSubidos: [json('a.json'), json('b.json')], fusionado: true } }
      };
      expect(page.puedeVerTarea(tarea)).toBeTrue();
    });

    it('con momentos: true si algún momento tiene un JSON', () => {
      const tarea = {
        tieneMomentos: true,
        momentos: { M1: { archivosSubidos: [json()] }, M2: { archivosSubidos: [foto()] } }
      };
      expect(page.puedeVerTarea(tarea)).toBeTrue();
    });

    it('con momentos: false si ningún momento tiene JSON', () => {
      const tarea = { tieneMomentos: true, momentos: { M1: { archivosSubidos: [foto()] }, M2: {} } };
      expect(page.puedeVerTarea(tarea)).toBeFalse();
    });

    it('sin momentos: false si archivosSubidos no es array', () => {
      expect(page.puedeVerTarea({})).toBeFalse();
    });

    it('sin momentos: fusionable requiere fusionada', () => {
      const tarea: any = { archivosSubidos: [json('a.json'), json('b.json')] };
      expect(page.puedeVerTarea(tarea)).toBeFalse();
      tarea.fusionada = true;
      expect(page.puedeVerTarea(tarea)).toBeTrue();
    });

    it('sin momentos: con un solo JSON se puede ver directamente', () => {
      expect(page.puedeVerTarea({ archivosSubidos: [json()] })).toBeTrue();
    });

    it('sin momentos: sin JSONs no se puede ver', () => {
      expect(page.puedeVerTarea({ archivosSubidos: [foto()] })).toBeFalse();
    });
  });

  describe('estadoTarea', () => {
    it('lista cuando se puede ver', () => {
      expect(page.estadoTarea({ archivosSubidos: [json()] })).toBe('lista');
    });
    it('pendiente cuando es fusionable sin fusionar', () => {
      expect(page.estadoTarea({ archivosSubidos: [json('a.json'), json('b.json')] })).toBe('pendiente');
    });
    it('sin-datos cuando no hay JSONs', () => {
      expect(page.estadoTarea({ archivosSubidos: [] })).toBe('sin-datos');
    });
  });

  describe('conflictosPendientes', () => {
    it('cuenta los momentos con conflicto sin fusionar', () => {
      const tarea = {
        tieneMomentos: true,
        momentos: {
          M1: { archivosSubidos: [json('a.json'), json('b.json')] },
          M2: { archivosSubidos: [json('c.json'), json('d.json')], fusionado: true },
          M3: { archivosSubidos: [json()] }
        }
      };
      expect(page.conflictosPendientes(tarea)).toBe(1);
    });

    it('sin momentos: 1 si es fusionable y no fusionada, 0 en caso contrario', () => {
      expect(page.conflictosPendientes({ archivosSubidos: [json('a.json'), json('b.json')] })).toBe(1);
      expect(page.conflictosPendientes({ archivosSubidos: [json('a.json'), json('b.json')], fusionada: true })).toBe(0);
      expect(page.conflictosPendientes({ archivosSubidos: [json()] })).toBe(0);
    });
  });

  it('formatoTipo reemplaza guiones bajos y tolera vacío', () => {
    expect(page.formatoTipo('medicion_arboles')).toBe('medicion arboles');
    expect(page.formatoTipo('')).toBe('');
    expect(page.formatoTipo(undefined as any)).toBe('');
  });

  describe('tieneArchivos', () => {
    it('con momentos: true si algún momento tiene archivos', () => {
      expect(page.tieneArchivos({ tieneMomentos: true, momentos: { M1: { archivosSubidos: [foto()] } } })).toBeTrue();
      expect(page.tieneArchivos({ tieneMomentos: true, momentos: { M1: { archivosSubidos: [] }, M2: {} } })).toBeFalse();
    });
    it('sin momentos: comprueba el array de archivos', () => {
      expect(page.tieneArchivos({ archivosSubidos: [foto()] })).toBeTrue();
      expect(page.tieneArchivos({ archivosSubidos: [] })).toBeFalse();
      expect(page.tieneArchivos({})).toBeFalse();
    });
  });

  describe('modales', () => {
    it('fusionarArchivos abre el modal de fusión', fakeAsync(() => {
      crearDiv('fusionTareas');
      const tarea = { id: 't1' };
      page.fusionarArchivos(tarea);
      expect(page.tareaSeleccionadaFusion).toBe(tarea);
      expect(page.puedoVerModalFusion).toBeTrue();
      tick(100);
    }));

    it('verTarea abre el modal de mapa', fakeAsync(() => {
      crearDiv('verMapaFusion');
      const tarea = { id: 't1' };
      page.verTarea(tarea);
      expect(page.tareaSeleccionadaMapa).toBe(tarea);
      expect(page.puedoVerModalMapa).toBeTrue();
      tick(100);
    }));

    it('verArchivosTarea abre el modal de archivos', fakeAsync(() => {
      crearDiv('archivosTarea');
      const tarea = { id: 't1' };
      page.verArchivosTarea(tarea);
      expect(page.tareaSeleccionadaArchivos).toBe(tarea);
      expect(page.puedoVerModalArchivos).toBeTrue();
      tick(100);
    }));

    it('los showModal avisan por consola si falta el elemento', fakeAsync(() => {
      const errorSpy = spyOn(console, 'error');
      page.showModalFusion();
      page.showModalMapa();
      page.showModalArchivos();
      tick(100);
      expect(errorSpy).toHaveBeenCalledTimes(3);
    }));

    it('los closeModal ocultan y resetean los flags', () => {
      crearDiv('fusionTareas');
      crearDiv('verMapaFusion');
      crearDiv('archivosTarea');
      page.puedoVerModalFusion = true;
      page.puedoVerModalMapa = true;
      page.puedoVerModalArchivos = true;
      page.closeModalFusion();
      page.closeModalMapa();
      page.closeModalArchivos();
      expect(page.puedoVerModalFusion).toBeFalse();
      expect(page.puedoVerModalMapa).toBeFalse();
      expect(page.puedoVerModalArchivos).toBeFalse();
    });
  });

  describe('puedeGenerarExcel', () => {
    it('true cuando no hay conflictos pendientes', () => {
      page.tareas = [
        { archivosSubidos: [json()] },
        { archivosSubidos: [json('a.json'), json('b.json')], fusionada: true },
        { tieneMomentos: true, momentos: { M1: { archivosSubidos: [json('a.json'), json('b.json')], fusionado: true } } }
      ];
      expect(page.puedeGenerarExcel()).toBeTrue();
    });

    it('false si una tarea con momentos tiene conflicto sin fusionar', () => {
      page.tareas = [{ tieneMomentos: true, momentos: { M1: { archivosSubidos: [json('a.json'), json('b.json')] } } }];
      expect(page.puedeGenerarExcel()).toBeFalse();
    });

    it('false si una tarea sin momentos es fusionable y no está fusionada', () => {
      page.tareas = [{ archivosSubidos: [json('a.json'), json('b.json')] }];
      expect(page.puedeGenerarExcel()).toBeFalse();
    });
  });

  describe('columnas y estadísticas', () => {
    const datosArboles = [
      { nombre: 'A1', tipo: 'arbol', datos: { especie: 'Pino', dn: '10', ht: '5' }, nombreUsuario: 'Ana' },
      { nombre: 'A2', tipo: 'arbol', datos: { especie: 'pino ', dn: '20', ht: 'x' }, momento: 'M1' },
      { nombre: 'A3', tipo: 'arbol', datos: { especie: 'Encina', dn: '30' } }
    ];

    it('obtenerColumnas devuelve las columnas fijas para medicion_arboles', () => {
      const cols = page.obtenerColumnas(datosArboles, { tipoTarea: 'medicion_arboles' });
      expect(cols).toContain('especie');
      expect(cols).toContain('superficieCopa');
      expect(cols).not.toContain('momento');
    });

    it('obtenerColumnas añade momento al final si tieneMomentos', () => {
      const cols = page.obtenerColumnas(datosArboles, { tipoTarea: 'medicion_sotobosque' }, true);
      expect(cols[cols.length - 1]).toBe('momento');
      expect(cols).toContain('porcionVerde');
    });

    it('obtenerColumnas usa las claves del primer item si no hay tipoTarea', () => {
      expect(page.obtenerColumnas(datosArboles, null)).toEqual(['especie', 'dn', 'ht']);
      expect(page.obtenerColumnas(datosArboles, { tipoTarea: 'otro' })).toEqual(['especie', 'dn', 'ht']);
      expect(page.obtenerColumnas([], { tipoTarea: 'otro' })).toEqual([]);
    });

    it('ordenarObjetoPorColumnas renombra y rellena valores', () => {
      const fila = page.ordenarObjetoPorColumnas(
        datosArboles[1],
        ['especie', 'dn', 'usuario', 'momento'],
        true,
        'medicion_arboles'
      );
      expect(fila['Nombre']).toBe('A2');
      expect(fila['Tipo']).toBe('arbol');
      expect(fila['Especie']).toBe('pino ');
      expect(fila['Dn (cm)']).toBe('20');
      expect(fila['Usuario']).toBe('');
      expect(fila['Momento']).toBe('M1');
    });

    it('calcularEstadisticas calcula medias numéricas y guiones', () => {
      const stats = (page as any).calcularEstadisticas(
        datosArboles,
        ['especie', 'dn', 'ht', 'usuario', 'momento'],
        'medicion_arboles'
      );
      expect(stats['Nombre']).toBe('Media');
      expect(stats['Dn (cm)']).toBe('20.00');
      expect(stats['Ht (m)']).toBe('5.00');
      expect(stats['Especie']).toBe('-');
      expect(stats['Usuario']).toBe('-');
      expect(stats['Momento']).toBe('-');
    });

    it('renombrarColumna cubre los mapas y el caso por defecto', () => {
      const ren = (page as any).renombrarColumna.bind(page);
      expect(ren('dn', 'medicion_arboles')).toBe('Dn (cm)');
      expect(ren('rareza', 'medicion_arboles')).toBe('Rareza');
      expect(ren('longitud', 'medicion_sotobosque')).toBe('Longitud intercepción (cm)');
      expect(ren('rareza', 'medicion_sotobosque')).toBe('Rareza');
      expect(ren('momento')).toBe('Momento');
      expect(ren('notas')).toBe('Notas');
    });

    it('contarEspeciesUnicas ignora mayúsculas, espacios y vacíos', () => {
      const n = (page as any).contarEspeciesUnicas([
        ...datosArboles,
        { datos: {} },
        { datos: { especie: '' } }
      ]);
      expect(n).toBe(2);
    });

    it('expandirOcurrencias expande sotobosque y respeta el formato antiguo', () => {
      const datos = [
        {
          nombre: 'T1', tipo: 'transecto', momento: 'M1', nombreUsuario: 'Ana',
          ocurrencias: [
            { id: 7, especie: 'romero', longitud: 5, altura: 10, porcionVerde: 6, porcionSeca: 4, total: 10, notas: 'n' },
            { especie: 'tomillo', longitud: 2 }
          ]
        },
        { nombre: 'A1', tipo: 'arbol', datos: { especie: 'pino' } }
      ];
      const res = (page as any).expandirOcurrencias(datos);
      expect(res.length).toBe(3);
      expect(res[0].nombre).toBe('T1-7');
      expect(res[0].datos.especie).toBe('romero');
      expect(res[1].nombre).toBe('T1-2');
      expect(res[1].nombreUsuario).toBe('Ana');
      expect(res[2].nombre).toBe('A1');
    });
  });

  describe('generarExcel', () => {
    let clickSpy: jasmine.Spy;

    beforeEach(() => {
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:fake');
      spyOn(window.URL, 'revokeObjectURL');
      clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');
      page.idEstudio = 'est-1';
      page.estudio = { data: { NuevoEstudioFormData: { nombre: 'Mi Estudio', poblacion: 'Hellín' } } };
    });

    it('genera el excel combinando momentos fusionados y archivos leídos', async () => {
      mockBack.leerArchivoTarea.and.returnValue(Promise.resolve({
        contenido: {
          nombreUsuario: 'Luis',
          datos: [{ nombre: 'A2', tipo: 'arbol', datos: { especie: 'encina', dn: '20' } }]
        }
      }));
      page.tareas = [{
        id: 't1',
        nombreTarea: 'Tarea con momentos',
        tipoTarea: 'medicion_arboles',
        tieneMomentos: true,
        momentos: {
          M1: {
            fusionado: true,
            fusion: { datos: [{ nombre: 'A1', tipo: 'arbol', datos: { especie: 'pino', dn: '10' }, nombreUsuario: 'Ana' }] },
            archivosSubidos: [json('a.json'), json('b.json')]
          },
          M2: { archivosSubidos: [json('c.json')] },
          M3: { archivosSubidos: [foto()] }
        }
      }];

      await page.generarExcel();

      expect(mockBack.leerArchivoTarea).toHaveBeenCalledWith('est-1', 't1', 'c.json', 'M2');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    });

    it('usa los datos fusionados de tareas sin momentos y expande ocurrencias', async () => {
      page.tareas = [{
        id: 't2',
        nombreTarea: 'Sotobosque',
        tipoTarea: 'medicion_sotobosque',
        fusionada: true,
        fusion: {
          datos: [{
            nombre: 'T1', tipo: 'transecto', nombreUsuario: 'Ana',
            ocurrencias: [{ id: 1, especie: 'romero', longitud: 5, altura: 8, porcionVerde: 5, porcionSeca: 3, total: 8, notas: '' }]
          }]
        }
      }];
      await page.generarExcel();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('salta tareas sin JSON y tareas cuyo archivo no se puede leer', async () => {
      mockBack.leerArchivoTarea.and.callFake((idEstudio: string, idTarea: string) => {
        if (idTarea === 't4') return Promise.reject(new Error('offline'));
        return Promise.resolve({
          contenido: { nombreUsuario: 'Eva', datos: [{ nombre: 'A9', tipo: 'arbol', datos: { especie: 'sabina' } }] }
        });
      });
      page.tareas = [
        { id: 't3', nombreTarea: 'Sin json', archivosSubidos: [foto()] },
        { id: 't4', nombreTarea: 'Con error', archivosSubidos: [json()] },
        { id: 't7', nombreTarea: 'Valida', tipoTarea: 'medicion_arboles', archivosSubidos: [json()] }
      ];
      await page.generarExcel();
      expect(mockBack.leerArchivoTarea).toHaveBeenCalledWith('est-1', 't4', 'datos.json');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('lee el archivo de una tarea sin momentos y gestiona errores por momento', async () => {
      mockBack.leerArchivoTarea.and.callFake((idEstudio: string, idTarea: string) => {
        if (idTarea === 't6') return Promise.reject(new Error('fallo momento'));
        return Promise.resolve({
          contenido: { nombreUsuario: 'Eva', datos: [{ nombre: 'A9', tipo: 'arbol', datos: { especie: 'sabina', dn: '15' } }] }
        });
      });
      page.tareas = [
        { id: 't5', nombreTarea: 'Normal', tipoTarea: 'medicion_arboles', archivosSubidos: [json()] },
        {
          id: 't6', nombreTarea: 'Momento con error', tieneMomentos: true,
          momentos: { M1: { archivosSubidos: [json()] } }
        }
      ];
      await page.generarExcel();
      expect(mockBack.leerArchivoTarea).toHaveBeenCalledTimes(2);
      expect(clickSpy).toHaveBeenCalled();
    });

    it('usa nombres por defecto si no hay datos del estudio', async () => {
      page.estudio = undefined;
      page.tareas = [{
        id: 't8',
        nombreTarea: 'Unica',
        tipoTarea: 'medicion_arboles',
        fusionada: true,
        fusion: { datos: [{ nombre: 'A1', tipo: 'arbol', datos: { especie: 'pino', dn: '10' }, nombreUsuario: 'Ana' }] }
      }];
      await page.generarExcel();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
