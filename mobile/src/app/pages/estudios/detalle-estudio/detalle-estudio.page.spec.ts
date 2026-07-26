import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleEstudioPage } from './detalle-estudio.page';

describe('DetalleEstudioPage', () => {
  let component: DetalleEstudioPage;
  let fixture: ComponentFixture<DetalleEstudioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleEstudioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
