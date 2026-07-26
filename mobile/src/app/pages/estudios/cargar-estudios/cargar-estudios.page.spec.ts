import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CargarEstudiosPage } from './cargar-estudios.page';

describe('CargarEstudiosPage', () => {
  let component: CargarEstudiosPage;
  let fixture: ComponentFixture<CargarEstudiosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CargarEstudiosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
