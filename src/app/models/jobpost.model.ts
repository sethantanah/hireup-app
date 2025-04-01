export interface NavLink {
  text: string;
  url: string;
}

export interface Company {
  name: string;
  logoUrl: string;
  navLinks: NavLink[];
}

export interface Job {
  title: string;
  description: string;
}

export interface ApplySection {
  title: string;
  instructions: string;
  buttonText: string;
  declaration: string;
}

export interface Benefit {
  title: string;
  items: string[]; // Assuming items are strings.  Adjust if needed.
}

export interface FooterLink {
  text: string;
  url: string;
}

export interface Footer {
  copyrightText: string;
  links: FooterLink[];
}

export interface FormField {
  type: string;
  label: string;
  key: string;
  required: boolean;
  section: string;
  min_length: string | number;
  max_length: string | number;
  instructions: string;
  placeholder?: string;
  options?: string[]; // For select fields
  acceptedTypes?: string[]; // For file fields
}

export interface FormData {
  fields: FormField[];
}

export interface FormSection {
  id: string;
  name: string;
  fields: FormField[];
}

export interface SubmissionMessage {
  title: string;
  message: string;
  actionText: string;
  actionLink: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
}

export interface JobPostData {
  company: Company;
  job: Job;
  applySection: ApplySection;
  benefits: Benefit;
  footer: Footer;
  formData: FormData;
  submissionMessage: SubmissionMessage;
  colorScheme: ColorScheme;
  id?: number;
  sections: string[];
  deadline: string;
  templateId: string;
  lastUpdated?: number;
  cardSettings?: string[];
  searchFilterSettings?: string[];
  cardDisplaySettings?: string[];
  rankingSettings?: DocumentEvaluationSchema;
  emailTemplates?: any[];
}

interface EvaluationMetric {
  score: string;
  weight: number;
}

interface DocumentCriteria {
  document_type: string;
  criteria: string;
  evaluation_metrics: EvaluationMetric[];
}

interface DocumentEvaluationSchema {
  [key: string]: DocumentCriteria;
}
