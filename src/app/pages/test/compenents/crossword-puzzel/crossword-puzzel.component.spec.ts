import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrosswordPuzzleComponent } from './crossword-puzzle.component';

describe('CrosswordPuzzleComponent', () => {
  let component: CrosswordPuzzleComponent;
  let fixture: ComponentFixture<CrosswordPuzzleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrosswordPuzzleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrosswordPuzzleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
