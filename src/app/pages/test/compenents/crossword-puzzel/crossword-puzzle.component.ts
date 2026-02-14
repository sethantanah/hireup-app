import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Field } from '../../../../models/test.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

export interface CrosswordCell {
  value: string;
  isBlack: boolean;
  row: number;
  col: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
}

export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  direction: 'across' | 'down' | 'diagonal';
  row: number;
  col: number;
  length: number;
  solved: boolean;
}

export interface CrosswordPuzzle {
  id: string;
  title: string;
  description: string;
  grid: CrosswordCell[][];
  clues: CrosswordClue[];
  size: number;
  totalScore: number;
  userScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrosswordField extends Field {
  puzzleData?: CrosswordPuzzle;
}

@Component({
  selector: 'app-crossword-puzzle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './crossword-puzzel.component.html',
  styleUrls: ['./crossword-puzzel.component.scss'],
})
export class CrosswordPuzzleComponent implements OnInit, OnDestroy {
  @Input() puzzle!: CrosswordPuzzle;
  @Input() activeMode: boolean = false;
  @Input() autoSubmitTrigger?: Observable<void>;
  @Output() puzzleSubmitted = new EventEmitter<{ score: number, total: number, percentage: number }>();

  // LOCAL COPIES to prevent external modifications
  localGrid: CrosswordCell[][] = [];
  localClues: CrosswordClue[] = [];
  size = 0;
  userScore = 0;

  currentSelection: { row: number; col: number }[] = [];
  isSelecting = false;
  startCell: { row: number; col: number } | null = null;
  hasSubmitted = false;

  // Track permanently highlighted cells (for correct/incorrect)
  permanentHighlights: Set<string> = new Set();

  // Timer for auto-submit
  private autoSubmitTimer: any = null;
  private readonly AUTO_SUBMIT_DELAY = 500; // 500ms delay for auto-submit
  private triggerSubscription?: Subscription;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.initializeLocalData();
    if (this.autoSubmitTrigger) {
      this.triggerSubscription = this.autoSubmitTrigger.subscribe(() => {
        console.log('Crossword auto-submit trigger received');
        this.submitPuzzle();
      });
    }
  }

  ngOnDestroy() {
    if (this.triggerSubscription) {
      this.triggerSubscription.unsubscribe();
    }
    if (this.autoSubmitTimer) {
      clearTimeout(this.autoSubmitTimer);
    }
  }

