import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitEndorsementComponent } from './submit-endorsement.component';

describe('SubmitEndorsementComponent', () => {
  let component: SubmitEndorsementComponent;
  let fixture: ComponentFixture<SubmitEndorsementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitEndorsementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitEndorsementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
