import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TitleComponent } from './title.component';

describe('TitleComponent', () => {
  let component: TitleComponent;
  let fixture: ComponentFixture<TitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TitleComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TitleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should have empty inputs by default', () => {
    expect(component.titulo).toBe('');
    expect(component.nombreEstudio).toBe('');
  });

  it('should accept titulo and nombreEstudio inputs', () => {
    component.titulo = 'Mis estudios';
    component.nombreEstudio = 'Estudio de suelos';
    fixture.detectChanges();

    expect(component.titulo).toBe('Mis estudios');
    expect(component.nombreEstudio).toBe('Estudio de suelos');
  });

  it('should render the titulo in the template', () => {
    component.titulo = 'Mis estudios';
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Mis estudios');
  });
});
