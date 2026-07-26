import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerEstudiosPage } from './ver-estudios.page';

describe('VerEstudiosPage', () => {
  let component: VerEstudiosPage;
  let fixture: ComponentFixture<VerEstudiosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VerEstudiosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
