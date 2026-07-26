import * as L from 'leaflet';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

export enum TipoTarea {
  MedicionArbolado = 'medicion_arboles',
  MedicionSotobosque = 'medicion_sotobosque',
}

/**
 * Capas base disponibles en los mapas de la app.
 * Se comparten entre la pantalla de tareas (trabajo de campo) y la de detalle
 * del estudio para que el conmutador de capas sea idéntico en ambas.
 */
/* ===========================================================================
   EXPORTACIÓN ORGANIZADA · Descargas/TerrApp/<Estudio>/<Tarea>/<Momento>
   =========================================================================== */

/** Carpeta raíz de todas las exportaciones, relativa a Directory.ExternalStorage. */
export const CARPETA_RAIZ_EXPORTACION = 'Download/TerrApp';

/** Limpia un nombre para usarlo como carpeta (quita caracteres ilegales). */
export function sanitizarNombreCarpeta(nombre: string): string {
  return (nombre || 'sin_nombre')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.+$/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'sin_nombre';
}

/** Ruta de la carpeta de un estudio: Download/TerrApp/<Estudio> */
export function rutaExportacionEstudio(nombreEstudio: string): string {
  return `${CARPETA_RAIZ_EXPORTACION}/${sanitizarNombreCarpeta(nombreEstudio)}`;
}

/** Ruta de la carpeta de una tarea (con subcarpeta de momento si lo hay). */
export function rutaExportacionTarea(nombreEstudio: string, nombreTarea: string, momento?: string): string {
  let ruta = `${rutaExportacionEstudio(nombreEstudio)}/${sanitizarNombreCarpeta(nombreTarea)}`;
  if (momento) ruta += `/${sanitizarNombreCarpeta(momento)}`;
  return ruta;
}

/** Crea la carpeta (y las intermedias) si no existen. */
export async function asegurarCarpeta(ruta: string): Promise<void> {
  try {
    await Filesystem.mkdir({ path: ruta, directory: Directory.ExternalStorage, recursive: true });
  } catch (e: any) {
    // "Directory exists" no es un error para nosotros
    if (!/exist/i.test(e?.message || '')) throw e;
  }
}

/**
 * Primer nombre libre dentro de la carpeta, estilo Windows:
 * datos.json, datos(2).json, datos(3).json...
 */
export async function nombreLibreEnCarpeta(carpeta: string, nombreArchivo: string): Promise<string> {
  const punto = nombreArchivo.lastIndexOf('.');
  const base = punto > 0 ? nombreArchivo.slice(0, punto) : nombreArchivo;
  const extension = punto > 0 ? nombreArchivo.slice(punto) : '';

  for (let i = 1; i <= 50; i++) {
    const candidato = i === 1 ? nombreArchivo : `${base}(${i})${extension}`;
    try {
      await Filesystem.stat({ path: `${carpeta}/${candidato}`, directory: Directory.ExternalStorage });
      // existe -> probar el siguiente número
    } catch {
      return candidato; // no existe -> libre
    }
  }
  return `${base}_${marcaDeTiempoArchivo()}${extension}`;
}

/**
 * Escribe un archivo de texto (JSON) en la carpeta exportada sin machacar
 * nada. Si el nombre elegido falla (p. ej. archivo invisible de una
 * instalación anterior en Android 11+), reintenta con marca de tiempo.
 * Devuelve el nombre final.
 */
export async function escribirJsonEnCarpeta(carpeta: string, nombreArchivo: string, contenido: string): Promise<string> {
  await asegurarCarpeta(carpeta);
  const nombre = await nombreLibreEnCarpeta(carpeta, nombreArchivo);
  const opciones = { directory: Directory.ExternalStorage, encoding: Encoding.UTF8 } as const;
  try {
    await Filesystem.writeFile({ path: `${carpeta}/${nombre}`, data: contenido, ...opciones });
    return nombre;
  } catch {
    const punto = nombreArchivo.lastIndexOf('.');
    const base = punto > 0 ? nombreArchivo.slice(0, punto) : nombreArchivo;
    const extension = punto > 0 ? nombreArchivo.slice(punto) : '';
    const alternativo = `${base}_${marcaDeTiempoArchivo()}${extension}`;
    await Filesystem.writeFile({ path: `${carpeta}/${alternativo}`, data: contenido, ...opciones });
    return alternativo;
  }
}

/**
 * Copia un archivo binario (audio, imagen) a la carpeta exportada.
 * `origenPath` puede ser una ruta absoluta (file:///...) o un nombre relativo
 * a la carpeta de archivos de la app (Directory.External).
 * Devuelve el nombre final con el que quedó guardado.
 */
