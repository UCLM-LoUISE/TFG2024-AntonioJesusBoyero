import { AvisoZonasSinGuardarComponent } from './aviso-zonas-sin-guardar.component';

describe('AvisoZonasSinGuardarComponent', () => {
  it('should create and run ngOnInit without errors', () => {
    const component = new AvisoZonasSinGuardarComponent();
    expect(component).toBeTruthy();
    expect(() => component.ngOnInit()).not.toThrow();
  });
});
