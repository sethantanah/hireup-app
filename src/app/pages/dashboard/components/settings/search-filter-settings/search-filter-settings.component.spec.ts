import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchFilterSettingsComponent } from './search-filter-settings.component';

describe('SearchFilterSettingsComponent', () => {
  let component: SearchFilterSettingsComponent;
  let fixture: ComponentFixture<SearchFilterSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFilterSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchFilterSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