export async function copiarArchivoACarpeta(carpeta: string, nombreArchivo: string, origenPath: string): Promise<string> {
  await asegurarCarpeta(carpeta);
  const esAbsoluta = origenPath.startsWith('file:') || origenPath.startsWith('/') || origenPath.startsWith('content:');
  const origen = esAbsoluta ? { from: origenPath } : { from: origenPath, directory: Directory.External };

  const nombre = await nombreLibreEnCarpeta(carpeta, nombreArchivo);
  try {
    await Filesystem.copy({ ...origen, to: `${carpeta}/${nombre}`, toDirectory: Directory.ExternalStorage });
    return nombre;
  } catch (e) {
    const punto = nombreArchivo.lastIndexOf('.');
    const base = punto > 0 ? nombreArchivo.slice(0, punto) : nombreArchivo;
    const extension = punto > 0 ? nombreArchivo.slice(punto) : '';
    const alternativo = `${base}_${marcaDeTiempoArchivo()}${extension}`;
    await Filesystem.copy({ ...origen, to: `${carpeta}/${alternativo}`, toDirectory: Directory.ExternalStorage });
    return alternativo;
  }
}

/** Marca de tiempo compacta para nombres de archivo: 20260703_125301 */
export function marcaDeTiempoArchivo(): string {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Guarda un JSON exportado de forma fiable en cada plataforma:
 *
 * - Web: descarga real del navegador. (Antes se usaba Filesystem, que en web
 *   escribe en IndexedDB: no daba error pero el archivo no aparecía en disco.)
 * - Nativo: carpeta pública Documentos. En Android 11+ escribir ahí falla con
 *   EACCES si el archivo ya existe de una instalación anterior; si falla, se
 *   recurre a la carpeta externa propia de la app, que nunca necesita permisos.
 *
 * Devuelve un texto descriptivo de dónde quedó guardado (para el toast).
 * Si tampoco puede guardarse en el destino de reserva, propaga el error.
 */
export async function guardarJsonExportado(fileName: string, jsonContent: string): Promise<string> {
  if (Capacitor.getPlatform() === 'web') {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    return `Descargado como ${fileName}`;
  }

  try {
    await Filesystem.writeFile({
      path: fileName,
      data: jsonContent,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    return `Guardado en Documentos como ${fileName}`;
  } catch (errorDocumentos) {
    console.error('No se pudo guardar en Documentos, usando la carpeta de la app:', errorDocumentos);
    await Filesystem.writeFile({
      path: fileName,
      data: jsonContent,
      directory: Directory.External,
      encoding: Encoding.UTF8,
    });
    return `Guardado en la carpeta de la app (Android/data) como ${fileName}`;
  }
}

export interface CapasBaseMapa {
  /** Diccionario nombre -> capa, listo para `L.control.layers`. */
  capas: { [nombre: string]: L.TileLayer };
  /** Capa que se muestra por defecto al abrir el mapa. */
  porDefecto: L.TileLayer;
}

const THUNDERFOREST_API_KEY = '9ed48a0fdb4345aca36f4ec394272dd7';

/**
 * Crea un juego nuevo de capas base. Debe llamarse una vez por mapa, ya que una
 * misma instancia de `L.TileLayer` no puede compartirse entre dos mapas.
 */
export function crearCapasBaseMapa(): CapasBaseMapa {
  // Topográfico / senderos (capa histórica de la app, se mantiene por defecto).
  const topografico = L.tileLayer(
    `https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`,
    {
      attribution: '&copy; Thunderforest, OpenStreetMap contributors',
      maxZoom: 22,
      subdomains: ['a', 'b', 'c'],
    },
  );

  // Imagen de satélite / ortofoto mundial (Esri World Imagery).
  const satelite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  );

  // Ortofoto aérea oficial de España (PNOA - Instituto Geográfico Nacional).
  const pnoa = L.tileLayer(
    'https://www.ign.es/wmts/pnoa-ma?layer=OI.OrthoimageCoverage&style=default' +
      '&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0' +
      '&Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}',
    {
      attribution: '&copy; Instituto Geográfico Nacional de España (PNOA)',
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  );

  // Callejero estándar de OpenStreetMap.
  const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  });

  return {
    capas: {
      'Topográfico': topografico,
      'Satélite': satelite,
      'PNOA (IGN)': pnoa,
      'OpenStreetMap': openStreetMap,
    },
    porDefecto: topografico,
  };
}
