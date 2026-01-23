import { Component, OnInit } from '@angular/core';
import { JobtestApiService } from '../../../services/jobtest-api.service';
import {
  Field,
  FormSection,
  FormSubSection,
  TestData,
} from '../../../models/test.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FormattingService } from '../../../services/formatting.service';
import { CrosswordBuilderComponent } from '../compenents/crossword-builder/crossword-builder.component';
import { CrosswordCell, CrosswordField, CrosswordPuzzle, CrosswordPuzzleComponent } from '../compenents/crossword-puzzel/crossword-puzzle.component';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-create-test',
  imports: [CommonModule, FormsModule, CrosswordBuilderComponent, CrosswordPuzzleComponent, DragDropModule],
  templateUrl: './create-test.component.html',
  styleUrl: './create-test.component.scss',
})
export class CreateTestComponent implements OnInit {
  test: TestData | null = null;
  showQuestionPopup = false;
  showTestMetadataPopup = false;
  newQuestion: Field = {
    key: '',
    type: '',
    question: '',
    answer: '',
    options: [],
    section: 1,
    subsection: 1,
  };
  selectedOptionIndex: number | null = null;
  errorMessage: string | null = null;
  optionInput: string = '';
  isEditingOption: boolean = false;
  editingOptionIndex: number | null = null;
  isEditingQuestion: boolean = false;
  editingQuestionKey: string | null = null;

  selectedSection: number = 1;
  selectedSubSection: number = 1;

  showCrosswordBuilder = false;
  crosswordField: CrosswordField | null = null;

  // Add these properties to your component
  rawQuestionsText: string = '';
  parsedQuestions: any[] = [];
  isParsing: boolean = false;
  showParseDialog: boolean = false;
  questionsJson: string = '';
  useJsonInput: boolean = false;
  showParsePreview: boolean = false;

  // New properties for drag & drop and filtering
  filteredQuestions: Field[] = [];
  searchQuery: string = '';
  filterSection: number = 0;
  showSectionDropdownFor: string | null = null;
  isDraggingDisabled: boolean = false;
  totalQuestions: number = 0;
  sectionQuestionsMap: Map<number, Field[]> = new Map();

