import { AvisoNoHayFigurasComponent } from './aviso-no-hay-figuras.component';

describe('AvisoNoHayFigurasComponent', () => {
  it('should create and run ngOnInit without errors', () => {
    const component = new AvisoNoHayFigurasComponent();
    expect(component).toBeTruthy();
    expect(() => component.ngOnInit()).not.toThrow();
  });
});
