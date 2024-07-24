import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { provincesCoordinates, provincias } from './config/provincias';
import { NuevoEstudioPage } from 'src/app/pages/nuevo-estudio/page/nuevo-estudio.page';

@Component({
  selector: 'app-plan-session',
  templateUrl: './plan-session.component.html',
  styleUrls: ['./plan-session.component.css']
})
export class PlanSessionComponent {

  public static Instance: PlanSessionComponent


  sessionForm: FormGroup;
  provincias = provincias;
  showModal: boolean = false
  selectZone: boolean = false
  selectedProvince: string | undefined;
  initialCoordinates: [number, number] | undefined;

  constructor(private fb: FormBuilder) {
    PlanSessionComponent.Instance = this

    this.sessionForm = this.fb.group({
      sessionName: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      sessionType: ['', Validators.required],
      duration: ['', [Validators.required, Validators.min(1)]],
      province: ['', Validators.required],
      notes: ['']
    });
  }

  getCoordenadasProvincia(provincia: any): [number, number] {
    return provincesCoordinates[provincia];
  }




  onSubmit(): void {
    if (this.sessionForm.valid) {
      NuevoEstudioPage.Instance.setFormularioCompleto(true);
      NuevoEstudioPage.Instance.setInfoEstudio(this.sessionForm.value)

      // console.log(this.sessionForm.value);

      // Esto sera la inicilizacion del mapa dependiendo de la provincia que seleccionemos
      // this.selectedProvince = this.sessionForm.value.province;
      // this.initialCoordinates = this.getCoordenadasProvincia(this.selectedProvince);
      // console.log(this.initialCoordinates);
      this.selectZone = true;
    } else {
      // this.showModal = true;
      console.error('Form is invalid');
    }
  }


}