  // Add this method to open crossword builder
  createCrosswordBuilder(): void {
    this.crosswordField = {
      key: `crossword_${Date.now()}`,
      type: 'crossword',
      question: 'Find the hidden words in the crossword puzzle',
      answer: '', // Will be computed based on completion
      puzzleData: {
        id: `puzzle_${Date.now()}`,
        title: 'Crossword Puzzle',
        description: 'Find the hidden words in the grid. Click and drag to select words.',
        grid: [],
        clues: [], // Start with empty clues - user will add them in builder
        size: 10, // Smaller default size for better UX
        totalScore: 0, // Will be calculated when clues are added
        userScore: 0, // Starts at 0
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    this.showCrosswordBuilder = true;
  }

  onCrosswordSave(event: CrosswordPuzzle): void {
    if (this.crosswordField) {
      this.crosswordField.puzzleData = event;
    }
  }

  saveCrosswordPuzzle(): void {
    if (this.crosswordField && this.crosswordField.puzzleData) {
      // Now save or update the field in the test
      const test = this.test;
      const crosswordField = this.crosswordField;

      if (!test?.formData?.fields || !crosswordField) return;

      const fields = test.formData.fields;

      const index = fields.findIndex(
        field => field.key === crosswordField.key
      );

      if (index !== -1) {
        // Update in service
        this.testService.updateField(crosswordField.key, crosswordField);
      } else {
        // Persist via service
        this.testService.addField(crosswordField);
      }
      this.showCrosswordBuilder = false;
      this.updateQuestionNumbers();
      this.applyFilters();
    }
  }

  onCrosswordCompleted(field: any, event: any): void {
    console.log('Crossword completed for field:', field);
    console.log('Puzzle result:', event);
  }

  constructor(
    public testService: JobtestApiService,
    private route: ActivatedRoute,
    public formattingService: FormattingService
  ) {
    const testId = this.route.snapshot.paramMap.get('testId');

    if (testId) {
      this.testService.jobTest(testId).subscribe({
        next: (data) => {
          this.test = data.test_data;
          this.test!.id = data.id;
          this.initializeDragDrop();
          this.saveTestMetadata();
        },
        error: (error) => {
          console.error(error);
        },
      });
    } else {
      this.test = this.testService.getTest();
      this.initializeDragDrop();
    }
  }

  ngOnInit(): void {
    this.test = this.testService.getTest();
    this.initializeDragDrop();
    
    setInterval(() => {
      this.saveTestMetadata();
    }, 2000);
  }

  // ========== DRAG & DROP INITIALIZATION ==========
  initializeDragDrop(): void {
    if (this.test?.formData?.fields) {
      this.updateQuestionNumbers();
      this.updateSectionQuestionsMap();
      this.updateTotalQuestions();
    }
  }

  // ========== DRAG & DROP FUNCTIONALITY ==========
  drop(event: CdkDragDrop<any[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    if (this.filteredQuestions.length > 0) {
      // Reordering within filtered view
      moveItemInArray(this.filteredQuestions, event.previousIndex, event.currentIndex);
      this.syncFilteredToMain();
    } else {
      // Reordering in main list
      moveItemInArray(this.test!.formData.fields, event.previousIndex, event.currentIndex);
    }
    
    this.updateQuestionNumbers();
    this.updateSectionQuestionsMap();
    this.saveTestMetadata();
  }

  dropBetweenSections(event: CdkDragDrop<any[]>, targetSectionId: number) {
    const field = event.item.data as Field;
    
    // If dropping in same section, just reorder
    if (field.section === targetSectionId || 
        (targetSectionId === 1 && field.section === undefined)) {
      const sectionQuestions = this.getSectionQuestions(targetSectionId);
      moveItemInArray(sectionQuestions, event.previousIndex, event.currentIndex);
      this.syncSectionQuestionsToMain(targetSectionId, sectionQuestions);
    } else {
      // Move to different section
      this.moveToSection(field, targetSectionId);
    }
    
    this.updateQuestionNumbers();
    this.saveTestMetadata();
  }

  syncFilteredToMain(): void {
    const filteredKeys = this.filteredQuestions.map(q => q.key);
    const allQuestions = [...this.test!.formData.fields];
    
    // Sort all questions based on filtered order
    const orderedQuestions = allQuestions.sort((a, b) => {
      const aIndex = filteredKeys.indexOf(a.key);
      const bIndex = filteredKeys.indexOf(b.key);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
    
    this.test!.formData.fields = orderedQuestions;
  }

  syncSectionQuestionsToMain(sectionId: number, sectionQuestions: Field[]): void {
    // Remove all questions from this section
    this.test!.formData.fields = this.test!.formData.fields.filter(f => 
      !(f.section === sectionId || (sectionId === 1 && f.section === undefined))
    );
    
    // Add reordered section questions back
    const insertIndex = this.findInsertIndexForSection(sectionId);
    this.test!.formData.fields.splice(insertIndex, 0, ...sectionQuestions);
  }

  // ========== SECTION MANAGEMENT ==========
  moveToSection(field: Field, sectionId: number | undefined): void {
    const oldSectionId = field.section || 1;
    field.section = sectionId;
    
    // If moving to a section, reset subsection
    if (sectionId !== undefined) {
      field.subsection = undefined;
    }
    
    // Reorder to maintain logical flow
    this.reorderQuestionInNewSection(field, oldSectionId, sectionId || 1);
    
    this.saveTestMetadata();
    this.applyFilters();
    this.showSectionDropdownFor = null;
    this.updateSectionQuestionsMap();
  }

  reorderQuestionInNewSection(field: Field, oldSectionId: number, newSectionId: number): void {
    // Remove from old position
    const currentIndex = this.test!.formData.fields.findIndex(f => f.key === field.key);
    if (currentIndex !== -1) {
      this.test!.formData.fields.splice(currentIndex, 1);
    }
    
    // Find insert position in new section
    const insertIndex = this.findInsertIndexForSection(newSectionId);
    this.test!.formData.fields.splice(insertIndex, 0, field);
  }

  findInsertIndexForSection(sectionId: number): number {
    // Find the first question of the next section to insert before it
    for (let i = 0; i < this.test!.formData.fields.length; i++) {
      const field = this.test!.formData.fields[i];
      const fieldSection = field.section || 1;
      
      if (fieldSection > sectionId) {
        return i;
      }
    }
    
    // If no next section, insert at the end
    return this.test!.formData.fields.length;
  }

  getSectionQuestions(sectionId: number): Field[] {
    if (this.sectionQuestionsMap.has(sectionId)) {
      return this.sectionQuestionsMap.get(sectionId)!;
    }
    
    const questions = this.test?.formData?.fields?.filter(field => 
      field.section === sectionId || (sectionId === 1 && field.section === undefined)
    ) || [];
    
    this.sectionQuestionsMap.set(sectionId, questions);
    return questions;
  }

  getSubSectionQuestions(sectionId: number, subSectionId: number): Field[] {
    return this.test?.formData?.fields?.filter(field => 
      field.section === sectionId && field.subsection === subSectionId
    ) || [];
  }

  deleteSection(section: FormSection): void {
    if (confirm(`Are you sure you want to delete Section ${section.sectionId}? All questions in this section will be moved to Section 1.`)) {
      // Move all questions from this section to section 1
      this.test!.formData.fields.forEach(field => {
        if (field.section === section.sectionId) {
          field.section = 1;
          field.subsection = undefined;
        }
        
        // Update section IDs for questions in higher sections
        if (field.section && field.section > section.sectionId) {
          field.section = field.section - 1;
        }
      });
      
      // Remove the section
      this.test!.sections = this.test!.sections.filter(s => s.sectionId !== section.sectionId);
      
      // Reindex sections
      this.test!.sections.forEach((s, index) => {
        s.sectionId = index + 1;
      });
      
      this.saveTestMetadata();
      this.updateSectionQuestionsMap();
      this.applyFilters();
    }
  }

  deleteSubSection(section: FormSection, subIndex: number): void {
    if (section.subsection && confirm('Are you sure you want to delete this subsection?')) {
      const subSectionId = section.subsection[subIndex].sectionId;
      
      // Move questions from this subsection to main section
      this.test!.formData.fields.forEach(field => {
        if (field.section === section.sectionId && field.subsection === subSectionId) {
          field.subsection = undefined;
        }
      });
      
      // Remove subsection
      section.subsection.splice(subIndex, 1);
      
      // Reindex subsections
      section.subsection.forEach((sub, index) => {
        sub.sectionId = index + 1;
      });
      
      this.saveTestMetadata();
      this.updateSectionQuestionsMap();
    }
  }

  // ========== FILTERING & SEARCH ==========
  applyFilters(): void {
    if (!this.test?.formData?.fields) {
      this.filteredQuestions = [];
      return;
    }

    let filtered = [...this.test.formData.fields];

    // Apply section filter
    if (this.filterSection > 0) {
      filtered = filtered.filter(field => 
        field.section === this.filterSection || 
        (this.filterSection === 1 && field.section === undefined)
      );
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(field =>
        field.question.toLowerCase().includes(query) ||
        field.type.toLowerCase().includes(query) ||
        (field.options && field.options.some(opt => opt.toLowerCase().includes(query)))
      );
    }

    this.filteredQuestions = filtered;
  }

  resetFilters(): void {
    this.filterSection = 0;
    this.searchQuery = '';
    this.filteredQuestions = [];
    this.applyFilters();
  }

  showAllQuestions(): void {
    this.resetFilters();
  }

  // ========== QUESTION NUMBERING & UTILITIES ==========
  getQuestionNumber(field: Field): number {
    if (!this.test?.formData?.fields) return 0;
    const index = this.test.formData.fields.findIndex(f => f.key === field.key);
    return index >= 0 ? index + 1 : 0;
  }

  updateQuestionNumbers(): void {
    // Trigger change detection for question numbers
    if (this.test?.formData?.fields) {
      this.test.formData.fields = [...this.test.formData.fields];
    }
  }

  updateSectionQuestionsMap(): void {
    this.sectionQuestionsMap.clear();
    if (this.test?.sections) {
      this.test.sections.forEach(section => {
        const questions = this.getSectionQuestions(section.sectionId);
        this.sectionQuestionsMap.set(section.sectionId, questions);
      });
    }
  }

  updateTotalQuestions(): void {
    this.totalQuestions = this.test?.formData?.fields?.length || 0;
  }

  getTotalDuration(): number {
    return this.test?.sections?.reduce((total, section) => total + (section.duration || 0), 0) || 0;
  }

  // ========== UI HELPERS ==========
  toggleSectionDropdown(field: Field): void {
    this.showSectionDropdownFor = this.showSectionDropdownFor === field.key ? null : field.key;
  }

  toggleDragMode(): void {
    this.isDraggingDisabled = !this.isDraggingDisabled;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // ========== EXISTING METHODS (Updated) ==========
  setQuestionSection(sectionId: number): void {
    this.selectedSection = sectionId;
  }

  openPuzzleBuilder(): void {
    this.createCrosswordBuilder();
  }

  editPuzzleBuilder(field: CrosswordField): void {
    this.crosswordField = field;
    this.showCrosswordBuilder = true;
  }

  openQuestionPopup(type: string, questionKey?: string): void {
    if (questionKey) {
      const question = this.test?.formData.fields.find(
        (field) => field.question.toLowerCase() === questionKey.toLowerCase()
      );
      if (question) {
        this.newQuestion = { ...question };
        this.isEditingQuestion = true;
        this.editingQuestionKey = questionKey.toLowerCase();
        this.selectedOptionIndex = question.options?.indexOf(question.answer) ?? null;
      }
    } else {
      this.newQuestion = {
        key: `question_${Math.random().toString(36).substr(2, 10000)}`,
        type,
        question: '',
        answer: '',
        options: type === 'multiple-choice' ? [] : undefined,
        section: this.selectedSection,
        subsection: this.selectedSubSection,
      };
      this.isEditingQuestion = false;
      this.editingQuestionKey = null;
      this.selectedOptionIndex = null;
    }
    this.errorMessage = null;
    this.optionInput = '';
    this.isEditingOption = false;
    this.editingOptionIndex = null;
    this.showQuestionPopup = true;
  }

  saveQuestion(): void {
    if (this.newQuestion.type === 'multiple-choice') {
      if (this.selectedOptionIndex === null || this.newQuestion.options?.length === 0) {
        this.errorMessage = 'Please select the correct option.';
        return;
      }
      this.newQuestion.answer = this.newQuestion.options![this.selectedOptionIndex];
    } else if (this.newQuestion.type === 'user-input' && !this.newQuestion.answer) {
      this.errorMessage = 'Please provide an answer.';
      return;
    }

    if (this.isEditingQuestion && this.editingQuestionKey) {
      this.testService.updateField(this.editingQuestionKey, this.newQuestion);
    } else {
      this.testService.addField(this.newQuestion);
      this.updateTotalQuestions();
    }
    
    this.closeQuestionPopup();
    this.updateSectionQuestionsMap();
    this.applyFilters();
  }

  deleteQuestion(questionKey: Field): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.testService.deleteField(questionKey.question.toLowerCase());
      this.updateTotalQuestions();
      this.updateSectionQuestionsMap();
      this.applyFilters();
    }
  }

  createSection(): void {
    const section: FormSection = {
      title: '',
      scoring: {
        wrong: 0,
        correct: 1,
        passmark: 50,
        instructions: '',
      },
      instructions: '',
      duration: 50,
      sectionId: this.test!.sections.length + 1,
      subsection: []
    };

    this.testService.createSection(section);
    this.selectedSection = section.sectionId;
    this.updateSectionQuestionsMap();
    this.applyFilters();
  }

  createSubSection(section: FormSection): void {
    const subSection: FormSubSection = {
      instructions: '',
      sectionId: (section.subsection?.length ?? 0) + 1,
    };

    this.selectedSubSection = subSection.sectionId;
    this.testService.createSubSection(section.sectionId, subSection);

    if (!section.subsection) {
      section.subsection = [];
    }
    section.subsection.push(subSection);
    
    this.saveTestMetadata();
    this.updateSectionQuestionsMap();
  }

  // Keep existing methods but ensure they update drag & drop state
  saveTestMetadata(): void {
    if (this.test) {
      this.testService.saveTest(this.test);
    }
  }

  closeQuestionPopup(): void {
    this.showQuestionPopup = false;
    this.newQuestion = {
      key: '',
      type: '',
      question: '',
      answer: '',
      options: [],
    };
    this.selectedOptionIndex = null;
    this.errorMessage = null;
    this.optionInput = '';
    this.isEditingOption = false;
    this.editingOptionIndex = null;
    this.isEditingQuestion = false;
    this.editingQuestionKey = null;
  }

  handleOption(): void {
    if (this.optionInput.trim() === '') {
      this.errorMessage = 'Option cannot be empty.';
      return;
    }

    if (this.isEditingOption && this.editingOptionIndex !== null) {
      this.newQuestion.options![this.editingOptionIndex] = this.optionInput;
    } else {
      this.newQuestion.options!.push(this.optionInput);
    }

    this.optionInput = '';
    this.isEditingOption = false;
    this.editingOptionIndex = null;
    this.errorMessage = null;
  }

  editOption(index: number): void {
    this.optionInput = this.newQuestion.options![index];
    this.isEditingOption = true;
    this.editingOptionIndex = index;
  }

  deleteOption(index: number): void {
    this.newQuestion.options!.splice(index, 1);
    if (this.selectedOptionIndex === index) {
      this.selectedOptionIndex = null;
    }
  }

  selectCorrectOption(index: number): void {
    this.selectedOptionIndex = index;
  }

  handleUpload(): void {
    console.log('Upload button clicked');
    // Add your upload logic here
  }

  handleSave(): void {
    const jobId = this.route.snapshot.paramMap.get('jobId');
    this.testService.createUpdateJobTests(jobId || '', this.test!).subscribe({
      next: (data: any) => {
        if (data.data) {
          this.test!.id = data.data.id;
          this.saveTestMetadata();
          alert('Test saved successfully!');
        }
      },
      error: (error) => {
        console.error('Error saving test:', error);
      },
    });
  }

  // ========== QUESTION PARSING METHODS ==========
  openParseDialog(): void {
    this.showParseDialog = true;
    this.rawQuestionsText = '';
    this.questionsJson = '';
    this.parsedQuestions = [];
    this.showParsePreview = false;
    this.useJsonInput = false;
    this.errorMessage = null;
  }

  closeParseDialog(): void {
    this.showParseDialog = false;
    this.rawQuestionsText = '';
    this.questionsJson = '';
    this.parsedQuestions = [];
    this.showParsePreview = false;
    this.errorMessage = null;
  }

  parseQuestionsFromText(): void {
    this.isParsing = true;
    this.parsedQuestions = [];
    this.errorMessage = null;

    try {
      const lines = this.rawQuestionsText.split(/\n/);
      let currentQuestion: any = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const questionMatch = line.match(/^(\d+\.|Q?\d+[:.)])\s*(.+)/i);
        if (questionMatch) {
          if (currentQuestion) {
            this.finalizeQuestion(currentQuestion);
            this.parsedQuestions.push(currentQuestion);
          }

          currentQuestion = {
            key: `question_${Math.random().toString(36).substr(2, 9)}`,
            type: 'multiple-choice',
            question: questionMatch[2],
            answer: '',
            options: [],
            section: this.selectedSection,
            subsection: this.selectedSubSection,
            correctAnswerIndex: null
          };
          continue;
        }

        const optionMatch = line.match(/^([A-D]\.)\s*(.+)/i);
        if (optionMatch && currentQuestion) {
          currentQuestion.options.push(optionMatch[2]);
          continue;
        }

        const answerMatch = line.match(/Correct Answer:?\s*([A-D])/i);
        if (answerMatch && currentQuestion) {
          const answerLetter = answerMatch[1].toUpperCase();
          const optionIndex = answerLetter.charCodeAt(0) - 65;

          if (currentQuestion.options[optionIndex]) {
            currentQuestion.answer = currentQuestion.options[optionIndex];
            currentQuestion.correctAnswerIndex = optionIndex;
          }
          continue;
        }

        if (currentQuestion && !line.match(/^Correct Answer:/i)) {
          currentQuestion.question += ' ' + line;
        }
      }

      if (currentQuestion) {
        this.finalizeQuestion(currentQuestion);
        this.parsedQuestions.push(currentQuestion);
      }

      if (this.parsedQuestions.length === 0) {
        this.errorMessage = 'No questions could be parsed from the text. Please check your format.';
      } else {
        this.showParsePreview = true;
      }
    } catch (error) {
      this.errorMessage = 'Error parsing questions: ' + (error instanceof Error ? error.message : 'Unknown error');
    }

    this.isParsing = false;
  }

  private finalizeQuestion(question: any): void {
    question.question = question.question.trim();

    if (question.type === 'multiple-choice' && !question.answer && question.options.length > 0) {
      question.answer = question.options[0];
      question.correctAnswerIndex = 0;
    }

    if (question.type === 'multiple-choice' && question.options.length === 0) {
      question.type = 'user-input';
      question.options = undefined;
    }
  }

  saveParsedQuestions(): void {
    this.parsedQuestions.forEach(question => {
      delete question.correctAnswerIndex;
      question.section = this.selectedSection;
      question.subsection = this.selectedSubSection;
      this.testService.addField(question);
    });

    this.closeParseDialog();
    this.updateTotalQuestions();
    this.updateSectionQuestionsMap();
    this.applyFilters();
    this.showSuccessMessage(`${this.parsedQuestions.length} questions added successfully!`);
  }

  loadQuestionsFromJson(): void {
    try {
      const parsedJson = JSON.parse(this.questionsJson);

      if (Array.isArray(parsedJson)) {
        this.parsedQuestions = parsedJson.map((q: any, index: number) => ({
          key: q.key || `question_${Math.random().toString(36).substr(2, 9)}`,
          type: q.type || 'multiple-choice',
          question: q.question || '',
          answer: q.answer || '',
          options: q.options || (q.type === 'multiple-choice' ? [] : undefined),
          section: q.section || this.selectedSection,
          subsection: q.subsection || this.selectedSubSection,
          correctAnswerIndex: q.correctAnswerIndex || this.findCorrectAnswerIndex(q)
        }));

        if (this.parsedQuestions.length === 0) {
          this.errorMessage = 'JSON array is empty';
        } else {
          this.showParsePreview = true;
          this.errorMessage = null;
        }
      } else {
        this.errorMessage = 'JSON must be an array of questions';
      }
    } catch (error) {
      this.errorMessage = 'Invalid JSON format: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private findCorrectAnswerIndex(question: any): number | null {
    if (question.type === 'multiple-choice' && question.answer && question.options) {
      const index = question.options.indexOf(question.answer);
      return index >= 0 ? index : null;
    }
    return null;
  }

  editParsedQuestion(index: number): void {
    const question = this.parsedQuestions[index];
    this.showParseDialog = false;
    this.openQuestionPopup(question.type, question.question);

    setTimeout(() => {
      this.newQuestion = { ...question };
      this.isEditingQuestion = true;
      this.editingQuestionKey = question.question.toLowerCase();
      this.selectedOptionIndex = question.correctAnswerIndex;
    }, 100);
  }

  removeParsedQuestion(index: number): void {
    this.parsedQuestions.splice(index, 1);

    if (this.parsedQuestions.length === 0) {
      this.showParsePreview = false;
    }
  }

  private showSuccessMessage(message: string): void {
    console.log(message);
    // Implement your notification/toast system here
  }

  parseString(str: any) {
    return String.fromCharCode(str);
  }
}