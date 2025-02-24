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

@Component({
  selector: 'app-create-test',
  imports: [CommonModule, FormsModule],
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

  constructor(
    public testService: JobtestApiService,
    private route: ActivatedRoute,
    public formattingService: FormattingService
  ) {
    const testId = this.route.snapshot.paramMap.get('testId');

    if (testId) {
      this.testService.jobTest(testId).subscribe({
        next: (data) => {
          this.test = data[0].test_data;
          this.test!.id = data[0].id;
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

  createSection() {
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
    };

    this.testService.createSection(section);
    this.selectedSection = section.sectionId;
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
          sec.subsection?.push(subSection);
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
        const lastItem = sectionQuestions[sectionQuestions.length-1];

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
          console.log(this.test);
        }
      },
      error: (error) => {},
    });
  }
}
