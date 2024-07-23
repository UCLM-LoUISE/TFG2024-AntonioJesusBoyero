import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { LeafletMouseEvent } from 'leaflet';
import { provincesCoordinates } from '../plan-session/config/provincias';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.css']
})
export class LeafletComponent implements OnInit {

  // Coordenadas de Madrid, usadas por defecto
  defaultCoords: [number, number] = provincesCoordinates["Madrid"];

  // Atributos para pintar circulo
  selectedFigureType: string = 'circle';
  centerCoords: string = '';
  radius: number = 0;


  // capas para los mapas, mirar el más adecuado para regiones de campo
  layerSat: string = 'https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=5bZ97ZcuK0747A5ZdRdM'
  layerOpen: string = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

  map!: L.Map;

  constructor() { }

  ngOnInit(): void {
    this.map = this.initializeMap();
    this.addTileLayer(this.map);
    this.setupClickEvent(this.map);
  }

  private initializeMap(coords?: any): L.Map {
    // if (coords != undefined){
    //   return L.map('map').setView(coords, 13);
    // }else{
    //   return L.map('map').setView(this.defaultCoords, 13);
    // }

    return L.map('map').setView(this.defaultCoords, 13);

  }


  private addTileLayer(map: L.Map): void {
    L.tileLayer(this.layerOpen, {
      maxZoom: 18,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
  }

  private setupClickEvent(map: L.Map): void {
    map.on('click', (e: LeafletMouseEvent) => {
      // alert("You clicked the map at " + e.latlng);
      console.log("You clicked the map at " + e.latlng);

    });
  }


  addCircleToMap() {
    const [lat, lng] = this.centerCoords.split(',').map(coord => parseFloat(coord.trim()));
    const circle = L.circle([lat, lng], { radius: this.radius }).addTo(this.map);
    this.map.setView([lat, lng], 13); // Centrar el mapa en el círculo añadido
  }

  formValid() {
    if (this.selectedFigureType === 'circle') {
      return this.centerCoords && this.radius > 0;
    } else {
      // Implement validation logic for polygon
      return false;
    }
  }




}