  initializeLocalData() {
    if (!this.puzzle || !this.puzzle.grid) {
      console.error('Puzzle data is missing or invalid');
      return;
    }

    // Create DEEP COPIES to prevent any external modifications
    this.localGrid = JSON.parse(JSON.stringify(this.puzzle.grid));
    this.localClues = JSON.parse(JSON.stringify(this.puzzle.clues));
    this.size = this.puzzle.size;
    this.userScore = this.puzzle.userScore || 0;
    this.hasSubmitted = false;
    this.currentSelection = [];
    this.isSelecting = false;
    this.startCell = null;
    this.permanentHighlights.clear();

    // Initialize all cells
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = this.localGrid[i][j];
        cell.isSelected = false;
        cell.isIncorrect = false;
        cell.isHighlighted = false;

        // Reset correct status for active mode
        if (this.activeMode) {
          cell.isCorrect = false;
        }
      }
    }

    // Reset clues
    this.localClues.forEach(clue => {
      clue.solved = false;
    });

    this.cdr.markForCheck();
  }

  get totalClues(): number {
    return this.localClues.length;
  }

  getCorrectCount(): number {
    return this.localClues.filter(c => c.solved).length;
  }

  getMissedCount(): number {
    return this.totalClues - this.getCorrectCount();
  }

  getFoundClues(): CrosswordClue[] {
    return this.localClues.filter(c => c.solved);
  }

  getMissedClues(): CrosswordClue[] {
    return this.localClues.filter(c => !c.solved);
  }

  getCluesByDirection(direction: 'across' | 'down' | 'diagonal'): CrosswordClue[] {
    return this.localClues.filter(c => c.direction === direction);
  }

  getPercentage(): number {
    if (this.puzzle.totalScore === 0) return 0;
    return Math.round((this.userScore / this.puzzle.totalScore) * 100);
  }

  get isComplete(): boolean {
    return this.getCorrectCount() === this.totalClues;
  }

  getCellNumber(row: number, col: number): number | null {
    for (const clue of this.localClues) {
      if (clue.row === row && clue.col === col) {
        return clue.number;
      }
    }
    return null;
  }

  getCellClasses(cell: CrosswordCell): any {
    const key = `${cell.row},${cell.col}`;
    const isPermanentlyHighlighted = this.permanentHighlights.has(key);

    const classes: any = {
      'black': cell.isBlack,
      'selected': cell.isSelected,
      'highlighted': cell.isHighlighted || isPermanentlyHighlighted
    };

    // Only show correct/incorrect states if not in active mode
    if (!this.activeMode) {
      classes['correct'] = cell.isCorrect;
      classes['incorrect'] = cell.isIncorrect;
    }

    return classes;
  }

  // Get all selected cells (both current and previous)
  getAllSelectedCells(): { row: number; col: number }[] {
    const allSelected = [];
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.localGrid[i][j].isSelected) {
          allSelected.push({ row: i, col: j });
        }
      }
    }
    return allSelected;
  }

  onMouseDown(event: MouseEvent) {
    if (this.hasSubmitted) return;

    const cell = this.getCellFromEvent(event);
    if (cell && !this.localGrid[cell.row][cell.col].isBlack) {
      this.isSelecting = true;
      this.startCell = cell;

      // Clear temporary selections but keep permanent highlights
      this.clearTemporarySelections();

      // Clear current selection array
      this.currentSelection = [];

      // Mark this cell as selected (even if it's already correct)
      this.localGrid[cell.row][cell.col].isSelected = true;
      this.localGrid[cell.row][cell.col].isHighlighted = true;
      this.addToCurrentSelection(cell.row, cell.col);

      this.cdr.markForCheck();
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isSelecting || !this.startCell || this.hasSubmitted) return;

    const cell = this.getCellFromEvent(event);
    if (cell && !this.localGrid[cell.row][cell.col].isBlack) {
      // Clear current selection array but keep visual selections
      this.clearCurrentSelectionArray();

      // Select cells between start and current
      this.selectCellsBetween(this.startCell, cell);

      this.cdr.markForCheck();
    }

    event.preventDefault();
  }

  onMouseUp(event: MouseEvent) {
    if (!this.isSelecting || this.hasSubmitted) return;

    this.isSelecting = false;

    // Update current selection from grid
    this.updateCurrentSelectionFromGrid();

    // Auto-submit after selection is complete
    this.autoSubmitSelection();

    this.startCell = null;
    event.preventDefault();
  }

  onMouseLeave() {
    if (this.isSelecting) {
      this.isSelecting = false;
      this.updateCurrentSelectionFromGrid();
      this.autoSubmitSelection();
      this.startCell = null;
    }
  }

  private autoSubmitSelection() {
    if (this.currentSelection.length === 0) return;

    // Clear any existing timer
    if (this.autoSubmitTimer) {
      clearTimeout(this.autoSubmitTimer);
    }

    // Set new timer for auto-submit
    this.autoSubmitTimer = setTimeout(() => {
      this.submitSelection();
    }, this.AUTO_SUBMIT_DELAY);
  }

  private getCellFromEvent(event: MouseEvent): { row: number; col: number } | null {
    const element = event.target as HTMLElement;
    const cellElement = element.closest('.crossword-cell');
    if (!cellElement) return null;

    const rowAttr = cellElement.getAttribute('data-row');
    const colAttr = cellElement.getAttribute('data-col');

    if (rowAttr && colAttr) {
      const row = parseInt(rowAttr);
      const col = parseInt(colAttr);

      if (!isNaN(row) && !isNaN(col) && row >= 0 && col >= 0) {
        return { row, col };
      }
    }

    return null;
  }

  private selectCell(row: number, col: number, selected: boolean) {
    if (this.isValidCell(row, col) && !this.localGrid[row][col].isBlack) {
      // Don't change selection state for permanently highlighted cells
      const key = `${row},${col}`;
      if (!this.permanentHighlights.has(key)) {
        this.localGrid[row][col].isSelected = selected;
        this.localGrid[row][col].isHighlighted = selected;
      }
      // Clear incorrect state when selecting (only for non-permanent cells)
      if (!this.permanentHighlights.has(key)) {
        this.localGrid[row][col].isIncorrect = false;
      }
    }
  }

  private addToCurrentSelection(row: number, col: number) {
    const key = `${row},${col}`;
    if (!this.currentSelection.some(cell => `${cell.row},${cell.col}` === key)) {
      this.currentSelection.push({ row, col });
    }
  }

  private clearCurrentSelectionArray() {
    this.currentSelection = [];
  }

  private updateCurrentSelectionFromGrid() {
    this.currentSelection = [];
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.localGrid[i][j].isSelected) {
          this.currentSelection.push({ row: i, col: j });
        }
      }
    }
    // Sort for consistent ordering
    this.currentSelection.sort((a, b) => {
      if (a.row === b.row) return a.col - b.col;
      return a.row - b.row;
    });
  }

  getSelectedWord(): string {
    return this.currentSelection
      .map(cell => this.localGrid[cell.row][cell.col].value)
      .join('');
  }

  private doesSelectionMatchClue(clue: CrosswordClue): boolean {
    // Generate the expected cells for this clue
    const expectedCells = [];
    let currentRow = clue.row;
    let currentCol = clue.col;

    for (let i = 0; i < clue.length; i++) {
      expectedCells.push({ row: currentRow, col: currentCol });

      if (clue.direction === 'across') {
        currentCol++;
      } else if (clue.direction === 'down') {
        currentRow++;
      } else if (clue.direction === 'diagonal') {
        currentRow++;
        currentCol++;
      }
    }

    // Check if selection has same length
    if (expectedCells.length !== this.currentSelection.length) {
      return false;
    }

    // Check each expected cell is in selection
    for (const expected of expectedCells) {
      const found = this.currentSelection.some(
        selected => selected.row === expected.row && selected.col === expected.col
      );
      if (!found) {
        return false;
      }
    }

    return true;
  }

  private selectCellsBetween(start: { row: number; col: number }, end: { row: number; col: number }) {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const isHorizontal = maxRow === minRow;
    const isVertical = maxCol === minCol;
    const isDiagonal = (maxRow - minRow) === (maxCol - minCol);

    if (isHorizontal) {
      for (let col = minCol; col <= maxCol; col++) {
        if (this.isValidCell(minRow, col) && !this.localGrid[minRow][col].isBlack) {
          this.selectCell(minRow, col, true);
          this.addToCurrentSelection(minRow, col);
        }
      }
    } else if (isVertical) {
      for (let row = minRow; row <= maxRow; row++) {
        if (this.isValidCell(row, minCol) && !this.localGrid[row][minCol].isBlack) {
          this.selectCell(row, minCol, true);
          this.addToCurrentSelection(row, minCol);
        }
      }
    } else if (isDiagonal) {
      const rowStep = end.row > start.row ? 1 : -1;
      const colStep = end.col > start.col ? 1 : -1;
      let row = start.row;
      let col = start.col;

      while (row !== end.row + rowStep && col !== end.col + colStep) {
        if (this.isValidCell(row, col) && !this.localGrid[row][col].isBlack) {
          this.selectCell(row, col, true);
          this.addToCurrentSelection(row, col);
        }
        row += rowStep;
        col += colStep;
      }
    }
  }

  submitSelection() {
    if (this.currentSelection.length === 0 || this.hasSubmitted) return;

    const selectedWord = this.getSelectedWord();

    let foundMatch = false;
    let matchedClue: CrosswordClue | null = null;

    // Check each unsolved clue
    for (const clue of this.localClues) {
      if (!clue.solved && selectedWord === clue.answer.toUpperCase()) {
        if (this.doesSelectionMatchClue(clue)) {
          matchedClue = clue;
          foundMatch = true;
          break;
        }
      }
    }

    if (foundMatch && matchedClue) {
      matchedClue.solved = true;
      this.userScore += 10;

      // Mark all selected cells as correct
      for (const cell of this.currentSelection) {
        if (!this.activeMode) {
          this.localGrid[cell.row][cell.col].isCorrect = true;
          // Add to permanent highlights
          const key = `${cell.row},${cell.col}`;
          this.permanentHighlights.add(key);
        }
        // Clear selection for correct cells but keep highlight
        this.localGrid[cell.row][cell.col].isSelected = false;
        this.localGrid[cell.row][cell.col].isIncorrect = false;
        this.localGrid[cell.row][cell.col].isHighlighted = true;
      }
    } else {
      // Incorrect selection - only mark non-correct cells
      for (const cell of this.currentSelection) {
        if (!this.localGrid[cell.row][cell.col].isCorrect) {
          if (!this.activeMode) {
            // Show incorrect state (will be styled differently in CSS)
            this.localGrid[cell.row][cell.col].isIncorrect = true;
            // Add to permanent highlights - this is KEY: incorrect cells also stay highlighted
            const key = `${cell.row},${cell.col}`;
            this.permanentHighlights.add(key);
          }
          // Keep selection and highlight visible
          this.localGrid[cell.row][cell.col].isSelected = true;
          this.localGrid[cell.row][cell.col].isHighlighted = true;
        }
      }

      // For non-active mode, after showing incorrect feedback
      if (!this.activeMode) {
        setTimeout(() => {
          for (const cell of this.currentSelection) {
            if (!this.localGrid[cell.row][cell.col].isCorrect) {
              // Keep incorrect flag (this controls the red color in CSS)
              // Keep selection and highlight visible
              this.localGrid[cell.row][cell.col].isSelected = true;
              this.localGrid[cell.row][cell.col].isHighlighted = true;
              // The cell stays in permanentHighlights, so it will stay highlighted
            }
          }
          this.cdr.markForCheck();
        }, 1000);
      }
    }

    // Clear current selection array after processing
    this.currentSelection = [];
    this.cdr.markForCheck();
  }

  // Clear temporary selections but keep permanent highlights
  private clearTemporarySelections() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const key = `${i},${j}`;
        const isPermanentlyHighlighted = this.permanentHighlights.has(key);

        // Only clear selection if cell is not permanently highlighted
        if (this.localGrid[i][j].isSelected && !isPermanentlyHighlighted) {
          this.localGrid[i][j].isSelected = false;
          this.localGrid[i][j].isHighlighted = false;
        }
        // Clear incorrect state for non-permanent cells
        if (!isPermanentlyHighlighted) {
          this.localGrid[i][j].isIncorrect = false;
        }
      }
    }
  }

  // Clear ALL selections (both current and previous)
  clearAllSelections() {
    if (this.hasSubmitted) return;

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        // Only clear selections from non-permanently highlighted cells
        const key = `${i},${j}`;
        if (!this.permanentHighlights.has(key)) {
          this.localGrid[i][j].isSelected = false;
          this.localGrid[i][j].isIncorrect = false;
          this.localGrid[i][j].isHighlighted = false;
        } else {
          // For permanently highlighted cells, just clear selection but keep highlight
          this.localGrid[i][j].isSelected = false;
        }
      }
    }

    this.currentSelection = [];
    this.cdr.markForCheck();
  }

  highlightClue(clue: CrosswordClue) {
    if (this.hasSubmitted) return;

    // First, clear all non-permanent highlights
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const key = `${i},${j}`;
        // Only clear highlight if cell is not in permanent highlights
        if (!this.permanentHighlights.has(key)) {
          this.localGrid[i][j].isHighlighted = false;
        }
      }
    }

    // Highlight the clue's cells
    let currentRow = clue.row;
    let currentCol = clue.col;

    for (let i = 0; i < clue.length; i++) {
      if (this.isValidCell(currentRow, currentCol)) {
        const key = `${currentRow},${currentCol}`;
        // Only set highlight if cell is not permanently highlighted
        if (!this.permanentHighlights.has(key)) {
          this.localGrid[currentRow][currentCol].isHighlighted = true;
        }
      }

      if (clue.direction === 'across') {
        currentCol++;
      } else if (clue.direction === 'down') {
        currentRow++;
      } else if (clue.direction === 'diagonal') {
        currentRow++;
        currentCol++;
      }
    }

    this.cdr.markForCheck();
  }

  clearClueHighlight() {
    if (this.hasSubmitted) return;

    // Clear all non-permanent highlights
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const key = `${i},${j}`;
        // Only clear highlight if cell is not in permanent highlights
        if (!this.permanentHighlights.has(key)) {
          this.localGrid[i][j].isHighlighted = false;
        }
      }
    }

    this.cdr.markForCheck();
  }

  revealAllWords() {
    if (this.hasSubmitted) return;

    const newlyRevealed = this.localClues.filter(c => !c.solved).length;

    for (const clue of this.localClues) {
      if (!clue.solved) {
        clue.solved = true;

        let currentRow = clue.row;
        let currentCol = clue.col;

        for (let i = 0; i < clue.length; i++) {
          if (this.isValidCell(currentRow, currentCol)) {
            if (!this.activeMode) {
              this.localGrid[currentRow][currentCol].isCorrect = true;
              // Add to permanent highlights
              const key = `${currentRow},${currentCol}`;
              this.permanentHighlights.add(key);
            }
            this.localGrid[currentRow][currentCol].isSelected = false;
            this.localGrid[currentRow][currentCol].isHighlighted = true;
          }

          if (clue.direction === 'across') {
            currentCol++;
          } else if (clue.direction === 'down') {
            currentRow++;
          } else if (clue.direction === 'diagonal') {
            currentRow++;
            currentCol++;
          }
        }
      }
    }

    // Add partial score for revealed words
    this.userScore += newlyRevealed * 5;

    this.cdr.markForCheck();
  }

  submitPuzzle() {
    this.hasSubmitted = true;

    const percentage = this.getPercentage();

    this.puzzleSubmitted.emit({
      score: this.userScore,
      total: this.puzzle.totalScore,
      percentage: percentage
    });

    this.cdr.markForCheck();
  }

  private isValidCell(row: number, col: number): boolean {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }
}