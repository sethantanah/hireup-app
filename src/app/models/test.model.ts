export interface Scoring {
  wrong: number;
  correct: number;
  passmark: number;
  instructions: string;
}

export interface Field {
  key: string;
  type: string;
  question: string;
  answer: string;
  options?: string[];
  section?: number;
  subsection?: number;
}

export interface FormData {
  fields: Field[];
}

export interface TestData {
  id: string;
  formData: FormData;
  sections: FormSection[];
}

export interface FormSection {
  title: string
  scoring: Scoring;
  duration: number;
  instructions: string;
  sectionId: number;
  subsection?: FormSubSection[];
}

export interface FormSubSection {
  instructions: string;
  sectionId: number;
}

export interface JobTest {
  id: string;
  test_data: TestData;
}

export interface TestResponse {
  question: string;
  answer: string;
}