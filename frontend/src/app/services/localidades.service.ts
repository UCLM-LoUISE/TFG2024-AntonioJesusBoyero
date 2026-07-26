import { Injectable } from '@angular/core';
import { municipios } from '../config/municipios';

@Injectable({
  providedIn: 'root'
})
export class LocalidadesService {

  private data = municipios;

  // Obtener las provincias disponibles
  getProvinciasNuevo(): { code: string; label: string }[] {
    const provincias: { code: string; label: string }[] = [];
    Object.entries(this.data).forEach(([comunidad, provinciasObj]: any) => {
      Object.keys(provinciasObj).forEach((provincia) => {
        provincias.push({ code: provincia, label: provincia });
      });
    });
    return provincias.sort((a, b) => a.label.localeCompare(b.label));
  }
  // Obtener las poblaciones de una provincia
  getPoblacionesByProvinciaNuevo(
    provinciaSeleccionada: string
  ): { label: string; latitud: number; longitud: number }[] {
    let poblaciones: { label: string; latitud: number; longitud: number }[] = [];
    Object.entries(this.data).forEach(([comunidad, provinciasObj]: any) => {
      if (provinciasObj[provinciaSeleccionada]) {
        poblaciones = provinciasObj[provinciaSeleccionada].map(
          (municipio: any) => ({
            label: municipio.municipio,
            latitud: municipio.latitud,
            longitud: municipio.longitud,
          })
        );
      }
    });
    return poblaciones.sort((a, b) => a.label.localeCompare(b.label));
  }

  getCoordenadas(provincia: string, municipio: string): [number, number] | null {
    // Buscar la comunidad autónoma que contiene la provincia
    const comunidad = Object.values(municipios).find((comunidad: any) =>
      Object.keys(comunidad).includes(provincia)
    );

    if (!comunidad) {
      console.error(`Provincia no encontrada: ${provincia}`);
      return null;
    }

    // Buscar el municipio dentro de la provincia
    const municipiosProvincia = comunidad[provincia];
    const municipioData = municipiosProvincia.find((mun: any) => mun.municipio === municipio);

    if (!municipioData) {
      console.error(`Municipio no encontrado: ${municipio}`);
      return null;
    }

    // Retornar latitud y longitud
    return [municipioData.latitud, municipioData.longitud];
  }

}




