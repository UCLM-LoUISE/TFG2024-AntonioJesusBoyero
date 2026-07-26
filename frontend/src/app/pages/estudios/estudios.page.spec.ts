import { DatePipe } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { EstudiosPage } from './estudios.page';

// Prueba de humo: la página orquesta la carga de estudios desde el
// backend, el calendario y varios modales; su verificación principal se
// realiza de forma manual/funcional.
describe('EstudiosPage', () => {
  let page: EstudiosPage;

  beforeEach(() => {
    page = new EstudiosPage(
      { navigate: jasmine.createSpy('navigate') } as any,
      {} as any,
      { getProvinciasNuevo: () => [], getPoblacionesByProvinciaNuevo: () => [] } as any,
      new DatePipe('en-US'),
      new FormBuilder(),
      {} as any
    );
  });

  afterEach(() => {
    (EstudiosPage as any).Instance = undefined;
  });

  it('se crea y registra su instancia estática', () => {
    expect(page).toBeTruthy();
    expect(EstudiosPage.Instance).toBe(page);
  });

  it('arranca en modo calendario con la opción estudios', () => {
    expect(page.modoCalendario).toBeTrue();
    expect(page.opcionSeleccionada).toBe('estudios');
  });
});
