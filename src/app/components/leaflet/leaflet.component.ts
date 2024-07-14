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
    this.addPolygon(map);
    this.setupClickEvent(map);
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

  private addPolygon(map: L.Map): void {
    const polygon = L.polygon([
      [38.997024, -1.856819],
      [38.996824, -1.855704],
      [38.99594, -1.855918],
      [38.995928, -1.856642]
    ], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5
    }).addTo(map);

    polygon.bindPopup('Este es tu poligono').openPopup();
  }




}
