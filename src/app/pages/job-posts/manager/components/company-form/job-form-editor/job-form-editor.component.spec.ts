import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobFormEditorComponent } from './job-form-editor.component';

describe('JobFormEditorComponent', () => {
  let component: JobFormEditorComponent;
  let fixture: ComponentFixture<JobFormEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobFormEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobFormEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
