import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableTitleComponent } from './table-title.component';

describe('TableTitleComponent', () => {
  let component: TableTitleComponent;
  let fixture: ComponentFixture<TableTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableTitleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
