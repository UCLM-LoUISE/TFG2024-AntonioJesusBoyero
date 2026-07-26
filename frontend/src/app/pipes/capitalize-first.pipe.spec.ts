import { CapitalizeFirstPipe } from './capitalize-first.pipe';

describe('CapitalizeFirstPipe', () => {
  let pipe: CapitalizeFirstPipe;

  beforeEach(() => {
    pipe = new CapitalizeFirstPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for empty input', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('should return empty string for null/undefined input', () => {
    expect(pipe.transform(null as any)).toBe('');
    expect(pipe.transform(undefined as any)).toBe('');
  });

  it('should capitalize the first letter of a single word', () => {
    expect(pipe.transform('hola')).toBe('Hola');
  });

  it('should capitalize the first letter of every word', () => {
    expect(pipe.transform('hola mundo cruel')).toBe('Hola Mundo Cruel');
  });

  it('should keep already-capitalized words unchanged', () => {
    expect(pipe.transform('Hola Mundo')).toBe('Hola Mundo');
  });

  it('should capitalize words separated by non-word characters', () => {
    expect(pipe.transform('juan-carlos perez')).toBe('Juan-Carlos Perez');
  });

  it('should not alter digits', () => {
    expect(pipe.transform('estudio 1 de prueba')).toBe('Estudio 1 De Prueba');
  });
});
