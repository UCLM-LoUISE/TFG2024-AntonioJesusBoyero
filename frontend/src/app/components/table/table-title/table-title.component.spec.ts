import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { TableTitleComponent } from './table-title.component';

describe('TableTitleComponent', () => {
  let component: TableTitleComponent;
  let fixture: ComponentFixture<TableTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [TableTitleComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TableTitleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.title).toBe('Título por defecto');
    expect(component.buttonLabel).toBe('Nuevo');
    expect(component.routerLink).toBe('/');
  });

  it('should accept custom inputs', () => {
    component.title = 'Estudios';
    component.buttonLabel = 'Nuevo estudio';
    component.routerLink = '/nuevo-estudio';
    fixture.detectChanges();

    expect(component.title).toBe('Estudios');
    expect(component.buttonLabel).toBe('Nuevo estudio');
    expect(component.routerLink).toBe('/nuevo-estudio');
  });

  it('should render title and button label', () => {
    component.title = 'Estudios';
    component.buttonLabel = 'Nuevo estudio';
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Estudios');
    expect(text).toContain('Nuevo estudio');
  });
});
