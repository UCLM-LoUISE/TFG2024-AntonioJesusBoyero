import { FormBuilder } from '@angular/forms';
import { AdminGruposComponent } from './admin-grupos.component';

describe('AdminGruposComponent', () => {
  let comp: AdminGruposComponent;
  let mockBack: any;

  beforeEach(() => {
    mockBack = jasmine.createSpyObj('BackService', ['crearGrupo', 'borrarGrupo', 'listarGrupos']);
    mockBack.listarGrupos.and.returnValue(Promise.resolve([{ id: '1', nombre: 'G1', memberCount: 2 }]));
    comp = new AdminGruposComponent(new FormBuilder() as any, mockBack);
  });

  it('se crea con el formulario inicializado', () => {
    expect(comp).toBeTruthy();
    expect(comp.formGrupo.valid).toBeFalse();
  });

  it('ngOnInit carga los grupos', async () => {
    await comp.ngOnInit();
    expect(mockBack.listarGrupos).toHaveBeenCalled();
    expect(comp.grupos.length).toBe(1);
    expect(comp.loading).toBeFalse();
  });

  it('cargarGrupos gestiona errores dejando la lista vacía', async () => {
    mockBack.listarGrupos.and.returnValue(Promise.reject(new Error('fallo')));
    await comp.cargarGrupos();
    expect(comp.grupos).toEqual([]);
    expect(comp.loading).toBeFalse();
  });

  describe('crearGrupo', () => {
    it('marca el formulario si es inválido', async () => {
      await comp.crearGrupo();
      expect(comp.formGrupo.touched).toBeTrue();
      expect(mockBack.crearGrupo).not.toHaveBeenCalled();
    });

    it('crea el grupo y recarga la lista', async () => {
      mockBack.crearGrupo.and.returnValue(Promise.resolve({ ok: true, id: '2', nombre: 'Nuevo', memberCount: 0 }));
      comp.formGrupo.patchValue({ nombre: 'Nuevo' });
      await comp.crearGrupo();
      expect(mockBack.crearGrupo).toHaveBeenCalledWith({ nombre: 'Nuevo' });
      expect(mockBack.listarGrupos).toHaveBeenCalled();
      expect(comp.creatingGroup).toBeFalse();
      expect(comp.formGrupo.enabled).toBeTrue();
    });

    it('avisa si el backend responde ko', async () => {
      const alertSpy = spyOn(window, 'alert');
      mockBack.crearGrupo.and.returnValue(Promise.resolve({ ok: false }));
      comp.formGrupo.patchValue({ nombre: 'Nuevo' });
      await comp.crearGrupo();
      expect(alertSpy).toHaveBeenCalledWith('No se pudo crear el grupo.');
      expect(comp.creatingGroup).toBeFalse();
    });
  });

  describe('borrarGrupo', () => {
    const grupo = (extra: any = {}) => ({ id: '1', nombre: 'G1', memberCount: 2, loadingAccion: null, ...extra });

    it('no hace nada si el usuario cancela', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      await comp.borrarGrupo(grupo());
      expect(mockBack.borrarGrupo).not.toHaveBeenCalled();
    });

    it('no repite la acción si ya está en curso', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      await comp.borrarGrupo(grupo({ loadingAccion: 'borrar' }));
      expect(mockBack.borrarGrupo).not.toHaveBeenCalled();
    });

    it('borra el grupo y recarga la lista', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      mockBack.borrarGrupo.and.returnValue(Promise.resolve({ ok: true, id: '1', nombre: 'G1' }));
      const g = grupo();
      await comp.borrarGrupo(g);
      expect(mockBack.borrarGrupo).toHaveBeenCalledWith({ nombre: 'G1' });
      expect(mockBack.listarGrupos).toHaveBeenCalled();
      expect(g.loadingAccion).toBeNull();
    });

    it('avisa si el borrado falla', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      const alertSpy = spyOn(window, 'alert');
      mockBack.borrarGrupo.and.returnValue(Promise.reject(new Error('fallo')));
      const g = grupo();
      await comp.borrarGrupo(g);
      expect(alertSpy).toHaveBeenCalledWith('No se pudo borrar el grupo.');
      expect(g.loadingAccion).toBeNull();
    });
  });
});
