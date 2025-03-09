import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateFiltersComponent } from './candidate-filters.component';

describe('CandidateFiltersComponent', () => {
  let component: CandidateFiltersComponent;
  let fixture: ComponentFixture<CandidateFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateFiltersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CandidateFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
