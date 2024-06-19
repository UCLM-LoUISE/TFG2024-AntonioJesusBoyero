import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-plan-session',
  templateUrl: './plan-session.component.html',
  styleUrls: ['./plan-session.component.css']
})
export class PlanSessionComponent implements OnInit {

  sessionForm!: FormGroup;

  private map!: L.Map;
  private centroid: L.LatLngExpression = [39.8282, -98.5795]; // Centro de EEUU


  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.sessionForm = this.fb.group({
      studyType: ['', Validators.required],
      studyName: ['', Validators.required],
      studyDate: ['', Validators.required],
      studyArea: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.sessionForm.valid) {
      console.log(this.sessionForm.value);
    }
  }



  private initMap(): void {
    this.map = L.map('map', {
      center: this.centroid,
      zoom: 5
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    tiles.addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const latlng = e.latlng;
      this.sessionForm.controls['studyArea'].setValue(`${latlng.lat}, ${latlng.lng}`);
      L.marker([latlng.lat, latlng.lng]).addTo(this.map);
    });
  }


}
