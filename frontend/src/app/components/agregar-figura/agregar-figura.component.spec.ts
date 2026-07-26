import { FormBuilder } from '@angular/forms';
import * as L from 'leaflet';
import { AgregarFiguraComponent } from './agregar-figura.component';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';
import { GestionTareasPage } from 'src/app/pages/gestion-tareas/gestion-tareas.page';

describe('AgregarFiguraComponent', () => {
  let component: AgregarFiguraComponent;
  let originalZonas: any;
  let originalGestion: any;
  let mockZonas: any;
  let mockGestion: any;
  let drawnItems: L.FeatureGroup;

  beforeEach(() => {
    originalZonas = ZonasEstudioMuestreosPage.instance;
    originalGestion = GestionTareasPage.Instance;
    drawnItems = new L.FeatureGroup();
    mockZonas = {
      existeNombreFigura: jasmine.createSpy('existeNombreFigura').and.returnValue(false),
      getDrawnItems: jasmine.createSpy('getDrawnItems').and.returnValue(drawnItems),
      actualizarResumen: jasmine.createSpy('actualizarResumen'),
      introduceNombre: jasmine.createSpy('introduceNombre'),
      verificarMarcadores: jasmine.createSpy('verificarMarcadores')
    };
    mockGestion = {
      openModeCreateTask: jasmine.createSpy('openModeCreateTask')
    };
    ZonasEstudioMuestreosPage.instance = mockZonas;
    GestionTareasPage.Instance = mockGestion;
    component = new AgregarFiguraComponent(new FormBuilder());
  });

  afterEach(() => {
    ZonasEstudioMuestreosPage.instance = originalZonas;
    GestionTareasPage.Instance = originalGestion;
  });

  it('should create with a marker form by default', () => {
    expect(component).toBeTruthy();
    expect(component.figuraForm.get('tipoFigura')?.value).toBe('marker');
    expect(component.esCirculo).toBeFalse();
  });

  it('esCirculo should be true when tipoFigura is circle', () => {
    component.figuraForm.patchValue({ tipoFigura: 'circle' });
    expect(component.esCirculo).toBeTrue();
  });

  it('agregarFiguraManual should flag an invalid form and not add layers', () => {
    component.agregarFiguraManual();
    expect(component.formInvalid).toBeTrue();
    expect(component.mostrarError).toBeTrue();
    expect(drawnItems.getLayers().length).toBe(0);
    expect(mockZonas.actualizarResumen).not.toHaveBeenCalled();
  });

  it('agregarFiguraManual should require radio when the figure is a circle', () => {
    component.figuraForm.patchValue({
      tipoFigura: 'circle',
      nombre: 'Circulo 1',
      latitud: 38.99,
      longitud: -1.85,
      radio: null
    });
    component.agregarFiguraManual();
    expect(component.formInvalid).toBeTrue();
    expect(component.mostrarError).toBeTrue();
    expect(drawnItems.getLayers().length).toBe(0);
  });

  it('agregarFiguraManual should reject a duplicated name', () => {
    mockZonas.existeNombreFigura.and.returnValue(true);
    component.figuraForm.patchValue({
      tipoFigura: 'marker',
      nombre: 'Zona 1',
      latitud: 38.99,
      longitud: -1.85
    });
    component.agregarFiguraManual();
    expect(component.errorNombreDuplicado).toBeTrue();
    expect(component.formInvalid).toBeFalse();
    expect(drawnItems.getLayers().length).toBe(0);
    expect(mockZonas.introduceNombre).not.toHaveBeenCalled();
  });

  it('agregarFiguraManual should add a valid marker and open the create-task mode', () => {
    component.figuraForm.patchValue({
      tipoFigura: 'marker',
      nombre: 'Punto A',
      latitud: 38.994349,
      longitud: -1.858542
    });
    component.agregarFiguraManual();

    expect(component.errorNombreDuplicado).toBeFalse();
    expect(drawnItems.getLayers().length).toBe(1);
    const layer: any = drawnItems.getLayers()[0];
    expect(layer.feature.properties.name).toBe('Punto A');
    expect(layer.feature.geometry.type).toBe('Polygon');
    expect(mockZonas.actualizarResumen).toHaveBeenCalledWith(layer, 'Punto A', 'marker');
    expect(mockZonas.introduceNombre).toHaveBeenCalledOnceWith('Punto A');
    expect(mockGestion.openModeCreateTask).toHaveBeenCalledTimes(1);
    expect(mockZonas.verificarMarcadores).toHaveBeenCalledTimes(1);
    // The form is reset preserving the figure type
    expect(component.figuraForm.get('tipoFigura')?.value).toBe('marker');
    expect(component.figuraForm.get('nombre')?.value).toBeNull();
  });

  it('agregarFiguraManual should add a valid circle without opening the create-task mode', () => {
    component.figuraForm.patchValue({
      tipoFigura: 'circle',
      nombre: 'Parcela circular',
      latitud: 40.0,
      longitud: -3.0,
      radio: 50
    });
    component.agregarFiguraManual();

    expect(drawnItems.getLayers().length).toBe(1);
    const layer: any = drawnItems.getLayers()[0];
    expect(layer instanceof L.Circle).toBeTrue();
    expect(layer.feature.geometry.type).toBe('Point');
    expect(mockZonas.actualizarResumen).toHaveBeenCalledWith(layer, 'Parcela circular', 'circle');
    expect(mockGestion.openModeCreateTask).not.toHaveBeenCalled();
    expect(mockZonas.verificarMarcadores).toHaveBeenCalledTimes(1);
  });

  it('agregarFiguraManual should reject out-of-range coordinates', () => {
    component.figuraForm.patchValue({
      tipoFigura: 'marker',
      nombre: 'Fuera de rango',
      latitud: 120,
      longitud: -200
    });
    component.agregarFiguraManual();
    expect(component.formInvalid).toBeTrue();
    expect(drawnItems.getLayers().length).toBe(0);
  });

  it('toggleFormulario should toggle visibility and clear errors', () => {
    expect(component.mostrarFormulario).toBeFalse();
    component.formInvalid = true;
    component.mostrarError = true;
    component.toggleFormulario();
    expect(component.mostrarFormulario).toBeTrue();
    expect(component.formInvalid).toBeFalse();
    expect(component.mostrarError).toBeFalse();
    component.toggleFormulario();
    expect(component.mostrarFormulario).toBeFalse();
  });

  it('cambiarTipoFigura should reset the form keeping the new type', () => {
    component.figuraForm.patchValue({ nombre: 'algo', latitud: 1, longitud: 2 });
    component.formInvalid = true;
    component.mostrarError = true;
    component.cambiarTipoFigura({ target: { value: 'circle' } });
    expect(component.figuraForm.get('tipoFigura')?.value).toBe('circle');
    expect(component.figuraForm.get('nombre')?.value).toBeNull();
    expect(component.formInvalid).toBeFalse();
    expect(component.mostrarError).toBeFalse();
  });
});
