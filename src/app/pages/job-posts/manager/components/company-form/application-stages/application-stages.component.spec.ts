import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationStagesComponent } from './application-stages.component';

describe('ApplicationStagesComponent', () => {
  let component: ApplicationStagesComponent;
  let fixture: ComponentFixture<ApplicationStagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationStagesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationStagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
