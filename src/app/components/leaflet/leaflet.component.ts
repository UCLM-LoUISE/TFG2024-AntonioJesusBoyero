import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { LeafletMouseEvent } from 'leaflet';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.css']
})
export class LeafletComponent implements OnInit {

  selectedShape: string = 'marker';
  points: string = '';
  radio: number = 0;
  drawnItems: L.FeatureGroup = L.featureGroup();

  // capas para los mapas
  layerSat: string = 'https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=5bZ97ZcuK0747A5ZdRdM'
  layerOpen: string = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

  constructor() { }

  ngOnInit(): void {
    const map = this.initializeMap();
    this.addTileLayer(map);
    // this.addMarker(map);
    // this.addCircle(map);
    // this.addPolygon(map);
    // this.addPolygonPopup(map);
    this.setupClickEvent(map);
    this.onFormSubmit(); // Llama a onFormSubmit pasando el mapa inicial
  }

  private initializeMap(): L.Map {
    return L.map('map').setView([38.9944, -1.8585], 13);
  }

  private addTileLayer(map: L.Map): void {
    L.tileLayer(this.layerOpen, {
      maxZoom: 18,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
  }

  private setupClickEvent(map: L.Map): void {
    map.on('click', (e: LeafletMouseEvent) => {
      alert("You clicked the map at " + e.latlng);
    });
  }

  // private addMarker(map: L.Map): void {
  //   L.marker([38.989235, -1.84991]).addTo(map);
  // }

  // private addCircle(map: L.Map): void {
  //   L.circle([38.983298, -1.853561], {
  //     color: 'blue',
  //     fillColor: '#f03',
  //     fillOpacity: 0.5,
  //     radius: 150
  //   }).addTo(map);
  // }

  // private addPolygon(map: L.Map): void {
  //   L.polygon([
  //     [38.997, -1.860],
  //     [38.993, -1.853],
  //     [38.988, -1.862]
  //   ], {
  //     color: 'green',
  //     fillColor: '#33ff33',
  //     fillOpacity: 0.5
  //   }).addTo(map);
  // }

  // private addPolygonPopup(map: L.Map): void {
  //   map.eachLayer((layer) => {
  //     if (layer instanceof L.Polygon) {
  //       layer.bindPopup("I am a polygon.");
  //     }
  //   });
  // }

  private addMarker(map: L.Map): void {
    const latLng = this.parseLatLng(this.points);
    if (latLng) {
      L.marker(latLng).addTo(map);
    }
  }

  private addPolygon(map: L.Map): void {
    const latLngArray = this.parseLatLngArray(this.points);
    if (latLngArray) {
      L.polygon(latLngArray).addTo(map);
    }
  }

  private addCircle(map: L.Map): void {
    const latLng = this.parseLatLng(this.points);
    if (latLng && this.radio) {
      L.circle(latLng, {
        radius: this.radio,
        color: 'blue',
        fillColor: '#f03',
        fillOpacity: 0.5
      }).addTo(map);
    }
  }


  onFormSubmit(): void {
    const map = this.initializeMap()
    if (this.selectedShape === 'marker') {
      this.addMarker(map);
    } else if (this.selectedShape === 'polygon') {
      this.addPolygon(map);
    } else if (this.selectedShape === 'circle') {
      this.addCircle(map);
    }

  }


  private parseLatLng(latlngString: string): L.LatLng | undefined {
    const latLngArray = latlngString.split(',').map(coord => parseFloat(coord.trim()));
    if (latLngArray.length === 2 && !isNaN(latLngArray[0]) && !isNaN(latLngArray[1])) {
      return L.latLng(latLngArray[0], latLngArray[1]);
    } else {
      alert('Coordenadas no válidas.');
      return undefined
    }
  }

  private parseLatLngArray(pointsString: string): L.LatLng[] {
    const pointsArray = pointsString.split(';');
    const latLngArray: L.LatLng[] = [];

    for (const point of pointsArray) {
      const latLng = this.parseLatLng(point);
      if (latLng) {
        latLngArray.push(latLng);
      }
    }

    return latLngArray;
  }

}

