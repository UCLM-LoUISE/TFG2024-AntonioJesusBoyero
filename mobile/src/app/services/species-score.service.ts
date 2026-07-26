import { Injectable } from '@angular/core';

/**
 * Servicio para gestionar las puntuaciones de las especies del recomendador.
 * Cada vez que se selecciona una especie, se incrementa su puntuación y sube
 * en el listado.
 *
 * Las puntuaciones tienen ÁMBITO POR ESTUDIO Y TIPO DE TAREA: las tareas de
 * un mismo estudio comparten ranking (misma zona -> especies parecidas), pero
 * arbolado y sotobosque van por separado (estratos con flora distinta). Cada
 * estudio nuevo empieza de cero. Se persisten en localStorage (una clave por
 * ámbito) para sobrevivir a recargas dentro del mismo trabajo.
 */
@Injectable({
  providedIn: 'root'
})
export class SpeciesScoreService {
  private readonly STORAGE_PREFIX = 'species_scores_v2';
  /** Clave del sistema antiguo (puntuaciones globales acumuladas). */
  private readonly LEGACY_STORAGE_KEY = 'species_scores';

  /** Ámbito actual de las puntuaciones (estudio + tipo de tarea abiertos). */
  private contexto: string = 'global';
  private scores: Map<number, number> = new Map(); // taxonKey -> score

  constructor() {
    // El sistema antiguo acumulaba las puntuaciones de TODOS los estudios en
    // una sola clave, con lo que el histórico distorsionaba el orden de las
    // tareas nuevas. Se descarta para siempre.
    try {
      localStorage.removeItem(this.LEGACY_STORAGE_KEY);
    } catch { /* almacenamiento no disponible */ }

    this.loadScores();
  }

  /**
   * Fija el ámbito de puntuaciones a partir de ahora: el estudio y el tipo de
   * tarea abiertos. Llamar al entrar en una tarea; un estudio nuevo (o el otro
   * tipo de tarea del mismo estudio) empieza con todo a cero.
   */
  setContexto(idEstudio: string | number | null | undefined, tipoTarea?: string): void {
    const hayEstudio = idEstudio !== null && idEstudio !== undefined && `${idEstudio}` !== '';
    const nuevoContexto = hayEstudio
      ? `estudio_${idEstudio}_${tipoTarea || 'general'}`
      : 'global';

    if (nuevoContexto === this.contexto) return;

    this.contexto = nuevoContexto;
    this.loadScores();
  }

  private storageKey(): string {
    return `${this.STORAGE_PREFIX}_${this.contexto}`;
  }

  /**
   * Cargar las puntuaciones del contexto actual desde localStorage
   */
  private loadScores(): void {
    try {
      const stored = localStorage.getItem(this.storageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        this.scores = new Map(Object.entries(parsed).map(([k, v]) => [Number(k), v as number]));
      } else {
        this.scores = new Map();
      }
    } catch (error) {
      console.error('Error cargando puntuaciones de especies:', error);
      this.scores = new Map();
    }
  }

  /**
   * Guardar las puntuaciones del contexto actual en localStorage
   */
  private saveScores(): void {
    try {
      const obj: {[key: string]: number} = {};
      this.scores.forEach((value, key) => {
        obj[key.toString()] = value;
      });
      localStorage.setItem(this.storageKey(), JSON.stringify(obj));
    } catch (error) {
      console.error('Error guardando puntuaciones de especies:', error);
    }
  }

  /**
   * Incrementar la puntuación de una especie
   * @param taxonKey - ID de la especie
   */
  incrementScore(taxonKey: number): void {
    const currentScore = this.scores.get(taxonKey) || 0;
    this.scores.set(taxonKey, currentScore + 1);
    this.saveScores();
  }

  /**
   * Obtener la puntuación de una especie
   * @param taxonKey - ID de la especie
   * @returns Puntuación actual (0 si no tiene)
   */
  getScore(taxonKey: number): number {
    return this.scores.get(taxonKey) || 0;
  }

  /**
   * Obtener todas las puntuaciones del contexto actual
   * @returns Mapa de taxonKey -> puntuación
   */
  getAllScores(): Map<number, number> {
    return new Map(this.scores);
  }

  /** ¿Hay alguna puntuación en el contexto actual? */
  hasScores(): boolean {
    return this.scores.size > 0;
  }

  /**
   * Limpiar las puntuaciones del contexto actual (reinicio manual del
   * recomendador o testing)
   */
  clearAllScores(): void {
    this.scores.clear();
    try {
      localStorage.removeItem(this.storageKey());
    } catch { /* almacenamiento no disponible */ }
  }
}
