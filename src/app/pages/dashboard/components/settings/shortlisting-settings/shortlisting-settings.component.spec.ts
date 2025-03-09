import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShortlistingSettingsComponent } from './shortlisting-settings.component';

describe('ShortlistingSettingsComponent', () => {
  let component: ShortlistingSettingsComponent;
  let fixture: ComponentFixture<ShortlistingSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShortlistingSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShortlistingSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
