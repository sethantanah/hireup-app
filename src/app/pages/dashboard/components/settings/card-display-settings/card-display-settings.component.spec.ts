import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardDisplaySettingsComponent } from './card-display-settings.component';

describe('CardDisplaySettingsComponent', () => {
  let component: CardDisplaySettingsComponent;
  let fixture: ComponentFixture<CardDisplaySettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardDisplaySettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardDisplaySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
