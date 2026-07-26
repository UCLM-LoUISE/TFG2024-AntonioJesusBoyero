import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { CalendarioEstudiosComponent } from './calendario-estudios.component';
import { EstudiosPage } from 'src/app/pages/estudios/estudios.page';

describe('CalendarioEstudiosComponent', () => {
  let component: CalendarioEstudiosComponent;
  let fixture: ComponentFixture<CalendarioEstudiosComponent>;

  let mockEstudiosPage: any;
  let originalInstance: any;

  const estudioConFecha = (fechaInicio: string) => ({
    data: { NuevoEstudioFormData: { fechaInicio } },
  });

  beforeEach(async () => {
    originalInstance = EstudiosPage.Instance;

    mockEstudiosPage = {
      diaSeleccionadoCalendario: null,
      diaSeleccionadoCalendarioFormateado: '',
      modoCalendario: true,
      opcionSeleccionada: 'estudios',
      rolUser: 'investigador',
      filtrarEstudiosPorDia: jasmine.createSpy('filtrarEstudiosPorDia'),
      filtrarEstudiosTareasPorDia: jasmine.createSpy('filtrarEstudiosTareasPorDia'),
      abrirNuevoEstudioConFecha: jasmine.createSpy('abrirNuevoEstudioConFecha'),
      ocultarFiltro: jasmine.createSpy('ocultarFiltro'),
    };
    EstudiosPage.Instance = mockEstudiosPage;

    await TestBed.configureTestingModule({
      declarations: [CalendarioEstudiosComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarioEstudiosComponent);
    component = fixture.componentInstance;

    // Mes fijo para tests deterministas: enero de 2025 (empieza en miércoles)
    component.currentYear = 2025;
    component.currentMonth = 0;
  });

  afterEach(() => {
    EstudiosPage.Instance = originalInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('updateCalendar', () => {
    it('should build the weeks grid for January 2025', () => {
      component.updateCalendar();

      // Enero 2025: 31 días, el día 1 cae en miércoles -> 2 celdas vacías (L, M)
      expect(component.weeks.length).toBe(5);
      expect(component.weeks[0][0].day).toBeNull();
      expect(component.weeks[0][1].day).toBeNull();
      expect(component.weeks[0][2].day).toBe(1);

      const allDays = component.weeks
        .reduce((acc, w) => acc.concat(w), [] as { day: number | null; count: number }[])
        .filter((c) => c.day !== null);
      expect(allDays.length).toBe(31);
      expect(allDays[allDays.length - 1].day).toBe(31);
      expect(component.isTransitioning).toBeFalse();
    });

    it('should annotate each day with its study count', () => {
      component.estudios = [
        estudioConFecha('2025-01-15'),
        estudioConFecha('2025-01-15'),
        estudioConFecha('2025-01-20'),
      ];
      component.updateCalendar();

      const flat = component.weeks.reduce((acc, w) => acc.concat(w), [] as any[]);
      expect(flat.find((c) => c.day === 15).count).toBe(2);
      expect(flat.find((c) => c.day === 20).count).toBe(1);
      expect(flat.find((c) => c.day === 10).count).toBe(0);
    });
  });

  describe('getStudyCount', () => {
    it('should count studies whose fechaInicio matches the day', () => {
      component.estudios = [
        estudioConFecha('2025-01-05'),
        estudioConFecha('2025-01-05'),
        estudioConFecha('2025-02-05'), // otro mes: no cuenta
        { data: {} }, // sin formulario: no cuenta
      ];

      expect(component.getStudyCount(5)).toBe(2);
      expect(component.getStudyCount(6)).toBe(0);
    });
  });

  it('ngOnChanges should rebuild the calendar when estudios changes', () => {
    spyOn(component, 'updateCalendar');
    component.ngOnChanges({
      estudios: new SimpleChange([], [estudioConFecha('2025-01-01')], false),
    });
    expect(component.updateCalendar).toHaveBeenCalled();
  });

  describe('navegación de meses', () => {
    it('prevMonth should go to the previous month', () => {
      component.currentMonth = 5;
      component.prevMonth();
      expect(component.currentMonth).toBe(4);
      expect(component.currentYear).toBe(2025);
      expect(mockEstudiosPage.ocultarFiltro).toHaveBeenCalled();
    });

    it('prevMonth should wrap to December of the previous year', () => {
      component.currentMonth = 0;
      component.prevMonth();
      expect(component.currentMonth).toBe(11);
      expect(component.currentYear).toBe(2024);
    });

    it('nextMonth should go to the next month', () => {
      component.currentMonth = 5;
      component.nextMonth();
      expect(component.currentMonth).toBe(6);
      expect(component.currentYear).toBe(2025);
      expect(mockEstudiosPage.ocultarFiltro).toHaveBeenCalled();
    });

    it('nextMonth should wrap to January of the next year', () => {
      component.currentMonth = 11;
      component.nextMonth();
      expect(component.currentMonth).toBe(0);
      expect(component.currentYear).toBe(2026);
    });

    it('changeMonth should apply the change after the animation delay', () => {
      jasmine.clock().install();
      try {
        component.currentMonth = 5;

        component.changeMonth('next');
        expect(component.isTransitioning).toBeTrue();
        jasmine.clock().tick(500);
        expect(component.currentMonth).toBe(6);
        expect(component.isTransitioning).toBeFalse();

        component.changeMonth('prev');
        jasmine.clock().tick(500);
        expect(component.currentMonth).toBe(5);
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });

  describe('selectDay', () => {
    it('should do nothing when day is null', () => {
      component.selectDay(null);
      expect(mockEstudiosPage.filtrarEstudiosPorDia).not.toHaveBeenCalled();
      expect(mockEstudiosPage.abrirNuevoEstudioConFecha).not.toHaveBeenCalled();
      expect(mockEstudiosPage.diaSeleccionadoCalendario).toBeNull();
    });

    it('should filter estudios when the day has studies and opcion is estudios', () => {
      component.estudios = [estudioConFecha('2025-01-15')];
      mockEstudiosPage.opcionSeleccionada = 'estudios';

      component.selectDay(15);

      expect(mockEstudiosPage.modoCalendario).toBeFalse();
      expect(mockEstudiosPage.diaSeleccionadoCalendario).toEqual(new Date(2025, 0, 15));
      expect(mockEstudiosPage.diaSeleccionadoCalendarioFormateado).toBe('15/01/2025');
      expect(mockEstudiosPage.filtrarEstudiosPorDia).toHaveBeenCalledWith(new Date(2025, 0, 15));
      expect(mockEstudiosPage.filtrarEstudiosTareasPorDia).not.toHaveBeenCalled();
    });

    it('should filter tareas when the day has studies and opcion is not estudios', () => {
      component.estudios = [estudioConFecha('2025-01-15')];
      mockEstudiosPage.opcionSeleccionada = 'tareas';

      component.selectDay(15);

      expect(mockEstudiosPage.filtrarEstudiosTareasPorDia).toHaveBeenCalledWith(
        new Date(2025, 0, 15)
      );
      expect(mockEstudiosPage.filtrarEstudiosPorDia).not.toHaveBeenCalled();
    });

    it('should open the new-study form for an investigador on an empty day', () => {
      component.estudios = [estudioConFecha('2025-01-15')];
      mockEstudiosPage.rolUser = 'investigador';

      component.selectDay(10);

      expect(mockEstudiosPage.abrirNuevoEstudioConFecha).toHaveBeenCalledWith(
        new Date(2025, 0, 10)
      );
      expect(mockEstudiosPage.filtrarEstudiosPorDia).not.toHaveBeenCalled();
    });

    it('should do nothing for a trabajador on an empty day', () => {
      component.estudios = [];
      mockEstudiosPage.rolUser = 'trabajador';

      component.selectDay(10);

      expect(mockEstudiosPage.abrirNuevoEstudioConFecha).not.toHaveBeenCalled();
      expect(mockEstudiosPage.filtrarEstudiosPorDia).not.toHaveBeenCalled();
      expect(mockEstudiosPage.filtrarEstudiosTareasPorDia).not.toHaveBeenCalled();
    });
  });

  it('onMonthYearChange should update month and year from the input value', () => {
    spyOn(component, 'updateCalendar');
    const event = { target: { value: '2024-05-15' } } as unknown as Event;

    component.onMonthYearChange(event);

    expect(component.currentYear).toBe(2024);
    expect(component.currentMonth).toBe(4);
    expect(component.updateCalendar).toHaveBeenCalled();
  });

  it('ocultarFiltroEstudios should delegate to EstudiosPage', () => {
    component.ocultarFiltroEstudios();
    expect(mockEstudiosPage.ocultarFiltro).toHaveBeenCalled();
  });
});
