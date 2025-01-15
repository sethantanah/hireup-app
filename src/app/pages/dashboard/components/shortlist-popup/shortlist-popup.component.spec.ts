import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShortlistPopupComponent } from './shortlist-popup.component';

describe('ShortlistPopupComponent', () => {
  let component: ShortlistPopupComponent;
  let fixture: ComponentFixture<ShortlistPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShortlistPopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShortlistPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
