import { EliminarZonaComponent } from './eliminar-zona.component';
import { ZonasEstudioMuestreosPage } from 'src/app/pages/zonas-estudio-muestreos/zonas-estudio-muestreos.page';

describe('EliminarZonaComponent', () => {
  let component: EliminarZonaComponent;
  let originalInstance: any;
  let mockPage: any;

  beforeEach(() => {
    originalInstance = ZonasEstudioMuestreosPage.instance;
    mockPage = {
      closeModalZonas: jasmine.createSpy('closeModalZonas'),
      confirmarEliminarZona: jasmine.createSpy('confirmarEliminarZona')
    };
    ZonasEstudioMuestreosPage.instance = mockPage;
    component = new EliminarZonaComponent();
  });

  afterEach(() => {
    ZonasEstudioMuestreosPage.instance = originalInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close the modal on onCancel', () => {
    component.onCancel();
    expect(mockPage.closeModalZonas).toHaveBeenCalledTimes(1);
    expect(mockPage.confirmarEliminarZona).not.toHaveBeenCalled();
  });

  it('should confirm zone deletion on onConfirmarEliminar', () => {
    component.onConfirmarEliminar();
    expect(mockPage.confirmarEliminarZona).toHaveBeenCalledTimes(1);
    expect(mockPage.closeModalZonas).not.toHaveBeenCalled();
  });
});
