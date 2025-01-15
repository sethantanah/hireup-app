import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvanceFilterComponent } from './advance-filter.component';

describe('AdvanceFilterComponent', () => {
  let component: AdvanceFilterComponent;
  let fixture: ComponentFixture<AdvanceFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvanceFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdvanceFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
