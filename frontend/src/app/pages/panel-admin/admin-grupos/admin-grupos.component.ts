import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { BackService } from 'src/app/services/back.service';
import { Grupo } from 'src/app/interfaces/grupos.model';

@Component({
  selector: 'app-admin-grupos',
  templateUrl: './admin-grupos.component.html',
  styleUrls: ['./admin-grupos.component.css']
})
export class AdminGruposComponent implements OnInit {
  creatingGroup = false;
  grupos: Grupo[] = [];
  loading = false;
  formGrupo = this.fb.group({
    nombre: ['', Validators.required]
  });
  constructor(
    private fb: FormBuilder,
    private back: BackService
  ) { }
  ngOnInit() {
    this.cargarGrupos();
  }
  async crearGrupo() {
    if (this.formGrupo.invalid) {
      this.formGrupo.markAllAsTouched();
      return;
    }
    this.creatingGroup = true;
    this.formGrupo.disable();
    try {
      const payload = this.formGrupo.getRawValue();
      const resp = await this.back.crearGrupo({ nombre: payload.nombre ?? '' });
      if (!resp?.ok) throw new Error('backend_error');
      await this.cargarGrupos();
      this.formGrupo.reset();
    } catch (e) {
      console.error(e);
      alert('No se pudo crear el grupo.');
    } finally {
      this.formGrupo.enable();
      this.creatingGroup = false;
    }
  }
  async borrarGrupo(g: { id: string; nombre: string; memberCount: number, loadingAccion?: string | null }) {
    if (!confirm(`¿Seguro que quieres borrar el grupo "${g.nombre}"?`)) return;
    if (g.loadingAccion) return;
    g.loadingAccion = 'borrar';
    try {
      await this.back.borrarGrupo({ nombre: g.nombre });
      await this.cargarGrupos();
    } catch (e) {
      console.error(e);
      alert('No se pudo borrar el grupo.');
    } finally {
      g.loadingAccion = null;
    }
  }
  async cargarGrupos() {
    this.loading = true;
    try {
      const lista = await this.back.listarGrupos();
      this.grupos = lista.map(g => ({ ...g, loadingAccion: undefined }));
    } catch (e) {
      console.error(e);
      this.grupos = [];
    } finally {
      this.loading = false;
    }
  }
}
