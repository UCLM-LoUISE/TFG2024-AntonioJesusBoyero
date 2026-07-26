import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstudiosPage } from './estudios.page';

describe('EstudiosPage', () => {
  let component: EstudiosPage;
  let fixture: ComponentFixture<EstudiosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EstudiosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
