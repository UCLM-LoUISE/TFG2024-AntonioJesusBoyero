import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoEstudioPage } from '../nuevo-estudio.page';

describe('NuevoEstudioPage', () => {
  let component: NuevoEstudioPage;
  let fixture: ComponentFixture<NuevoEstudioPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NuevoEstudioPage ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoEstudioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
