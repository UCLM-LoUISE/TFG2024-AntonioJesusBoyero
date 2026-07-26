import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConfiguracionEstudioModalComponent } from './configuracion-estudio-modal.component';
import { EstudiosPage } from 'src/app/pages/estudios/estudios.page';
import { UserData } from 'src/app/data/user-data';

describe('ConfiguracionEstudioModalComponent', () => {
  let component: ConfiguracionEstudioModalComponent;
  let mockBack: any;
  let mockEstudiosPage: any;
  let originalInstance: any;
  let estudio: any;

  const usuariosBack = [
    { nombre: 'Ana', apellidos: 'García', email: 'ana@x.com' },
    { nombre: 'Luis', apellidos: 'Pérez', email: 'luis@x.com' },
    { nombre: 'Marta', apellidos: 'Ruiz', email: 'marta@x.com' }
  ];

  beforeEach(() => {
    originalInstance = EstudiosPage.Instance;
    estudio = { id: 'e1', email: ['ana@x.com', 'luis@x.com'] };
    mockEstudiosPage = {
      idConfiguracionEstudioModal: 'e1',
      estudios: [estudio],
      closeModalConfiguracionEstudio: jasmine.createSpy('closeModalConfiguracionEstudio')
    };
    EstudiosPage.Instance = mockEstudiosPage;
    UserData.setUserEmail('ana@x.com');

    mockBack = {
      obtenerInvestigadoresMismoGrupo: jasmine.createSpy('obtenerInvestigadoresMismoGrupo')
        .and.returnValue(Promise.resolve(usuariosBack)),
      actualizarPermisosEstudio: jasmine.createSpy('actualizarPermisosEstudio')
        .and.returnValue(Promise.resolve(of({ email: ['ana@x.com', 'luis@x.com', 'marta@x.com'] })))
    };

    component = new ConfiguracionEstudioModalComponent(mockBack);
  });

  afterEach(() => {
    EstudiosPage.Instance = originalInstance;
  });

  it('ngOnInit should load the study, mark the creator and split workers', fakeAsync(() => {
    component.ngOnInit();
    flushMicrotasks();

    expect(component.idEstudio).toBe('e1');
    expect(component.usuarioCreador.email).toBe('ana@x.com');
    expect(component.usuarioCreador.nombreCompleto).toBe('Ana García');
    expect(component.emailsEstudio).toEqual(['ana@x.com', 'luis@x.com']);
    // Creator + already-permitted users are selected
    expect(component.trabajadoresSeleccionados.map(t => t.email)).toEqual(['ana@x.com', 'luis@x.com']);
    // Remaining users are available
    expect(component.trabajadores.map(t => t.email)).toEqual(['marta@x.com']);
  }));

  it('ngOnInit should still query users when the study is not found', fakeAsync(() => {
    mockEstudiosPage.idConfiguracionEstudioModal = 'no-existe';
    component.ngOnInit();
    flushMicrotasks();

    expect(component.usuarioCreador.email).toBe('');
    expect(mockBack.obtenerInvestigadoresMismoGrupo).toHaveBeenCalledWith('');
  }));

  it('obtenerUsuarios should log an error when the backend rejects', fakeAsync(() => {
    const errorSpy = spyOn(console, 'error');
    mockBack.obtenerInvestigadoresMismoGrupo.and.returnValue(Promise.reject('boom'));
    component.obtenerUsuarios([]);
    flushMicrotasks();
    expect(errorSpy).toHaveBeenCalled();
  }));

  it('obtenerUsuarios should fall back to the email when the creator is not in the group', fakeAsync(() => {
    component.usuarioCreador.email = 'externo@x.com';
    component.obtenerUsuarios(['externo@x.com']);
    flushMicrotasks();
    expect(component.usuarioCreador.nombreCompleto).toBe('externo@x.com');
  }));

  it('addTrabajador should move a worker to selected and clear the filter', () => {
    component.trabajadores = [{ nombreCompleto: 'Marta Ruiz', email: 'marta@x.com' }];
    component.filtro = 'mar';
    component.addTrabajador({ nombreCompleto: 'Marta Ruiz', email: 'marta@x.com' });
    expect(component.trabajadoresSeleccionados.some(t => t.email === 'marta@x.com')).toBeTrue();
    expect(component.trabajadores.length).toBe(0);
    expect(component.filtro).toBe('');

    // Adding the same worker twice does nothing
    component.addTrabajador({ nombreCompleto: 'Marta Ruiz', email: 'marta@x.com' });
    expect(component.trabajadoresSeleccionados.filter(t => t.email === 'marta@x.com').length).toBe(1);
  });

  it('removeTrabajador should return the worker to the available list', () => {
    component.usuarioCreador = { nombreCompleto: 'Ana García', email: 'ana@x.com' };
    component.trabajadoresSeleccionados = [
      { nombreCompleto: 'Ana García', email: 'ana@x.com' },
      { nombreCompleto: 'Luis Pérez', email: 'luis@x.com' }
    ];
    component.removeTrabajador('luis@x.com');
    expect(component.trabajadoresSeleccionados.map(t => t.email)).toEqual(['ana@x.com']);
    expect(component.trabajadores.some(t => t.email === 'luis@x.com')).toBeTrue();
  });

  it('removeTrabajador should never remove the creator', () => {
    component.usuarioCreador = { nombreCompleto: 'Ana García', email: 'ana@x.com' };
    component.trabajadoresSeleccionados = [{ nombreCompleto: 'Ana García', email: 'ana@x.com' }];
    component.removeTrabajador('ana@x.com');
    expect(component.trabajadoresSeleccionados.length).toBe(1);
  });

  it('trabajadoresFiltrados should filter by name or email, empty filter returns []', () => {
    component.trabajadores = [
      { nombreCompleto: 'Marta Ruiz', email: 'marta@x.com' },
      { nombreCompleto: 'Luis Pérez', email: 'luis@x.com' }
    ];
    component.filtro = '';
    expect(component.trabajadoresFiltrados).toEqual([]);

    component.filtro = 'MARTA';
    expect(component.trabajadoresFiltrados.map((t: any) => t.email)).toEqual(['marta@x.com']);

    component.filtro = 'luis@x';
    expect(component.trabajadoresFiltrados.map((t: any) => t.email)).toEqual(['luis@x.com']);
  });

  it('addTrabajadores should just close the modal when there are no changes', fakeAsync(() => {
    component.ngOnInit();
    flushMicrotasks();

    component.addTrabajadores();
    flushMicrotasks();

    expect(mockBack.actualizarPermisosEstudio).not.toHaveBeenCalled();
    expect(mockEstudiosPage.closeModalConfiguracionEstudio).toHaveBeenCalledTimes(1);
  }));

  it('addTrabajadores should send the update and refresh the local study on changes', fakeAsync(() => {
    component.ngOnInit();
    flushMicrotasks();

    component.addTrabajador({ nombreCompleto: 'Marta Ruiz', email: 'marta@x.com' });
    component.addTrabajadores();
    flushMicrotasks();

    expect(component.cargandoGuardado).toBeTrue();
    expect(mockBack.actualizarPermisosEstudio).toHaveBeenCalledWith({
      idEstudio: 'e1',
      emailUser: 'ana@x.com',
      emails: jasmine.arrayContaining(['ana@x.com', 'luis@x.com', 'marta@x.com'])
    });
    expect(estudio.email).toEqual(['ana@x.com', 'luis@x.com', 'marta@x.com']);

    tick(1000);
    expect(component.cargandoGuardado).toBeFalse();
    expect(mockEstudiosPage.closeModalConfiguracionEstudio).toHaveBeenCalledTimes(1);
  }));

  it('addTrabajadores should log the error when the update fails', fakeAsync(() => {
    const errorSpy = spyOn(console, 'error');
    mockBack.actualizarPermisosEstudio.and.returnValue(
      Promise.resolve(throwError(() => new Error('fallo backend')))
    );
    component.ngOnInit();
    flushMicrotasks();

    component.addTrabajador({ nombreCompleto: 'Marta Ruiz', email: 'marta@x.com' });
    component.addTrabajadores();
    flushMicrotasks();

    expect(errorSpy).toHaveBeenCalled();
    expect(mockEstudiosPage.closeModalConfiguracionEstudio).not.toHaveBeenCalled();
  }));

  it('ngOnDestroy should clear the filter', () => {
    component.filtro = 'algo';
    component.ngOnDestroy();
    expect(component.filtro).toBe('');
  });
});
