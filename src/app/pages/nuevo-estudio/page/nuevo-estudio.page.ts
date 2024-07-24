import { Component, OnInit } from '@angular/core';
import { BackService } from 'src/app/service/back.service';

@Component({
  selector: 'app-nuevo-estudio',
  templateUrl: './nuevo-estudio.page.html'
})

export class NuevoEstudioPage implements OnInit {

  public static Instance: NuevoEstudioPage

  formularioCompleto: boolean = false

  infoEstudio: any
  zonasEstudio: any

  constructor(private _service: BackService) { NuevoEstudioPage.Instance = this }

  ngOnInit(): void {
  }

  public setFormularioCompleto(valor: any) {
    this.formularioCompleto = valor
  }

  public getInfoEstudio() { return this.infoEstudio; }
  public setInfoEstudio(value: any) { this.infoEstudio = value; }
  public getZonasEstudio() { return this.zonasEstudio; }
  public setZonasEstudio(value: any) { this.zonasEstudio = value; }


  public enviarEstudioToBack() {
    console.log("INFO PARA MANDAR AL BACKEND");
    console.log(this.infoEstudio);
    console.log(this.zonasEstudio);

    const estudioData = {
      infoEstudio: this.infoEstudio,
      zonasEstudio: this.zonasEstudio
    };


    this._service.enviarEstudio(estudioData).subscribe({
      next: (response) => {
        console.log('Estudio enviado exitosamente', response);
      },
      error: (error) => {
        console.error('Error al enviar el estudio', error);
      }
    });
  }
}



