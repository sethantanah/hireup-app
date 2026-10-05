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
  puzzleData?: any;
  section?: number;
  subsection?: number;
  imageUrl?: string;
}

export interface FormData {
  fields: Field[];
}

export interface TestData {
  id: string;
  testTitle?: string;
  description?: string;
  testDuration?: number;
  formData: FormData;
  sections: FormSection[];
}

export interface FormSection {
  title: string;
  scoring: Scoring;
  duration: number;
  instructions: string;
  sectionId: number;
  imageUrl?: string;
  subsection?: FormSubSection[];
}

export interface FormSubSection {
  title?: string;
  instructions: string;
  sectionId: number;
  imageUrl?: string;
}

export interface JobTest {
  id: string;
  jobpost_id?: string;
  test_data: TestData;
  [key: string]: any;
}

export interface TestResponse {
  question: string;
  answer: string;
}