import { Component, forwardRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import { SpeciesScoreService } from '../../services/species-score.service';

// Interfaz para las especies del catálogo
export interface CatalogoEspecie {
  taxonKey: number;
  scientificName: string;
  family: string;
  genus: string;
  species: string;
}

// Interfaz para especies con índice de búsqueda pre-calculado
interface IndexedEspecie extends CatalogoEspecie {
  searchIndex: string; // Todos los campos concatenados en minúsculas para búsqueda rápida
}

@Component({
  selector: 'app-species-picker',
  templateUrl: './species-picker.component.html',
  styleUrls: ['./species-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Optimización de detección de cambios
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SpeciesPickerComponent),
      multi: true,
    },
  ],
})
export class SpeciesPickerComponent implements ControlValueAccessor {
  allSpecies: IndexedEspecie[] = [];
  filteredSpecies: IndexedEspecie[] = [];
  displayedSpecies: IndexedEspecie[] = [];
  buscadorEspeciesAbierto = false;
  searchText = '';
  selectedSpecieDetail: CatalogoEspecie | null = null;
  showDetailModal = false;

  // Lazy loading
  private catalogoLoaded = false;
  private loadingCatalogo = false;

  // Caché de búsquedas
  private searchCache = new Map<string, IndexedEspecie[]>();
  private readonly MAX_CACHE_SIZE = 20;

  // Optimización de rendimiento
  readonly MAX_DISPLAYED_ITEMS = 100; // Mostrar máximo 100 especies a la vez
  readonly LOAD_MORE_THRESHOLD = 20; // Cargar 20 más en cada scroll
  readonly INITIAL_DISPLAY_COUNT = 20; // Mostrar 20 especies al abrir el modal
  currentDisplayCount = 0;

  // Estado de búsqueda
  isSearching = false;

