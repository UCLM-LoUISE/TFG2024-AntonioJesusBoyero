import { FusionTareasMapaComponent } from './fusion-tareas-mapa.component';

// Prueba de humo: el componente renderiza un mapa Leaflet con las figuras
// de la tarea; su verificación principal se realiza de forma
// manual/funcional.
describe('FusionTareasMapaComponent', () => {
  let comp: FusionTareasMapaComponent;

  beforeEach(() => {
    comp = new FusionTareasMapaComponent({} as any);
    comp.tarea = { archivosSubidos: [] };
  });

  it('se crea con la pestaña mapa activa', () => {
    expect(comp).toBeTruthy();
    expect(comp.seccionActiva).toBe('mapa');
  });

  it('cerrarModal emite el evento cerrar', () => {
    const spy = jasmine.createSpy('cerrar');
    comp.cerrar.subscribe(spy);
    comp.cerrarModal();
    expect(spy).toHaveBeenCalled();
  });

  it('expandirOcurrencias mantiene el formato antiguo sin ocurrencias', () => {
    const datos = [{ nombre: 'A1', tipo: 'arbol', datos: { especie: 'Pinus' } }];
    expect(comp.expandirOcurrencias(datos)).toEqual(datos);
  });
});
