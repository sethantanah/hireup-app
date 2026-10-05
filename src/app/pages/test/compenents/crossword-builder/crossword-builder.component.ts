import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrosswordCell, CrosswordClue, CrosswordPuzzle, CrosswordPuzzleComponent } from '../crossword-puzzel/crossword-puzzle.component';
import { FormattingService } from '../../../../services/formatting.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-crossword-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, CrosswordPuzzleComponent],
  templateUrl: './crossword-builder.component.html',
  styleUrls: ['./crossword-builder.component.scss']
})
export class CrosswordBuilderComponent implements OnChanges {
  @Input() grid: CrosswordCell[][] = [];
  @Input() clues: CrosswordClue[] = [];
  @Input() previewOnly: boolean = false;
  @Input() instructions: string = "";
  @Input() autoSubmitTrigger?: Observable<void>;
  @Output() puzzleUpdated = new EventEmitter<CrosswordPuzzle>();
  @Output() puzzleSubmitted = new EventEmitter<{ score: number, total: number, percentage: number }>();

  gridSize = 10;
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  errorMessage: string | null = null;
  baseGrid: CrosswordCell[][] = [];
  displayGrid: CrosswordCell[][] = [];
  isSelecting = false;
  startCell: { row: number; col: number } | null = null;
  currentSelection: { row: number; col: number }[] = [];
  selectionDirection: 'across' | 'down' | 'diagonal' = 'across';

  newWord = '';
  newClue = '';
  isEditing = false;
  editingClueIndex: number | null = null;
  editingWord = '';
  editingClueText = '';

  autoWordsInput = '';
  showAutoGenerateModal = false;

  showPreview = false;
  nextClueNumber = 1;

  // Track which cells have letters (word letters or random letters)
  letterCells: Set<string> = new Set();

  instruct: string = "Find the hidden words in the crossword puzzle grid."

  constructor(public formattingService: FormattingService) {
    this.initializeGrid();
  }

  setDifficulty(level: 'Easy' | 'Medium' | 'Hard') {
    this.difficulty = level;
    if (level === 'Easy') {
      this.gridSize = 8;
    } else if (level === 'Medium') {
      this.gridSize = 10;
    } else if (level === 'Hard') {
      this.gridSize = 14;
    }
    this.initializeGrid();
  }

  ngOnChanges() {
    if (this.grid && this.grid.length > 0) {
      this.gridSize = this.grid.length;
      this.baseGrid = JSON.parse(JSON.stringify(this.grid));
      this.initializeLetterCells();
      this.updateDisplayGrid();
    }
    if (this.clues && this.clues.length > 0) {
      this.nextClueNumber = Math.max(...this.clues.map(c => c.number), 0) + 1;
    }
  }

