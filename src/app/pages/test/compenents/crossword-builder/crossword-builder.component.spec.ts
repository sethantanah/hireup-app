import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrosswordBuilderComponent } from './crossword-builder.component';

describe('CrosswordBuilderComponent', () => {
  let component: CrosswordBuilderComponent;
  let fixture: ComponentFixture<CrosswordBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrosswordBuilderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrosswordBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
