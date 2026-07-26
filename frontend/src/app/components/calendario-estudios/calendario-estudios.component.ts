import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { EstudiosPage } from 'src/app/pages/estudios/estudios.page';

@Component({
  selector: 'app-calendario-estudios',
  templateUrl: './calendario-estudios.component.html',
  styleUrls: ['./calendario-estudios.component.css'],
})
export class CalendarioEstudiosComponent implements OnInit, OnChanges {
  @Input() estudios: any[] = []; // Estudios recibidos desde EstudiosPage

  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth();
  currentMonthName: string = ''; // Nombre del mes actual
  weekDays: string[] = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // Días de la semana
  weeks: { day: number | null; count: number }[][] = [];
  isTransitioning = false;
  // isSliding: 'prev' | 'next' | null = null;

  constructor() { }

  ngOnInit() {
    this.updateCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['estudios']) {
      this.updateCalendar(); // Actualiza el calendario con los nuevos datos
    }
  }

  updateCalendar() {
    this.isTransitioning = true; // Activa el efecto de desvanecimiento
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    this.currentMonthName = firstDay.toLocaleString('default', {
      month: 'long',
    });
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      count: this.getStudyCount(i + 1),
    }));
    const emptyDays = Array.from({ length: startDay }, () => ({
      day: null,
      count: 0,
    }));
    const allDays = [...emptyDays, ...days];
    this.weeks = [];
    while (allDays.length) {
      this.weeks.push(allDays.splice(0, 7)); // Ahora acepta los objetos con day y count
    }
    this.isTransitioning = false; // Activa el efecto de desvanecimiento
  }

  getStudyCount(day: number): number {
    const date = new Date(this.currentYear, this.currentMonth, day);
    const dateString = this.formatDateToMatchEstudio(date); // Usa un método de formato
    return this.estudios.filter(
      (estudio) => estudio.data?.NuevoEstudioFormData?.fechaInicio === dateString
    ).length;
  }

  private formatDateToMatchEstudio(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mes en dos dígitos
    const day = String(date.getDate()).padStart(2, '0'); // Día en dos dígitos
    return `${year}-${month}-${day}`; // Formato YYYY-MM-DD
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.updateCalendar();
    this.ocultarFiltroEstudios();

  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.updateCalendar();
    this.ocultarFiltroEstudios();

  }

  changeMonth(direction: 'prev' | 'next') {
    this.isTransitioning = true; // Activa el efecto de desvanecimiento
    setTimeout(() => {
      if (direction === 'prev') {
        this.prevMonth();
      } else {
        this.nextMonth();
      }
      this.isTransitioning = false; // Desactiva el efecto después del cambio
    }, 500); // Duración de la animación en milisegundos
  }

  // changeMonth(direction: 'prev' | 'next') {
  //   this.isSliding = direction;
  //   setTimeout(() => {
  //     if (direction === 'prev') {
  //       this.prevMonth();
  //     } else {
  //       this.nextMonth();
  //     }
  //     this.isSliding = null;
  //   }, 500);
  // }

  selectDay(day: number | null) {
    if (day) {
      const selectedDate = new Date(this.currentYear, this.currentMonth, day);
      EstudiosPage.Instance.diaSeleccionadoCalendario = selectedDate

      // Formatear la fecha en día/mes/año
      const dia = selectedDate.getDate().toString().padStart(2, '0'); // Día con dos dígitos
      const mes = (selectedDate.getMonth() + 1).toString().padStart(2, '0'); // Mes con dos dígitos
      const año = selectedDate.getFullYear(); // Año completo

      // Construir la fecha formateada
      EstudiosPage.Instance.diaSeleccionadoCalendarioFormateado = `${dia}/${mes}/${año}`;

      console.log('Día seleccionado:', selectedDate);

      const estudiosEnElDia = this.estudios.filter(
        (estudio) =>
          estudio.data?.NuevoEstudioFormData?.fechaInicio === this.formatDateToMatchEstudio(selectedDate)
      );

      if (estudiosEnElDia.length > 0) {
        // Si hay estudios en el día, muestra la tabla
        EstudiosPage.Instance.modoCalendario = false;
        if (EstudiosPage.Instance.opcionSeleccionada == 'estudios'){
          EstudiosPage.Instance.filtrarEstudiosPorDia(selectedDate);
        }else {
          EstudiosPage.Instance.filtrarEstudiosTareasPorDia(selectedDate);
        }
      } else if (EstudiosPage.Instance.rolUser === 'investigador') {
        // Si no hay estudios, abre el formulario con la fecha predefinida.
        // Solo el investigador puede crear estudios: para el trabajador,
        // pulsar un día sin estudios no hace nada.
        EstudiosPage.Instance.abrirNuevoEstudioConFecha(selectedDate);
      }
    }
  }

  onMonthYearChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedDate = new Date(input.value);

    // Actualiza solo el mes y el año
    this.currentYear = selectedDate.getFullYear();
    this.currentMonth = selectedDate.getMonth();
    this.updateCalendar();
  }

  ocultarFiltroEstudios() {
    EstudiosPage.Instance.ocultarFiltro();
  }

}
