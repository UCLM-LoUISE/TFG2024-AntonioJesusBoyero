import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-plan-session',
  templateUrl: './plan-session.component.html',
  styleUrls: ['./plan-session.component.css']
})
export class PlanSessionComponent implements OnInit {

  planSessionForm!: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.planSessionForm = this.fb.group({
      sessionName: ['', Validators.required],
      sessionDate: ['', Validators.required],
      duration: ['', [Validators.required, Validators.min(1)]],
      studyType: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.planSessionForm.valid) {
      console.log(this.planSessionForm.value);
      // Aquí puedes añadir la lógica para manejar la planificación de la sesión
      this.planSessionForm.reset();
    }
  }


}
