import { IntroduceNombreComponent } from './introduce-nombre.component';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';

describe('IntroduceNombreComponent', () => {
  let component: IntroduceNombreComponent;
  let originalInstance: any;
  let mockPage: any;

  beforeEach(() => {
    originalInstance = ZonasEstudioMuestreosPage.instance;
    mockPage = {
      existeNombreFigura: jasmine.createSpy('existeNombreFigura').and.returnValue(false),
      introduceNombre: jasmine.createSpy('introduceNombre')
    };
    ZonasEstudioMuestreosPage.instance = mockPage;
    component = new IntroduceNombreComponent();
  });

  afterEach(() => {
    ZonasEstudioMuestreosPage.instance = originalInstance;
  });

  it('should create with empty state', () => {
    expect(component).toBeTruthy();
    expect(component.inputNombre).toBe('');
    expect(component.showError).toBeFalse();
    expect(component.errorMsg).toBe('');
  });

  it('guardarNombre should show error when name is empty', () => {
    component.inputNombre = '   ';
    component.guardarNombre();
    expect(component.showError).toBeTrue();
    expect(component.errorMsg).toBe('Introduce un nombre para la figura.');
    expect(mockPage.introduceNombre).not.toHaveBeenCalled();
  });

  it('guardarNombre should show error when name already exists', () => {
    mockPage.existeNombreFigura.and.returnValue(true);
    component.inputNombre = 'Zona 1';
    component.guardarNombre();
    expect(component.showError).toBeTrue();
    expect(component.errorMsg).toBe('Ya existe una figura llamada "Zona 1". Elige otro nombre.');
    expect(mockPage.introduceNombre).not.toHaveBeenCalled();
  });

  it('guardarNombre should save a valid trimmed name and reset state', () => {
    component.inputNombre = '  Zona Nueva  ';
    component.showError = true;
    component.errorMsg = 'algo';
    component.guardarNombre();
    expect(mockPage.existeNombreFigura).toHaveBeenCalledWith('Zona Nueva');
    expect(mockPage.introduceNombre).toHaveBeenCalledOnceWith('Zona Nueva');
    expect(component.showError).toBeFalse();
    expect(component.errorMsg).toBe('');
    expect(component.inputNombre).toBe('');
  });

  it('resetearError should clear the error state', () => {
    component.showError = true;
    component.errorMsg = 'error';
    component.resetearError();
    expect(component.showError).toBeFalse();
    expect(component.errorMsg).toBe('');
  });

  it('resetearInput should clear the input', () => {
    component.inputNombre = 'abc';
    component.resetearInput();
    expect(component.inputNombre).toBe('');
  });
});
