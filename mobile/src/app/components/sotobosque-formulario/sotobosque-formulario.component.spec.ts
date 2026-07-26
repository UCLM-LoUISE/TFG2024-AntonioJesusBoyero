import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SotobosqueFormularioComponent } from './sotobosque-formulario.component';

describe('SotobosqueFormularioComponent', () => {
  let component: SotobosqueFormularioComponent;
  let fixture: ComponentFixture<SotobosqueFormularioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SotobosqueFormularioComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SotobosqueFormularioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
