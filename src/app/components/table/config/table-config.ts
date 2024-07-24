export const TABLE_HEADERS = [
  { key: 'name', label: 'Nombre' },
  { key: 'date', label: 'Fecha Inicio' },
  { key: 'dateFin', label: 'Fecha Fin' },
  { key: 'duration', label: 'Duración' },
  { key: 'type', label: 'Tipo' },
  { key: 'view', label: '' },
  { key: 'edit', label: '' },
  { key: 'delete', label: '' }
];

export interface TableRow {
  id: number; // Identificador único
  [key: string]: any;
}

export const MOCK_DATA: TableRow[] = [
  {
    id: 1,
    name: 'Nombre muy largo que debería truncarse',
    date: '2024-07-10',
    dateFin: '2024-07-10',
    duration: 1,
    type: 'Estudio A'
  },
  {
    id: 2,
    name: 'Otro nombre muy largo que debería truncarse',
    date: '2024-07-11',
    dateFin: '2024-07-10',
    duration: 2,
    type: 'Estudio B'
  },
  {
    id: 3,
    name: 'Nombre corto',
    date: '2024-07-12',
    dateFin: '2024-07-10',
    duration: 3,
    type: 'Estudio C'
  },
  {
    id: 4,
    name: 'Nombre muy largo que debería truncarse',
    date: '2024-07-10',
    dateFin: '2024-07-10',
    duration: 4,
    type: 'Estudio A'
  },
  {
    id: 5,
    name: 'Nombre muy largo que debería truncarse',
    date: '2024-07-10',
    dateFin: '2024-07-10',
    duration: 5,
    type: 'Estudio A'
  },
  {
    id: 6,
    name: 'Otro nombre muy largo que debería truncarse',
    date: '2024-07-11',
    dateFin: '2024-07-10',
    duration: 6,
    type: 'Estudio B'
  },
  {
    id: 7,
    name: 'Nombre corto',
    date: '2024-07-12',
    dateFin: '2024-07-10',
    duration: 7,
    type: 'Estudio C'
  },
  {
    id: 8,
    name: 'Nombre muy largo que debería truncarse',
    date: '2024-07-10',
    dateFin: '2024-07-10',
    duration: 8,
    type: 'Estudio A'
  },
  {
    id: 9,
    name: 'Nombre muy largo que debería truncarse',
    date: '2024-07-10',
    dateFin: '2024-07-10',
    duration: 9,
    type: 'Estudio A'
  }
];