  value: string = '';
  disabled = false;

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private scoreService: SpeciesScoreService,
    private alertController: AlertController
  ) {}

  /** ¿Hay puntuaciones acumuladas en el estudio/tipo de tarea actual? */
  get hayPuntuaciones(): boolean {
    return this.scoreService.hasScores();
  }

  /**
   * Reinicio manual del recomendador: borra las puntuaciones del ámbito
   * actual (este estudio y tipo de tarea) y devuelve el listado a su orden
   * inicial. El sistema sigue puntuando con normalidad a partir de ahí.
   */
  async reiniciarPuntuaciones() {
    const alerta = await this.alertController.create({
      header: '¿Reiniciar recomendaciones?',
      message:
        'Se borrarán las puntuaciones de especies acumuladas en este estudio ' +
        'y el listado volverá a su orden inicial.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Reiniciar', role: 'destructive' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    if (role !== 'destructive') return;

    this.scoreService.clearAllScores();
    this.searchCache.clear();

    // Volver a componer el listado sin las puntuaciones
    if (this.searchText) {
      const valor = this.searchText.toLowerCase().trim();
      this.filteredSpecies = this.allSpecies.filter((sp) => sp.searchIndex.includes(valor));
      this.updateDisplayedSpecies();
    } else {
      this.showInitialSpecies();
    }
    this.cdr.markForCheck();
  }

  writeValue(obj: any): void {
    this.value = obj || '';
    this.cdr.markForCheck(); // ⬅️ CRÍTICO: Forzar actualización de la vista con OnPush
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck(); // ⬅️ También aquí por consistencia
  }

  abrirBuscadorEspecies() {
    if (this.disabled) return;
    this.buscadorEspeciesAbierto = true;

    // Lazy loading: cargar catálogo solo cuando se abre el modal
    if (!this.catalogoLoaded && !this.loadingCatalogo) {
      this.loadAllSpecies();
    } else if (this.catalogoLoaded) {
      // Re-ordenar especies cada vez que se abre el modal para reflejar las nuevas puntuaciones
      this.showInitialSpecies();
    }

    this.onTouched();
    this.cdr.markForCheck(); // Forzar detección de cambios con OnPush
  }

  onEspecieInput(event: any) {
    const value: string = (event.detail?.value || '').toLowerCase().trim();

    // Buscar en todos los campos disponibles
    if (value && this.allSpecies && this.allSpecies.length) {
      // Mostrar spinner de búsqueda
      this.isSearching = true;
      this.cdr.markForCheck();

      // Usar setTimeout para permitir que el spinner se muestre
      setTimeout(() => {
        // Revisar caché primero
        if (this.searchCache.has(value)) {
          this.filteredSpecies = this.searchCache.get(value)!;
        } else {
          // Búsqueda optimizada usando índice pre-calculado
          const searchResults = this.allSpecies.filter((sp) =>
            sp.searchIndex.includes(value)
          );

          // Ordenar resultados por puntuación
          this.filteredSpecies = this.sortByScore(searchResults);

          // Guardar en caché
          this.addToCache(value, this.filteredSpecies);
        }

        // Actualizar las especies mostradas
        this.updateDisplayedSpecies();
        this.isSearching = false;
        this.buscadorEspeciesAbierto = true;
        this.cdr.markForCheck(); // Forzar detección de cambios
      }, 0);
    } else {
      // Si no hay texto, mostrar las primeras 20
      this.isSearching = false;
      this.showInitialSpecies();
      this.buscadorEspeciesAbierto = true;
      this.cdr.markForCheck();
    }
  }

  selectSpecies(sp: CatalogoEspecie) {
    this.value = sp.scientificName;
    this.onChange(sp.scientificName);

    // Incrementar la puntuación de la especie seleccionada
    this.scoreService.incrementScore(sp.taxonKey);

    // Invalidar la caché de búsquedas: guarda los resultados YA ordenados,
    // así que tras puntuar devolvería el orden antiguo y la especie no
    // subiría en el listado aunque su puntuación hubiera aumentado.
    this.searchCache.clear();

    this.buscadorEspeciesAbierto = false;
    this.cdr.markForCheck();
  }

  cerrarDropdownEspecie() {
    this.buscadorEspeciesAbierto = false;
  }

  limpiarBusqueda() {
    this.searchText = '';
    this.isSearching = false;
    this.showInitialSpecies();
    this.cdr.markForCheck();
  }

  loadAllSpecies() {
    if (this.catalogoLoaded || this.loadingCatalogo) return;

    this.loadingCatalogo = true;

    // Cargar el catálogo completo de especies desde assets
    this.http.get<{especies: CatalogoEspecie[]}>('assets/data/catalogo_especies.json').subscribe({
      next: (data) => {
        // Crear índice de búsqueda pre-calculado para cada especie
        this.allSpecies = (data.especies || []).map(sp => ({
          ...sp,
          searchIndex: [
            (sp.scientificName || '').toLowerCase(),
            (sp.family || '').toLowerCase(),
            (sp.genus || '').toLowerCase(),
            (sp.species || '').toLowerCase(),
            sp.taxonKey.toString()
          ].join('|') // Usar separador para búsquedas precisas
        }));

        this.catalogoLoaded = true;
        this.loadingCatalogo = false;

        // Mostrar las primeras 20 especies por defecto
        this.showInitialSpecies();

        console.log(`Catálogo cargado e indexado: ${this.allSpecies.length} especies`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando catalogo_especies.json desde assets', err);
        this.allSpecies = [];
        this.filteredSpecies = [];
        this.displayedSpecies = [];
        this.loadingCatalogo = false;
        this.cdr.markForCheck();
      },
    });
  }

  // Actualizar las especies mostradas (renderizado limitado)
  updateDisplayedSpecies() {
    this.currentDisplayCount = this.MAX_DISPLAYED_ITEMS;
    this.displayedSpecies = this.filteredSpecies.slice(0, this.currentDisplayCount);
  }

  // Mostrar las primeras especies al abrir el modal
  private showInitialSpecies() {
    if (this.allSpecies.length > 0) {
      // filteredSpecies contiene TODAS las especies disponibles
      // Ordenar por puntuación (mayor a menor) antes de mostrar
      this.filteredSpecies = this.sortByScore([...this.allSpecies]);
      // displayedSpecies solo muestra las primeras 20
      this.displayedSpecies = this.filteredSpecies.slice(0, this.INITIAL_DISPLAY_COUNT);
      this.currentDisplayCount = this.INITIAL_DISPLAY_COUNT;
    }
  }

  // Gestión de caché de búsquedas
  private addToCache(key: string, results: IndexedEspecie[]) {
    // Si el caché está lleno, eliminar la entrada más antigua
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, results);
  }

  // Cargar más especies al hacer scroll
  loadMoreSpecies(event?: any) {
    if (this.currentDisplayCount >= this.filteredSpecies.length) {
      event?.target?.complete();
      return;
    }

    // Eliminar setTimeout para carga más rápida
    const nextCount = Math.min(
      this.currentDisplayCount + this.LOAD_MORE_THRESHOLD,
      this.filteredSpecies.length
    );
    this.displayedSpecies = this.filteredSpecies.slice(0, nextCount);
    this.currentDisplayCount = nextCount;
    this.cdr.markForCheck();
    event?.target?.complete();
  }

  // TrackBy function para optimizar ngFor
  trackByTaxonKey(index: number, item: CatalogoEspecie): number {
    return item.taxonKey;
  }

  // Método para abrir modal con detalles completos de la especie
  showSpecieDetail(sp: CatalogoEspecie) {
    this.selectedSpecieDetail = sp;
    this.showDetailModal = true;
    this.cdr.markForCheck();
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedSpecieDetail = null;
    this.cdr.markForCheck();
  }

  /**
   * Ordenar especies por puntuación (mayor a menor)
   * Las especies con mayor puntuación aparecen primero
   * Las especies sin puntuación mantienen su orden original
   */
  private sortByScore(especies: IndexedEspecie[]): IndexedEspecie[] {
    return especies.sort((a, b) => {
      const scoreA = this.scoreService.getScore(a.taxonKey);
      const scoreB = this.scoreService.getScore(b.taxonKey);

      // Ordenar por puntuación descendente (mayor primero)
      // Si tienen la misma puntuación, mantener orden original
      return scoreB - scoreA;
    });
  }
}
