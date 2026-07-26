import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { TableMainComponent } from './table-main.component';
import { TableType } from 'src/app/enums/tipos-tablas';
import { EstudiosPage } from 'src/app/pages/estudios/estudios.page';
import { GestionTareasPage } from 'src/app/pages/gestion-tareas/gestion-tareas.page';

describe('TableMainComponent', () => {
  let component: TableMainComponent;
  let fixture: ComponentFixture<TableMainComponent>;

  let mockEstudiosPage: any;
  let mockGestionTareasPage: any;
  let originalEstudiosInstance: any;
  let originalGestionInstance: any;

  const makeRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `id-${i + 1}`, nombre: `Fila ${i + 1}` }));

  beforeEach(async () => {
    originalEstudiosInstance = EstudiosPage.Instance;
    originalGestionInstance = GestionTareasPage.Instance;

    mockEstudiosPage = jasmine.createSpyObj('EstudiosPage', [
      'verEstudio',
      'editarEstudio',
      'showModal',
      'showModalConfiguracionEstudio',
      'onDownloadData',
      'esUsuarioCreador',
      'puedoDescargarDatosEstudio',
    ]);
    mockEstudiosPage.esUsuarioCreador.and.returnValue(true);
    mockEstudiosPage.puedoDescargarDatosEstudio.and.returnValue(false);

    mockGestionTareasPage = jasmine.createSpyObj('GestionTareasPage', [
      'verTarea',
      'editarTarea',
      'showModalEliminarTareas',
    ]);

    EstudiosPage.Instance = mockEstudiosPage;
    GestionTareasPage.Instance = mockGestionTareasPage;

    await TestBed.configureTestingModule({
      declarations: [TableMainComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TableMainComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    EstudiosPage.Instance = originalEstudiosInstance;
    GestionTareasPage.Instance = originalGestionInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('paginación', () => {
    beforeEach(() => {
      component.tableData = makeRows(7);
      component.rowsPerPage = 3;
    });

    it('calculateTotalPages should round up', () => {
      expect(component.calculateTotalPages()).toBe(3);
      component.tableData = makeRows(6);
      expect(component.calculateTotalPages()).toBe(2);
      component.tableData = [];
      expect(component.calculateTotalPages()).toBe(0);
    });

    it('ngOnInit should show the first page', () => {
      component.ngOnInit();
      expect(component.totalPages).toBe(3);
      expect(component.currentPage).toBe(1);
      expect(component.displayedData.map((r) => r.id)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('nextPage should advance and update displayed rows', () => {
      component.ngOnInit();
      component.nextPage();
      expect(component.currentPage).toBe(2);
      expect(component.displayedData.map((r) => r.id)).toEqual(['id-4', 'id-5', 'id-6']);

      component.nextPage();
      expect(component.currentPage).toBe(3);
      expect(component.displayedData.map((r) => r.id)).toEqual(['id-7']);
    });

    it('nextPage should not go beyond the last page', () => {
      component.ngOnInit();
      component.nextPage();
      component.nextPage();
      component.nextPage(); // ya en la última
      expect(component.currentPage).toBe(3);
    });

    it('prevPage should go back and stop at the first page', () => {
      component.ngOnInit();
      component.nextPage();
      component.prevPage();
      expect(component.currentPage).toBe(1);
      component.prevPage(); // ya en la primera
      expect(component.currentPage).toBe(1);
      expect(component.displayedData.map((r) => r.id)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('updateDisplayedData should clamp currentPage when data shrinks', () => {
      component.ngOnInit();
      component.nextPage();
      component.nextPage(); // página 3

      component.tableData = makeRows(4); // ahora solo hay 2 páginas
      component.updateDisplayedData();

      expect(component.currentPage).toBe(2);
      expect(component.displayedData.map((r) => r.id)).toEqual(['id-4']);
    });

    it('updateDisplayedData should reset to page 1 when there is no data', () => {
      component.ngOnInit();
      component.nextPage();

      component.tableData = [];
      component.updateDisplayedData();

      expect(component.currentPage).toBe(1);
      expect(component.totalPages).toBe(0);
      expect(component.displayedData).toEqual([]);
    });

    it('ngOnChanges should recalculate pages when tableData changes', () => {
      component.ngOnInit();

      const newData = makeRows(10);
      component.tableData = newData;
      component.ngOnChanges({
        tableData: new SimpleChange(makeRows(7), newData, false),
      });

      expect(component.totalPages).toBe(4);
      expect(component.displayedData.length).toBe(3);
      // Se crea una nueva referencia del array
      expect(component.tableData).not.toBe(newData);
      expect(component.tableData).toEqual(newData);
    });

    it('ngOnChanges should ignore changes that do not affect tableData', () => {
      component.ngOnInit();
      const before = component.displayedData;

      component.ngOnChanges({
        rowsPerPage: new SimpleChange(3, 5, false),
      });

      expect(component.displayedData).toBe(before);
    });
  });

  describe('eventos según tableType', () => {
    it('onView should delegate to GestionTareasPage for tareas', () => {
      component.tableType = TableType.Tareas;
      component.onView('t1');
      expect(mockGestionTareasPage.verTarea).toHaveBeenCalledWith('t1');
      expect(mockEstudiosPage.verEstudio).not.toHaveBeenCalled();
    });

    it('onView should delegate to EstudiosPage for estudios', () => {
      component.tableType = TableType.Estudios;
      component.onView('e1');
      expect(mockEstudiosPage.verEstudio).toHaveBeenCalledWith('e1');
      expect(mockGestionTareasPage.verTarea).not.toHaveBeenCalled();
    });

    it('onEdit should delegate to GestionTareasPage for tareas', () => {
      component.tableType = TableType.Tareas;
      component.onEdit('t1');
      expect(mockGestionTareasPage.editarTarea).toHaveBeenCalledWith('t1');
      expect(mockEstudiosPage.editarEstudio).not.toHaveBeenCalled();
    });

    it('onEdit should delegate to EstudiosPage for estudios', () => {
      component.tableType = TableType.Estudios;
      component.onEdit('e1');
      expect(mockEstudiosPage.editarEstudio).toHaveBeenCalledWith('e1');
    });

    it('onDelete should open the delete-tareas modal for tareas and refresh data', () => {
      spyOn(component, 'updateDisplayedData');
      component.tableType = TableType.Tareas;
      component.onDelete('t1');
      expect(mockGestionTareasPage.showModalEliminarTareas).toHaveBeenCalledWith('t1');
      expect(mockEstudiosPage.showModal).not.toHaveBeenCalled();
      expect(component.updateDisplayedData).toHaveBeenCalled();
    });

    it('onDelete should open the estudios modal otherwise', () => {
      component.tableType = TableType.Estudios;
      component.onDelete('e1');
      expect(mockEstudiosPage.showModal).toHaveBeenCalledWith('e1');
    });

    it('onSettings should open the study configuration modal', () => {
      component.onSettings('e1');
      expect(mockEstudiosPage.showModalConfiguracionEstudio).toHaveBeenCalledWith('e1');
    });

    it('onDownloadData should delegate to EstudiosPage', () => {
      component.onDownloadData('e1');
      expect(mockEstudiosPage.onDownloadData).toHaveBeenCalledWith('e1');
    });
  });

  describe('delegación de permisos', () => {
    it('esUsuarioCreador should delegate to EstudiosPage.Instance', () => {
      expect(component.esUsuarioCreador('e1')).toBeTrue();
      expect(mockEstudiosPage.esUsuarioCreador).toHaveBeenCalledWith('e1');
    });

    it('puedoDescargarDatosEstudioTabla should delegate to EstudiosPage.Instance', () => {
      expect(component.puedoDescargarDatosEstudioTabla('e1')).toBeFalse();
      expect(mockEstudiosPage.puedoDescargarDatosEstudio).toHaveBeenCalledWith('e1');
    });
  });
});
