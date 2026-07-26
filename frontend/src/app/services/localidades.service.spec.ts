import { TestBed } from '@angular/core/testing';
import { LocalidadesService } from './localidades.service';

describe('LocalidadesService', () => {
  let service: LocalidadesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalidadesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProvinciasNuevo', () => {
    it('should return a non-empty list of provinces with code === label', () => {
      const provincias = service.getProvinciasNuevo();
      expect(provincias.length).toBeGreaterThan(0);
      provincias.forEach((p) => {
        expect(p.code).toBe(p.label);
        expect(typeof p.label).toBe('string');
      });
    });

    it('should include known provinces', () => {
      const labels = service.getProvinciasNuevo().map((p) => p.label);
      expect(labels).toContain('Almería');
    });

    it('should return provinces sorted alphabetically', () => {
      const labels = service.getProvinciasNuevo().map((p) => p.label);
      for (let i = 1; i < labels.length; i++) {
        expect(labels[i - 1].localeCompare(labels[i])).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('getPoblacionesByProvinciaNuevo', () => {
    it('should return the municipios of a known province with coordinates', () => {
      const poblaciones = service.getPoblacionesByProvinciaNuevo('Almería');
      expect(poblaciones.length).toBeGreaterThan(0);

      const abla = poblaciones.find((p) => p.label === 'Abla');
      expect(abla).toBeDefined();
      expect(abla!.latitud).toBeCloseTo(37.14114, 4);
      expect(abla!.longitud).toBeCloseTo(-2.780104, 4);
    });

    it('should return municipios sorted alphabetically', () => {
      const labels = service
        .getPoblacionesByProvinciaNuevo('Almería')
        .map((p) => p.label);
      for (let i = 1; i < labels.length; i++) {
        expect(labels[i - 1].localeCompare(labels[i])).toBeLessThanOrEqual(0);
      }
    });

    it('should return an empty array for an unknown province', () => {
      expect(service.getPoblacionesByProvinciaNuevo('Mordor')).toEqual([]);
    });
  });

  describe('getCoordenadas', () => {
    it('should return [latitud, longitud] for a known provincia/municipio', () => {
      const coords = service.getCoordenadas('Almería', 'Abla');
      expect(coords).not.toBeNull();
      expect(coords![0]).toBeCloseTo(37.14114, 4);
      expect(coords![1]).toBeCloseTo(-2.780104, 4);
    });

    it('should return null for an unknown province', () => {
      expect(service.getCoordenadas('Mordor', 'Abla')).toBeNull();
    });

    it('should return null for an unknown municipio', () => {
      expect(service.getCoordenadas('Almería', 'CiudadInexistente')).toBeNull();
    });
  });
});
