import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobPostDashboadComponent } from './job-post-dashboad.component';

describe('JobPostDashboadComponent', () => {
  let component: JobPostDashboadComponent;
  let fixture: ComponentFixture<JobPostDashboadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobPostDashboadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobPostDashboadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
