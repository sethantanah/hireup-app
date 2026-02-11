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

@Component({
  selector: 'app-create-test',
  imports: [CommonModule, FormsModule, CrosswordBuilderComponent, CrosswordPuzzleComponent],
  templateUrl: './create-test.component.html',
  styleUrl: './create-test.component.scss',
})
export class CreateTestComponent implements OnInit {
  test: TestData | null = null;
  showQuestionPopup = false;
  showTestMetadataPopup = false; // Popup for editing test metadata
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
          this.saveTestMetadata();
        },
        error: (error) => {
          console.error(error);
        },
      });
    } else {
      this.test = this.testService.getTest();
    }

  }


  ngOnInit(): void {
    this.test = this.testService.getTest();
    setInterval(() => {
      this.saveTestMetadata();
    }, 2000);
  }
  // Open the question popup for adding or editing
  setQuestionSection(sectionId: number) {
    this.test?.formData.fields.forEach((field) => {

    })
    this.selectedSection = sectionId;
  }

  openPuzzleBuilder() {
    this.createCrosswordBuilder();
  }

  editPuzzleBuilder(field: CrosswordField) {
    this.crosswordField = field;
    this.showCrosswordBuilder = true;
  }

  openQuestionPopup(type: string, questionKey?: string): void {
    if (questionKey) {
      // Editing an existing question
      const question = this.test?.formData.fields.find(
        (field) => field.question.toLowerCase() === questionKey.toLowerCase()
      );
      if (question) {
        this.newQuestion = { ...question };
        this.isEditingQuestion = true;
        this.editingQuestionKey = questionKey.toLowerCase();
        this.selectedOptionIndex =
          question.options?.indexOf(question.answer) ?? null;
      }
    } else {
      // Adding a new question
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

  // Open the test metadata popup for editing
  openTestMetadataPopup(): void {
    this.showTestMetadataPopup = true;
  }

  closeTestMetadataPopup(): void {
    this.showTestMetadataPopup = false;
  }

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

  saveQuestion(): void {
    if (this.newQuestion.type === 'multiple-choice') {
      if (
        this.selectedOptionIndex === null ||
        this.newQuestion.options?.length === 0
      ) {
        this.errorMessage = 'Please select the correct option.';
        return;
      }
      this.newQuestion.answer =
        this.newQuestion.options![this.selectedOptionIndex];
    } else if (
      this.newQuestion.type === 'user-input' &&
      !this.newQuestion.answer
    ) {
      this.errorMessage = 'Please provide an answer.';
      return;
    }

    if (this.isEditingQuestion && this.editingQuestionKey) {
      // Update existing question
      this.testService.updateField(this.editingQuestionKey, this.newQuestion);
    } else {
      // Add new question
      this.testService.addField(this.newQuestion);
    }
    this.closeQuestionPopup();
  }

  deleteQuestion(questionKey: Field): void {
    this.testService.deleteField(questionKey.question.toLowerCase());
  }

  createSection(index?: number) {
    if (!this.test) return;
    
    const sectionIndex = this.test.sections.length === 0 ? this.test.sections.length + 1 : this.test.sections[this.test.sections.length - 1].sectionId + 1;
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
      sectionId: sectionIndex
    };




    this.testService.createSection(section, index);
    this.selectedSection = section.sectionId;
    // this.saveTestMetadata();
  }

  deleteSection(section: FormSection) {
    // Remove section from test data
    const index = this.test?.sections.findIndex(s => s.sectionId === section.sectionId);
    if (index !== undefined && index > -1) {
      this.test?.sections.splice(index, 1);
      this.saveTestMetadata();
    }
  }

  createSubSection(section: FormSection) {
    const subSection: FormSubSection = {
      instructions: '',
      sectionId: (section.subsection?.length ?? 0) + 1,
    };

    this.selectedSubSection = subSection.sectionId;
    this.testService.createSubSection(section.sectionId, subSection);

    this.test?.sections.forEach((sec) => {
      if (sec.sectionId === section.sectionId) {
        if (sec.subsection) {
          //sec.subsection?.push(subSection);
          sec.subsection = [subSection];
        } else {
          sec.subsection = [subSection];
        }

      }
    });
  }

  getSubSectionPosition(
    section: FormSection,
    subSection: FormSubSection
  ): number {
    let sectionPostion = -1;
    for (
      let index = 0;
      index <= this.test!.formData.fields.length - 1;
      index++
    ) {
      if (
        this.test?.formData.fields[index].subsection == subSection.sectionId
      ) {
        sectionPostion = index + 1;
        break;
      }
    }

    if (sectionPostion === -1) {
      const sectionQuestions =
        this.test?.formData.fields.filter(
          (field) => field.section == section.sectionId
        ) || [];

      if (sectionQuestions.length > 0) {
        const lastItem = sectionQuestions[sectionQuestions.length - 1];

        for (
          let index = 0;
          index <= this.test!.formData.fields.length - 1;
          index++
        ) {
          if (
            this.test?.formData.fields[index].question.toLocaleLowerCase() ==
            lastItem.question.toLowerCase()
          ) {
            sectionPostion = index + 1;
            break;
          }
        }
      }
    }

    return sectionPostion - 1;
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



  //NEW



  // Function to open the parse dialog
  openParseDialog(): void {
    this.showParseDialog = true;
    this.rawQuestionsText = '';
    this.questionsJson = '';
    this.parsedQuestions = [];
    this.showParsePreview = false;
    this.useJsonInput = false;
    this.errorMessage = null;
  }

  // Function to close the parse dialog
  closeParseDialog(): void {
    this.showParseDialog = false;
    this.rawQuestionsText = '';
    this.questionsJson = '';
    this.parsedQuestions = [];
    this.showParsePreview = false;
    this.errorMessage = null;
  }

  // Function to parse raw text
  parseQuestionsFromText(): void {
    this.isParsing = true;
    this.parsedQuestions = [];
    this.errorMessage = null;

    try {
      // Split by question number pattern (e.g., "57.", "58.")
      const lines = this.rawQuestionsText.split(/\n/);
      let currentQuestion: any = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check if line starts a new question (e.g., "57.", "1.", "Q1:")
        const questionMatch = line.match(/^(\d+\.|Q?\d+[:.)])\s*(.+)/i);
        if (questionMatch) {
          // Save previous question if exists
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

        // Check for option lines (A., B., C., etc.)
        const optionMatch = line.match(/^([A-D]\.)\s*(.+)/i);
        if (optionMatch && currentQuestion) {
          currentQuestion.options.push(optionMatch[2]);
          continue;
        }

        // Check for correct answer
        const answerMatch = line.match(/Correct Answer:?\s*([A-D])/i);
        if (answerMatch && currentQuestion) {
          const answerLetter = answerMatch[1].toUpperCase();
          const optionIndex = answerLetter.charCodeAt(0) - 65; // A=0, B=1, etc.

          if (currentQuestion.options[optionIndex]) {
            currentQuestion.answer = currentQuestion.options[optionIndex];
            currentQuestion.correctAnswerIndex = optionIndex;
          }
          continue;
        }

        // If line has content but doesn't match patterns, append to current question
        if (currentQuestion && !line.match(/^Correct Answer:/i)) {
          currentQuestion.question += ' ' + line;
        }
      }

      // Add the last question
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

  // Helper function to finalize question
  private finalizeQuestion(question: any): void {
    // Trim question text
    question.question = question.question.trim();

    // If no answer found but options exist, default to first option
    if (question.type === 'multiple-choice' && !question.answer && question.options.length > 0) {
      question.answer = question.options[0];
      question.correctAnswerIndex = 0;
    }

    // If no options but it's multiple-choice, convert to user-input
    if (question.type === 'multiple-choice' && question.options.length === 0) {
      question.type = 'user-input';
      question.options = undefined;
    }
  }

  // Function to save parsed questions
  saveParsedQuestions(): void {
    this.parsedQuestions.forEach(question => {
      // Remove temporary fields
      delete question.correctAnswerIndex;
      question.section=this.selectedSection,
      question.subsection=this.selectedSubSection


      // Add to test service
      this.testService.addField(question);
    });

    // Close dialog
    this.closeParseDialog();

    // Optional: Show success message
    this.showSuccessMessage(`${this.parsedQuestions.length} questions added successfully!`);
  }

  // Function to load questions from JSON
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

  // Helper to find correct answer index
  private findCorrectAnswerIndex(question: any): number | null {
    if (question.type === 'multiple-choice' && question.answer && question.options) {
      const index = question.options.indexOf(question.answer);
      return index >= 0 ? index : null;
    }
    return null;
  }

  // Function to edit a parsed question
  editParsedQuestion(index: number): void {
    const question = this.parsedQuestions[index];

    // Close parse dialog first
    this.showParseDialog = false;

    // Open the question editor
    this.openQuestionPopup(question.type, question.question);

    // Update the editor with parsed data
    setTimeout(() => {
      this.newQuestion = { ...question };
      this.isEditingQuestion = true;
      this.editingQuestionKey = question.question.toLowerCase();
      this.selectedOptionIndex = question.correctAnswerIndex;
    }, 100);
  }

  // Function to remove a parsed question
  removeParsedQuestion(index: number): void {
    this.parsedQuestions.splice(index, 1);

    if (this.parsedQuestions.length === 0) {
      this.showParsePreview = false;
    }
  }

  // Helper function for option letters (fixes the parseString issue)
  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // Optional success message function
  private showSuccessMessage(message: string): void {
    // Implement your notification/toast system here
    console.log(message);
    // Or use a toast service: this.toastService.success(message);
  }

  parseString(str: any) {
    return String.fromCharCode(str)
  }
}
