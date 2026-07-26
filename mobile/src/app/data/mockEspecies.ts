// mockEspecies.ts

export interface SpeciesOption {
  scientificName: string;
  vernacularNameEs: string;
  taxonKey: number;
  occurrenceCount: number;
}

export const MOCK_ESPECIES: SpeciesOption[] = [
  {
    scientificName: 'Rubus ulmifolius Schott',
    vernacularNameEs: 'Zarzamora',
    taxonKey: 2996929,
    occurrenceCount: 173,
  },
  {
    scientificName: 'Brachypodium retusum (Pers.) P.Beauv.',
    vernacularNameEs: 'Lastón',
    taxonKey: 5676053,
    occurrenceCount: 154,
  },
  {
    scientificName: 'Thymus vulgaris subsp. vulgaris',
    vernacularNameEs: 'Tomillo',
    taxonKey: 7306529,
    occurrenceCount: 153,
  },
  {
    scientificName: 'Genista scorpius (L.) DC.',
    vernacularNameEs: 'Aliaga',
    taxonKey: 5347727,
    occurrenceCount: 131,
  },
  {
    scientificName: 'Scirpoides holoschoenus (L.) Soják',
    vernacularNameEs: 'Junco',
    taxonKey: 2718201,
    occurrenceCount: 128,
  },
];
