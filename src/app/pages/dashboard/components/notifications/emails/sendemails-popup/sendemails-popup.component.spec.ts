import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendemailsPopupComponent } from './sendemails-popup.component';

describe('SendemailsPopupComponent', () => {
  let component: SendemailsPopupComponent;
  let fixture: ComponentFixture<SendemailsPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendemailsPopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendemailsPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
