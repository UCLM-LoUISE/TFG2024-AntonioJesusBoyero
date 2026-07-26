import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ArboladoFormularioComponent } from './arbolado-formulario.component';

describe('ArboladoFormularioComponent', () => {
  let component: ArboladoFormularioComponent;
  let fixture: ComponentFixture<ArboladoFormularioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ArboladoFormularioComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ArboladoFormularioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
