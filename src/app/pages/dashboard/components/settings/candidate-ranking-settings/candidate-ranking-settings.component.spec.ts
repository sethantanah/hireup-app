import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateRankingSettingsComponent } from './candidate-ranking-settings.component';

describe('CandidateRankingSettingsComponent', () => {
  let component: CandidateRankingSettingsComponent;
  let fixture: ComponentFixture<CandidateRankingSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateRankingSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CandidateRankingSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
