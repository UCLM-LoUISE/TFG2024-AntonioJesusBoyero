import { EstudioData } from './estudios-data';

describe('EstudioData', () => {
  beforeEach(() => {
    // Estado limpio antes de cada test (clase estática con estado compartido)
    EstudioData.reset();
    EstudioData.setEstudioFusionData(undefined);
  });

  it('should set and get NuevoEstudioFormData', () => {
    const form = { nombre: 'Estudio 1', fechaInicio: '2025-01-15' };
    EstudioData.setNuevoEstudioFormData(form);
    expect(EstudioData.getNuevoEstudioFormData()).toEqual(form);
  });

  it('should set and get ParcelasData', () => {
    const parcelas = { figuras: [{ id: 'f1', tipo: 'Polígono' }] };
    EstudioData.setParcelasData(parcelas);
    expect(EstudioData.getParcelasData()).toEqual(parcelas);
  });

  it('should set and get TareasEstudioData', () => {
    const tareas = [{ id: 't1', nombre: 'Muestreo' }];
    EstudioData.setTareasEstudioData(tareas);
    expect(EstudioData.getTareasEstudioData()).toEqual(tareas);
  });

  it('should set and get EstudioFusionData', () => {
    const fusion = { id: 'e1', nombre: 'Fusión' };
    EstudioData.setEstudioFusionData(fusion);
    expect(EstudioData.getEstudioFusionData()).toEqual(fusion);
  });

  it('getAll should return every stored section', () => {
    EstudioData.setNuevoEstudioFormData({ a: 1 });
    EstudioData.setParcelasData({ b: 2 });
    EstudioData.setTareasEstudioData([{ c: 3 }]);

    expect(EstudioData.getAll()).toEqual({
      NuevoEstudioFormData: { a: 1 },
      ParcelasData: { b: 2 },
      TareasEstudioData: [{ c: 3 }],
    });
  });

  it('reset should clear all sections', () => {
    EstudioData.setNuevoEstudioFormData({ a: 1 });
    EstudioData.setParcelasData({ b: 2 });
    EstudioData.setTareasEstudioData([{ c: 3 }]);

    EstudioData.reset();

    expect(EstudioData.getNuevoEstudioFormData()).toEqual({});
    expect(EstudioData.getParcelasData()).toEqual({});
    expect(EstudioData.getTareasEstudioData()).toEqual({});
    expect(EstudioData.hayDatosEstudios()).toBeFalse();
  });

  describe('hayDatosEstudios', () => {
    it('should be false when everything is empty', () => {
      expect(EstudioData.hayDatosEstudios()).toBeFalse();
    });

    it('should be true when there is form data', () => {
      EstudioData.setNuevoEstudioFormData({ nombre: 'x' });
      expect(EstudioData.hayDatosEstudios()).toBeTrue();
    });

    it('should be true when there is parcelas data', () => {
      EstudioData.setParcelasData({ figuras: [] });
      expect(EstudioData.hayDatosEstudios()).toBeTrue();
    });

    it('should be true when there are tareas (non-empty array)', () => {
      EstudioData.setTareasEstudioData([{ id: 't1' }]);
      expect(EstudioData.hayDatosEstudios()).toBeTrue();
    });

    it('should be false when tareas is an empty array', () => {
      EstudioData.setTareasEstudioData([]);
      expect(EstudioData.hayDatosEstudios()).toBeFalse();
    });

    it('should be false when tareas is a non-array empty object', () => {
      EstudioData.setTareasEstudioData({});
      expect(EstudioData.hayDatosEstudios()).toBeFalse();
    });
  });
});
