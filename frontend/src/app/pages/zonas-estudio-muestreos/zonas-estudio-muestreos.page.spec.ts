import { ZonasEstudioMuestreosPage } from './zonas-estudio-muestreos.page';
import { EstudiosPage } from '../estudios/estudios.page';

// Prueba de humo: la página está fuertemente acoplada a Leaflet (mapa y
// dibujo interactivo de figuras) y al backend, por lo que su verificación
// principal se realiza de forma manual/funcional.
describe('ZonasEstudioMuestreosPage', () => {
  let page: ZonasEstudioMuestreosPage;

  beforeEach(() => {
    (EstudiosPage as any).Instance = { editMode: false, idEstudioEdit: null };
    page = new ZonasEstudioMuestreosPage(
      { detectChanges: () => {} } as any,
      { getCoordenadas: () => null } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      {} as any,
      { currentUser: Promise.resolve(null) } as any
    );
  });

  afterEach(() => {
    (EstudiosPage as any).Instance = undefined;
    (ZonasEstudioMuestreosPage as any).instance = undefined;
  });

  it('se crea y registra su instancia estática', () => {
    expect(page).toBeTruthy();
    expect(ZonasEstudioMuestreosPage.instance).toBe(page);
  });

  it('existeNombreFigura devuelve false sin figuras', () => {
    expect(page.existeNombreFigura('Zona 1')).toBeFalse();
  });

  it('introduceNombre guarda el nombre de la figura', () => {
    page.introduceNombre('Parcela A');
    expect(page.nombreFigura).toBe('Parcela A');
  });
});
