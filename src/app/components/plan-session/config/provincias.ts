// provincias.ts
export const provincias = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila",
  "Badajoz", "Baleares", "Barcelona", "Burgos", "Cáceres", "Cádiz",
  "Cantabria", "Castellón", "Ciudad Real", "Córdoba", "Cuenca",
  "Gerona", "Granada", "Guadalajara", "Guipúzcoa", "Huelva",
  "Huesca", "Jaén", "La Coruña", "La Rioja", "Las Palmas",
  "León", "Lérida", "Lugo", "Madrid", "Málaga", "Murcia",
  "Navarra", "Orense", "Palencia", "Pontevedra", "Salamanca",
  "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria",
  "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid",
  "Vizcaya", "Zamora", "Zaragoza"
];


export interface ProvinceCoordinates {
  [key: string]: [number, number];
}

export const provincesCoordinates: ProvinceCoordinates = {
  "Álava": [42.851, -2.672],
  "Albacete": [38.995, -1.855],
  "Alicante": [38.345, -0.483],
  "Almería": [36.840, -2.467],
  "Asturias": [43.360, -5.844],
  "Ávila": [40.656, -4.681],
  "Badajoz": [38.878, -6.970],
  "Barcelona": [41.385, 2.173],
  "Burgos": [42.343, -3.696],
  "Cáceres": [39.476, -6.372],
  "Cádiz": [36.527, -6.289],
  "Cantabria": [43.182, -3.987],
  "Castellón": [39.986, -0.044],
  "Ciudad Real": [38.986, -3.927],
  "Córdoba": [37.888, -4.779],
  "Cuenca": [40.070, -2.137],
  "Girona": [41.981, 2.824],
  "Granada": [37.177, -3.598],
  "Guadalajara": [40.633, -3.167],
  "Guipúzcoa": [43.312, -1.978],
  "Huelva": [37.261, -6.944],
  "Huesca": [42.137, -0.408],
  "Islas Baleares": [39.569, 2.650],
  "Jaén": [37.765, -3.789],
  "La Coruña": [43.371, -8.396],
  "La Rioja": [42.465, -2.445],
  "Las Palmas": [28.124, -15.430],
  "León": [42.598, -5.567],
  "Lérida": [41.617, 0.620],
  "Lugo": [43.012, -7.556],
  "Madrid": [40.416, -3.703],
  "Málaga": [36.721, -4.421],
  "Murcia": [37.992, -1.130],
  "Navarra": [42.817, -1.644],
  "Orense": [42.335, -7.863],
  "Palencia": [42.009, -4.527],
  "Pontevedra": [42.429, -8.644],
  "Salamanca": [40.970, -5.663],
  "Santa Cruz de Tenerife": [28.463, -16.251],
  "Segovia": [40.943, -4.117],
  "Sevilla": [37.389, -5.984],
  "Soria": [41.764, -2.468],
  "Tarragona": [41.118, 1.245],
  "Teruel": [40.344, -1.106],
  "Toledo": [39.862, -4.027],
  "Valencia": [39.469, -0.377],
  "Valladolid": [41.652, -4.728],
  "Vizcaya": [43.263, -2.935],
  "Zamora": [41.503, -5.746],
  "Zaragoza": [41.648, -0.889]
};