  initializeGrid() {
    this.baseGrid = [];
    for (let i = 0; i < this.gridSize; i++) {
      this.baseGrid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        this.baseGrid[i][j] = {
          value: '',
          isBlack: false,
          row: i,
          col: j,
          isSelected: false,
          isHighlighted: false,
          isCorrect: false,
          isIncorrect: false
        };
      }
    }
    this.letterCells.clear();
    this.updateDisplayGrid();
    this.clues = [];
    this.nextClueNumber = 1;
    this.emitPuzzleUpdate();
  }

  initializeLetterCells() {
    this.letterCells.clear();
    // Add existing word letters
    this.clues.forEach(clue => {
      let currentRow = clue.row;
      let currentCol = clue.col;

      for (let i = 0; i < clue.length; i++) {
        if (this.isValidCell(currentRow, currentCol)) {
          const key = `${currentRow},${currentCol}`;
          this.letterCells.add(key);
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
    });
  }

  updateDisplayGrid() {
    // Always start with a fresh copy of the base grid
    this.displayGrid = JSON.parse(JSON.stringify(this.baseGrid));

    // Fill word letters first (always show these)
    this.fillWordLetters();

    if (!this.isEditing) {
      // In selection mode, fill non-word cells that don't have letters yet
      this.fillNonWordCells();
    }
  }

  fillWordLetters() {
    this.clues.forEach(clue => {
      let currentRow = clue.row;
      let currentCol = clue.col;

      for (let i = 0; i < clue.length; i++) {
        if (this.isValidCell(currentRow, currentCol)) {
          // Always show the word letter
          this.displayGrid[currentRow][currentCol].value = clue.answer[i] || '?';
          // Mark this cell as having a letter
          const key = `${currentRow},${currentCol}`;
          this.letterCells.add(key);
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
    });
  }

  fillNonWordCells() {
    // Only fill cells that:
    // 1. Are not black
    // 2. Are not part of a word (don't have a word letter)
    // 3. Don't already have a letter from previous fill
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const cell = this.displayGrid[i][j];
        const key = `${i},${j}`;

        if (!cell.isBlack && !cell.value && !this.isWordCell(i, j)) {
          // Only fill if it doesn't have a letter yet
          if (!this.letterCells.has(key)) {
            cell.value = this.getRandomLetter();
            this.letterCells.add(key);
          }
        }
      }
    }
  }

  fillNonWordCellsManual() {
    // Manual fill button - fills ALL empty non-word cells
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const cell = this.displayGrid[i][j];

        if (!cell.isBlack && !cell.value && !this.isWordCell(i, j)) {
          cell.value = this.getRandomLetter();
          const key = `${i},${j}`;
          this.letterCells.add(key);
        }
      }
    }
    this.emitPuzzleUpdate();
  }

  shuffleGrid(): void {
    if (this.clues && this.clues.length > 0) {
      const currentWords = this.clues.map(c => c.answer);

      let bestPlacedClues: CrosswordClue[] = [];
      let maxPlacedCount = -1;

      for (let attempt = 0; attempt < 8; attempt++) {
        const shuffledWords = [...currentWords];
        for (let i = shuffledWords.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
        }

        const testGridMap: string[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(''));
        const placedClues: CrosswordClue[] = [];
        let clueNum = 1;

        for (const word of shuffledWords) {
          let placed = false;

          if (placedClues.length === 0) {
            const maxStartCol = Math.max(0, this.gridSize - word.length);
            const row = Math.floor(Math.random() * (this.gridSize - 2)) + 1;
            const col = Math.floor(Math.random() * (maxStartCol + 1));
            const dir: 'across' | 'down' = Math.random() > 0.5 ? 'across' : 'down';

            if (this.canPlaceWord(testGridMap, word, row, col, dir)) {
              this.placeWordOnMap(testGridMap, word, row, col, dir);
              placedClues.push({
                id: `clue_${clueNum}`,
                number: clueNum++,
                clue: `Find the word: ${word}`,
                answer: word,
                direction: dir,
                row,
                col,
                length: word.length,
                solved: false
              });
              placed = true;
            }
          }

          if (!placed) {
            for (let letterIdx = 0; letterIdx < word.length && !placed; letterIdx++) {
              const char = word[letterIdx];
              const positions: { r: number, c: number }[] = [];
              for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                  if (testGridMap[r][c] === char) positions.push({ r, c });
                }
              }
              positions.sort(() => Math.random() - 0.5);

              for (const pos of positions) {
                const directions: ('across' | 'down')[] = Math.random() > 0.5 ? ['down', 'across'] : ['across', 'down'];
                for (const dir of directions) {
                  const startRow = dir === 'down' ? pos.r - letterIdx : pos.r;
                  const startCol = dir === 'across' ? pos.c - letterIdx : pos.c;
                  if (this.canPlaceWord(testGridMap, word, startRow, startCol, dir)) {
                    this.placeWordOnMap(testGridMap, word, startRow, startCol, dir);
                    placedClues.push({
                      id: `clue_${clueNum}`,
                      number: clueNum++,
                      clue: `Find the word: ${word}`,
                      answer: word,
                      direction: dir,
                      row: startRow,
                      col: startCol,
                      length: word.length,
                      solved: false
                    });
                    placed = true;
                    break;
                  }
                }
                if (placed) break;
              }
            }
          }

          if (!placed) {
            const allPositions: { r: number, c: number, dir: 'across' | 'down' }[] = [];
            for (let r = 0; r < this.gridSize; r++) {
              for (let c = 0; c < this.gridSize; c++) {
                allPositions.push({ r, c, dir: 'across' });
                allPositions.push({ r, c, dir: 'down' });
              }
            }
            allPositions.sort(() => Math.random() - 0.5);

            for (const pos of allPositions) {
              if (this.canPlaceWord(testGridMap, word, pos.r, pos.c, pos.dir)) {
                this.placeWordOnMap(testGridMap, word, pos.r, pos.c, pos.dir);
                placedClues.push({
                  id: `clue_${clueNum}`,
                  number: clueNum++,
                  clue: `Find the word: ${word}`,
                  answer: word,
                  direction: pos.dir,
                  row: pos.r,
                  col: pos.c,
                  length: word.length,
                  solved: false
                });
                placed = true;
                break;
              }
            }
          }
        }

        if (placedClues.length > maxPlacedCount) {
          maxPlacedCount = placedClues.length;
          bestPlacedClues = placedClues;
        }

        if (maxPlacedCount === currentWords.length) break;
      }

      if (bestPlacedClues.length > 0) {
        this.clues = bestPlacedClues;
        this.nextClueNumber = bestPlacedClues.length + 1;
        this.initializeLetterCells();
        this.updateDisplayGrid();
        this.letterCells.clear();
        this.fillWordLetters();
        for (let i = 0; i < this.gridSize; i++) {
          for (let j = 0; j < this.gridSize; j++) {
            const cell = this.displayGrid[i][j];
            if (!cell.isBlack && !this.isWordCell(i, j)) {
              cell.value = this.getRandomLetter();
              this.letterCells.add(`${i},${j}`);
            }
          }
        }
        this.emitPuzzleUpdate();
        return;
      }
    }

    this.letterCells.clear();
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const cell = this.displayGrid[i][j];
        if (!cell.isBlack && !this.isWordCell(i, j)) {
          cell.value = this.getRandomLetter();
          this.letterCells.add(`${i},${j}`);
        }
      }
    }
    this.emitPuzzleUpdate();
  }

  getRandomLetter(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters.charAt(Math.floor(Math.random() * letters.length));
  }

  switchToSelectionMode() {
    this.isEditing = false;
    this.updateDisplayGrid();
    this.clearSelection();
  }

  switchToEditMode() {
    this.isEditing = true;
    this.updateDisplayGrid();
    this.clearSelection();
  }

  onMouseDown(event: MouseEvent) {
    if (this.isEditing) return;

    const cell = this.getCellFromEvent(event);
    if (cell && !this.displayGrid[cell.row][cell.col].isBlack) {
      this.isSelecting = true;
      this.startCell = cell;
      this.clearSelection();
      this.selectCell(cell.row, cell.col, true);
      event.preventDefault();
    }
  }

  onMouseUp(event: MouseEvent) {
    if (!this.isSelecting || this.isEditing) return;

    this.isSelecting = false;
    this.startCell = null;
    this.determineSelectionDirection();
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isSelecting || !this.startCell || this.isEditing) return;

    const cell = this.getCellFromEvent(event);
    if (cell && !this.displayGrid[cell.row][cell.col].isBlack) {
      this.selectCellsBetween(this.startCell, cell);
    }

    event.preventDefault();
  }

  private getCellFromEvent(event: MouseEvent): { row: number; col: number } | null {
    const element = event.target as HTMLElement;
    const cellElement = element.closest('.builder-cell');
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

  private selectCellsBetween(start: { row: number; col: number }, end: { row: number; col: number }) {
    this.clearSelection();

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const isHorizontal = maxRow === minRow;
    const isVertical = maxCol === minCol;
    const isDiagonal = (maxRow - minRow) === (maxCol - minCol);

    if (isHorizontal) {
      for (let col = minCol; col <= maxCol; col++) {
        this.selectCell(minRow, col, true);
      }
    } else if (isVertical) {
      for (let row = minRow; row <= maxRow; row++) {
        this.selectCell(row, minCol, true);
      }
    } else if (isDiagonal) {
      const rowStep = end.row > start.row ? 1 : -1;
      const colStep = end.col > start.col ? 1 : -1;
      let row = start.row;
      let col = start.col;

      while (row !== end.row + rowStep && col !== end.col + colStep) {
        this.selectCell(row, col, true);
        row += rowStep;
        col += colStep;
      }
    }

    this.updateCurrentSelection();
  }

  private selectCell(row: number, col: number, selected: boolean) {
    if (this.isValidCell(row, col) && !this.displayGrid[row][col].isBlack) {
      this.displayGrid[row][col].isSelected = selected;
    }
  }

  private updateCurrentSelection() {
    this.currentSelection = [];
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.displayGrid[i][j].isSelected) {
          this.currentSelection.push({ row: i, col: j });
        }
      }
    }
    this.currentSelection.sort((a, b) => {
      if (a.row === b.row) return a.col - b.col;
      return a.row - b.row;
    });
  }

  private determineSelectionDirection() {
    if (this.currentSelection.length < 2) {
      this.selectionDirection = 'across';
      return;
    }

    const first = this.currentSelection[0];
    const last = this.currentSelection[this.currentSelection.length - 1];

    if (first.row === last.row) {
      this.selectionDirection = 'across';
    } else if (first.col === last.col) {
      this.selectionDirection = 'down';
    } else if (Math.abs(last.row - first.row) === Math.abs(last.col - first.col)) {
      this.selectionDirection = 'diagonal';
    } else {
      this.selectionDirection = 'across';
    }
  }

  getSelectionDirection(): string {
    return this.selectionDirection;
  }

  onWordInput() {
    this.newWord = this.newWord.toUpperCase().replace(/[^A-Z]/g, '');
  }

  onEditingWordInput() {
    this.editingWord = this.editingWord.toUpperCase().replace(/[^A-Z]/g, '');
  }

  canAddWord(): boolean {
    if (!this.newWord || !this.currentSelection.length) return false;
    return this.newWord.length === this.currentSelection.length;
  }

  addWordFromSelection() {
    if (!this.canAddWord()) return;

    const firstCell = this.currentSelection[0];
    const clue: CrosswordClue = {
      number: this.nextClueNumber++,
      clue: this.newClue || `Word ${this.nextClueNumber - 1}`,
      answer: this.newWord,
      direction: this.selectionDirection,
      row: firstCell.row,
      col: firstCell.col,
      length: this.newWord.length,
      solved: false
    };

    this.clues.push(clue);

    // Clear any existing letters from these cells
    this.currentSelection.forEach(cell => {
      const key = `${cell.row},${cell.col}`;
      this.letterCells.delete(key); // Remove old random letter if any
      this.baseGrid[cell.row][cell.col].value = ''; // Clear base grid
    });

    this.newWord = '';
    this.newClue = '';
    this.clearSelection();

    // Re-initialize letter cells and update display
    this.initializeLetterCells();
    this.updateDisplayGrid();
    this.emitPuzzleUpdate();
  }

  editWord(clue: CrosswordClue, index: number) {
    this.editingClueIndex = index;
    this.editingWord = clue.answer;
    this.editingClueText = clue.clue;
    this.highlightWord(clue);
  }

  saveEditedWord() {
    if (this.editingClueIndex === null) return;

    const clue = this.clues[this.editingClueIndex];
    const oldLength = clue.length;
    const oldAnswer = clue.answer;

    clue.answer = this.editingWord.toUpperCase();
    clue.clue = this.editingClueText;
    clue.length = this.editingWord.length;

    // If word length changed, we need to update the grid
    if (oldLength !== clue.length || oldAnswer !== clue.answer) {
      this.initializeLetterCells();
      this.updateDisplayGrid();
    }

    this.emitPuzzleUpdate();
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingClueIndex = null;
    this.editingWord = '';
    this.editingClueText = '';
    this.clearSelection();
  }

  highlightWord(clue: CrosswordClue) {
    this.clearSelection();

    let currentRow = clue.row;
    let currentCol = clue.col;

    for (let i = 0; i < clue.length; i++) {
      if (this.isValidCell(currentRow, currentCol)) {
        this.displayGrid[currentRow][currentCol].isSelected = true;
        this.currentSelection.push({ row: currentRow, col: currentCol });
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

  isWordCell(row: number, col: number): boolean {
    return this.clues.some(clue => {
      let currentRow = clue.row;
      let currentCol = clue.col;

      for (let i = 0; i < clue.length; i++) {
        if (currentRow === row && currentCol === col) return true;

        if (clue.direction === 'across') {
          currentCol++;
        } else if (clue.direction === 'down') {
          currentRow++;
        } else if (clue.direction === 'diagonal') {
          currentRow++;
          currentCol++;
        }
      }
      return false;
    });
  }

  getWordCellCount(): number {
    let count = 0;
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.isWordCell(i, j)) {
          count++;
        }
      }
    }
    return count;
  }

  getBlackCellCount(): number {
    let count = 0;
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.baseGrid[i][j].isBlack) {
          count++;
        }
      }
    }
    return count;
  }

  getCellNumber(row: number, col: number): number | null {
    for (const clue of this.clues) {
      if (clue.row === row && clue.col === col) {
        return clue.number;
      }
    }
    return null;
  }

  removeClue(index: number) {
    const removedClue = this.clues[index];
    this.clues.splice(index, 1);

    // Update clue numbers
    this.clues.forEach((clue, i) => {
      clue.number = i + 1;
    });
    this.nextClueNumber = this.clues.length + 1;

    // Remove letters from the removed word cells
    let currentRow = removedClue.row;
    let currentCol = removedClue.col;

    for (let i = 0; i < removedClue.length; i++) {
      if (this.isValidCell(currentRow, currentCol)) {
        const key = `${currentRow},${currentCol}`;
        this.letterCells.delete(key);
        this.baseGrid[currentRow][currentCol].value = '';
      }

      if (removedClue.direction === 'across') {
        currentCol++;
      } else if (removedClue.direction === 'down') {
        currentRow++;
      } else if (removedClue.direction === 'diagonal') {
        currentRow++;
        currentCol++;
      }
    }

    this.updateDisplayGrid();
    this.emitPuzzleUpdate();
  }

  clearSelection() {
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        this.displayGrid[i][j].isSelected = false;
      }
    }
    this.currentSelection = [];
  }

  toggleCell(row: number, col: number) {
    if (this.isEditing) return;

    this.baseGrid[row][col].isBlack = !this.baseGrid[row][col].isBlack;
    this.displayGrid[row][col].isBlack = this.baseGrid[row][col].isBlack;

    if (!this.baseGrid[row][col].isBlack) {
      this.baseGrid[row][col].value = '';
      this.displayGrid[row][col].value = '';
      // Remove from letter cells if it was a random letter
      const key = `${row},${col}`;
      this.letterCells.delete(key);
    }

    this.updateDisplayGrid();
    this.emitPuzzleUpdate();
  }

  clearGrid() {
    this.initializeGrid();
  }

  importPuzzle() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const puzzle: CrosswordPuzzle = JSON.parse(e.target.result);
          this.loadPuzzle(puzzle);
        } catch (error) {
          console.error('Error parsing puzzle file:', error);
          this.errorMessage = 'Invalid puzzle file format. Please upload a valid JSON crossword structure.';
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  loadPuzzle(puzzle: CrosswordPuzzle) {
    this.gridSize = puzzle.size;
    this.baseGrid = puzzle.grid;
    this.clues = puzzle.clues;
    this.nextClueNumber = Math.max(...this.clues.map(c => c.number), 0) + 1;
    this.initializeLetterCells();
    this.updateDisplayGrid();
    this.emitPuzzleUpdate();
  }

  openPreview() {
    this.showPreview = true;
  }

  onPreviewSubmitted(event: any) {
    this.puzzleSubmitted.emit(event);
  }

  // exportPuzzle() {
  //   const puzzle = this.getPreviewPuzzle();
  //   const dataStr = JSON.stringify(puzzle, null, 2);
  //   const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  //   const exportFileDefaultName = `crossword-${Date.now()}.json`;

  //   const linkElement = document.createElement('a');
  //   linkElement.setAttribute('href', dataUri);
  //   linkElement.setAttribute('download', exportFileDefaultName);
  //   linkElement.click();
  // }



  exportPuzzle() {
    // Create a COMPLETE puzzle with all cells filled
    const completeGrid = JSON.parse(JSON.stringify(this.baseGrid));

    // Fill word letters
    this.clues.forEach(clue => {
      let currentRow = clue.row;
      let currentCol = clue.col;

      for (let i = 0; i < clue.length; i++) {
        if (this.isValidCell(currentRow, currentCol)) {
          completeGrid[currentRow][currentCol].value = clue.answer[i];
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
    });

    // Fill ALL remaining cells
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (!completeGrid[i][j].isBlack && !completeGrid[i][j].value) {
          completeGrid[i][j].value = this.getRandomLetter();
        }
      }
    }

    const puzzle: CrosswordPuzzle = {
      id: 'export-' + Date.now(),
      title: 'Crossword Puzzle',
      description: 'Find the hidden words',
      grid: completeGrid,
      clues: JSON.parse(JSON.stringify(this.clues)),
      size: this.gridSize,
      totalScore: this.clues.length * 10,
      userScore: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Export this COMPLETE puzzle
    const dataStr = JSON.stringify(puzzle, null, 2);
    // ... rest of export code


    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `crossword-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  getPreviewPuzzle(): CrosswordPuzzle {
    // Create a complete copy with ALL letters filled
    const previewGrid = JSON.parse(JSON.stringify(this.baseGrid));

    // First, fill word letters
    this.clues.forEach(clue => {
      let currentRow = clue.row;
      let currentCol = clue.col;

      for (let i = 0; i < clue.length; i++) {
        if (this.isValidCell(currentRow, currentCol)) {
          previewGrid[currentRow][currentCol].value = clue.answer[i];
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
    });

    // Then fill ALL remaining cells with random letters
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (!previewGrid[i][j].isBlack && !previewGrid[i][j].value) {
          previewGrid[i][j].value = this.getRandomLetter();
        }
      }
    }

    return {
      id: 'preview-' + Date.now(),
      title: 'Crossword Puzzle',
      description: this.instructions || 'Find the hidden words',
      grid: previewGrid,
      clues: JSON.parse(JSON.stringify(this.clues)),
      size: this.gridSize,
      totalScore: this.clues.length * 10,
      userScore: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private emitPuzzleUpdate() {
    const puzzle: CrosswordPuzzle = {
      id: 'builder-' + Date.now(),
      title: 'Crossword Puzzle',
      description: this.instructions || 'Find the hidden words',
      grid: JSON.parse(JSON.stringify(this.baseGrid)),
      clues: JSON.parse(JSON.stringify(this.clues)),
      size: this.gridSize,
      totalScore: this.clues.length * 10,
      userScore: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.puzzleUpdated.emit(puzzle);
  }

  onIntructChange(ev: string) {
    const puzzle: CrosswordPuzzle = {
      id: 'builder-' + Date.now(),
      title: 'Crossword Puzzle',
      description: ev || 'Find the hidden words',
      grid: JSON.parse(JSON.stringify(this.baseGrid)),
      clues: JSON.parse(JSON.stringify(this.clues)),
      size: this.gridSize,
      totalScore: this.clues.length * 10,
      userScore: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.puzzleUpdated.emit(puzzle);
  }

  autoGenerateFromWordList(listString?: string): void {
    const rawInput = listString !== undefined ? listString : this.autoWordsInput;
    if (!rawInput || !rawInput.trim()) {
      this.errorMessage = 'Please enter at least one word (e.g. JAVASCRIPT, ANGULAR, PYTHON).';
      return;
    }

    const words = rawInput
      .split(/[\n,;]+/)
      .map(w => w.trim().toUpperCase().replace(/[^A-Z]/g, ''))
      .filter(w => w.length >= 2 && w.length <= this.gridSize);

    if (words.length === 0) {
      this.errorMessage = `No valid words found. Words must be between 2 and ${this.gridSize} letters long.`;
      return;
    }

    // Sort words by length descending
    words.sort((a, b) => b.length - a.length);

    // Reset grid
    this.initializeGrid();
    const placedClues: CrosswordClue[] = [];
    const gridMap: string[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(''));

    let clueNum = 1;

    for (const word of words) {
      if (placedClues.length === 0) {
        // Place 1st word horizontally in the middle of grid
        const row = Math.floor(this.gridSize / 2);
        const col = Math.floor((this.gridSize - word.length) / 2);

        if (this.canPlaceWord(gridMap, word, row, col, 'across')) {
          this.placeWordOnMap(gridMap, word, row, col, 'across');
          placedClues.push({
            id: `clue_${clueNum}`,
            number: clueNum++,
            clue: `Find the word: ${word}`,
            answer: word,
            direction: 'across',
            row,
            col,
            length: word.length,
            solved: false
          });
        }
      } else {
        // Try placing subsequent word by intersecting with already placed words
        let placed = false;

        for (let letterIdx = 0; letterIdx < word.length && !placed; letterIdx++) {
          const char = word[letterIdx];

          for (let r = 0; r < this.gridSize && !placed; r++) {
            for (let c = 0; c < this.gridSize && !placed; c++) {
              if (gridMap[r][c] === char) {
                // Try placing 'down' if intersecting horizontal word
                const downStartRow = r - letterIdx;
                if (this.canPlaceWord(gridMap, word, downStartRow, c, 'down')) {
                  this.placeWordOnMap(gridMap, word, downStartRow, c, 'down');
                  placedClues.push({
                    id: `clue_${clueNum}`,
                    number: clueNum++,
                    clue: `Find the word: ${word}`,
                    answer: word,
                    direction: 'down',
                    row: downStartRow,
                    col: c,
                    length: word.length,
                    solved: false
                  });
                  placed = true;
                }

                // Try placing 'across' if intersecting vertical word
                if (!placed) {
                  const acrossStartCol = c - letterIdx;
                  if (this.canPlaceWord(gridMap, word, r, acrossStartCol, 'across')) {
                    this.placeWordOnMap(gridMap, word, r, acrossStartCol, 'across');
                    placedClues.push({
                      id: `clue_${clueNum}`,
                      number: clueNum++,
                      clue: `Find the word: ${word}`,
                      answer: word,
                      direction: 'across',
                      row: r,
                      col: acrossStartCol,
                      length: word.length,
                      solved: false
                    });
                    placed = true;
                  }
                }
              }
            }
          }
        }

        // If no intersection was found, try finding any open space
        if (!placed) {
          for (let r = 0; r < this.gridSize && !placed; r++) {
            for (let c = 0; c <= this.gridSize - word.length && !placed; c++) {
              if (this.canPlaceWord(gridMap, word, r, c, 'across')) {
                this.placeWordOnMap(gridMap, word, r, c, 'across');
                placedClues.push({
                  id: `clue_${clueNum}`,
                  number: clueNum++,
                  clue: `Find the word: ${word}`,
                  answer: word,
                  direction: 'across',
                  row: r,
                  col: c,
                  length: word.length,
                  solved: false
                });
                placed = true;
              }
            }
          }
        }
      }
    }

    this.clues = placedClues;
    this.nextClueNumber = clueNum;

    // Apply placed word letters to baseGrid
    this.initializeLetterCells();
    this.updateDisplayGrid();
    this.fillNonWordCellsManual();

    this.errorMessage = null;
    this.showAutoGenerateModal = false;
    this.emitPuzzleUpdate();
  }

  private canPlaceWord(gridMap: string[][], word: string, startRow: number, startCol: number, direction: 'across' | 'down'): boolean {
    if (direction === 'across') {
      if (startRow < 0 || startRow >= this.gridSize || startCol < 0 || startCol + word.length > this.gridSize) return false;
      for (let i = 0; i < word.length; i++) {
        const c = startCol + i;
        const existing = gridMap[startRow][c];
        if (existing !== '' && existing !== word[i]) return false;
      }
      return true;
    } else {
      if (startCol < 0 || startCol >= this.gridSize || startRow < 0 || startRow + word.length > this.gridSize) return false;
      for (let i = 0; i < word.length; i++) {
        const r = startRow + i;
        const existing = gridMap[r][startCol];
        if (existing !== '' && existing !== word[i]) return false;
      }
      return true;
    }
  }

  private placeWordOnMap(gridMap: string[][], word: string, startRow: number, startCol: number, direction: 'across' | 'down'): void {
    for (let i = 0; i < word.length; i++) {
      if (direction === 'across') {
        gridMap[startRow][startCol + i] = word[i];
      } else {
        gridMap[startRow + i][startCol] = word[i];
      }
    }
  }

  private isValidCell(row: number, col: number): boolean {
    return row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize;
  }
}