import { ArchivosTareaModalComponent } from './archivos-tarea-modal.component';

describe('ArchivosTareaModalComponent', () => {
  let component: ArchivosTareaModalComponent;

  const jsonFile = { nombre: 'datos.json', tipo: 'application/json', url: 'http://x/datos.json' };
  const imgFile = { nombre: 'foto.png', tipo: 'image/png', url: 'http://x/foto.png' };
  const audioFile = { nombre: 'nota.mp3', tipo: 'audio/mpeg', url: 'http://x/nota.mp3' };
  const otroFile = { nombre: 'doc.pdf', tipo: 'application/pdf', url: 'http://x/doc.pdf' };

  beforeEach(() => {
    component = new ArchivosTareaModalComponent();
  });

  it('ngOnInit should group files by momento when the task has fases', () => {
    component.tarea = {
      tieneMomentos: true,
      momentos: {
        'Antes': { archivosSubidos: [jsonFile, imgFile] },
        'Después': { archivosSubidos: [audioFile] },
        'Vacío': {}
      }
    };
    component.ngOnInit();

    expect(component.grupos.length).toBe(3);
    expect(component.grupos[0]).toEqual({ momento: 'Antes', archivos: [jsonFile, imgFile] });
    expect(component.grupos[1]).toEqual({ momento: 'Después', archivos: [audioFile] });
    expect(component.grupos[2]).toEqual({ momento: 'Vacío', archivos: [] });
    expect(component.totalArchivos).toBe(3);
  });

  it('ngOnInit should build a single group when the task has no momentos', () => {
    component.tarea = { archivosSubidos: [jsonFile, otroFile] };
    component.ngOnInit();

    expect(component.grupos.length).toBe(1);
    expect(component.grupos[0].momento).toBeNull();
    expect(component.grupos[0].archivos).toEqual([jsonFile, otroFile]);
    expect(component.totalArchivos).toBe(2);
  });

  it('ngOnInit should handle a task without files at all', () => {
    component.tarea = {};
    component.ngOnInit();
    expect(component.grupos).toEqual([{ momento: null, archivos: [] }]);
    expect(component.totalArchivos).toBe(0);
  });

  it('ngOnInit should handle an undefined tarea', () => {
    component.tarea = undefined;
    component.ngOnInit();
    expect(component.grupos.length).toBe(1);
    expect(component.totalArchivos).toBe(0);
  });

  it('cerrarModal should emit cerrar', () => {
    const spy = jasmine.createSpy('cerrar');
    component.cerrar.subscribe(spy);
    component.cerrarModal();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('verArchivo should open the url in a new tab', () => {
    const openSpy = spyOn(window, 'open');
    component.verArchivo('http://x/datos.json');
    expect(openSpy).toHaveBeenCalledOnceWith('http://x/datos.json', '_blank');
  });

  it('esImagen / esAudio / esJson should detect file types', () => {
    expect(component.esImagen(imgFile)).toBeTrue();
    expect(component.esImagen(jsonFile)).toBeFalse();
    expect(component.esAudio(audioFile)).toBeTrue();
    expect(component.esAudio(imgFile)).toBeFalse();
    expect(component.esJson(jsonFile)).toBeTrue();
    expect(component.esJson(otroFile)).toBeFalse();
    expect(component.esImagen(null)).toBeFalse();
    expect(component.esAudio({})).toBeFalse();
    expect(component.esJson(undefined)).toBeFalse();
  });

  it('iconoArchivo should return an icon per type', () => {
    expect(component.iconoArchivo(jsonFile)).toBe('bi-filetype-json icono-json');
    expect(component.iconoArchivo(imgFile)).toBe('bi-image icono-imagen');
    expect(component.iconoArchivo(audioFile)).toBe('bi-music-note-beamed icono-audio');
    expect(component.iconoArchivo(otroFile)).toBe('bi-file-earmark icono-otro');
  });

  it('categoriaArchivo should return a label per type', () => {
    expect(component.categoriaArchivo(jsonFile)).toBe('JSON');
    expect(component.categoriaArchivo(imgFile)).toBe('Imagen');
    expect(component.categoriaArchivo(audioFile)).toBe('Audio');
    expect(component.categoriaArchivo(otroFile)).toBe('application/pdf');
    expect(component.categoriaArchivo({})).toBe('Archivo');
  });
});
