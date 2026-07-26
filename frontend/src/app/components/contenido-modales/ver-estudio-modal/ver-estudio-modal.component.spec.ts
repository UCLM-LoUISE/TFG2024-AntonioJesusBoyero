import { VerEstudioModalComponent } from './ver-estudio-modal.component';

// Prueba de humo: el modal depende de Leaflet, Firebase Storage y del
// backend para la subida de archivos; su verificación principal se
// realiza de forma manual/funcional.
describe('VerEstudioModalComponent', () => {
  let comp: VerEstudioModalComponent;

  beforeEach(() => {
    comp = new VerEstudioModalComponent(
      { getCoordenadas: () => null } as any,
      {} as any
    );
  });

  it('se crea con el estado inicial esperado', () => {
    expect(comp).toBeTruthy();
    expect(comp.seccionActiva).toBe('info');
    expect(comp.modoSubirDatos).toBeFalse();
    expect(comp.archivosSeleccionados).toEqual([]);
  });

  it('estaMultimediaSeleccionada devuelve false sin archivos', () => {
    expect(comp.estaMultimediaSeleccionada('foto.jpg')).toBeFalse();
  });

  it('cerrarModal emite el evento cerrar', () => {
    const spy = jasmine.createSpy('cerrar');
    comp.cerrar.subscribe(spy);
    comp.cerrarModal();
    expect(spy).toHaveBeenCalled();
  });
});
