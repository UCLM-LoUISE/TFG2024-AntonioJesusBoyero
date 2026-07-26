import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreeNodeComponent } from './tree-node.component';
import { FiguraResumen } from 'src/app/interfaces/figura-resumen';

describe('TreeNodeComponent', () => {
  let component: TreeNodeComponent;
  let fixture: ComponentFixture<TreeNodeComponent>;

  const figuraConHijos: FiguraResumen = {
    id: '1',
    nombre: 'Root',
    tipo: 'Polígono',
    hijos: [
      {
        id: '2',
        nombre: 'Child 1',
        tipo: 'Círculo',
        hijos: [
          { id: '4', nombre: 'Grandchild', tipo: 'Círculo', hijos: [] },
        ],
      },
      { id: '3', nombre: 'Child 2', tipo: 'Polígono', hijos: [] },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TreeNodeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeNodeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.figura = figuraConHijos;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render one list item per child', () => {
    component.figura = figuraConHijos;
    fixture.detectChanges();

    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    // 2 hijos directos + 1 nieto (renderizado recursivamente)
    expect(items.length).toBe(3);
  });

  it('should render child and grandchild names recursively', () => {
    component.figura = figuraConHijos;
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Child 1');
    expect(text).toContain('Child 2');
    expect(text).toContain('Grandchild');
  });

  it('should not render a list when the figure has no children', () => {
    component.figura = { id: '9', nombre: 'Hoja', tipo: 'Círculo', hijos: [] };
    fixture.detectChanges();

    const ul = (fixture.nativeElement as HTMLElement).querySelector('ul');
    expect(ul).toBeNull();
  });
});
