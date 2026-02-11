import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobReferencesComponent } from './job-references.component';

describe('JobReferencesComponent', () => {
  let component: JobReferencesComponent;
  let fixture: ComponentFixture<JobReferencesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobReferencesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobReferencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
