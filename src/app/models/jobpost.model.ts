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
  location?: string;
  type?: string;
  salaryRange?: string;
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
  key: string;
  type?: string;
  label: string;
  section: string;
  required?: boolean;
  min_length?: string | number;
  max_length?: string | number;
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

export interface FormDataSections {
  sections: FormSection[];
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
  accent?: string;
  background?: string;
  text?: string;
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
  id?: string;
  sections: string[];
  deadline: string;
  templateId: string;
  lastUpdated?: number;
  cardSettings?: string[];
  searchFilterSettings?: string[];
  cardDisplaySettings?: string[];
  rankingSettings?: DocumentEvaluationSchema;
  emailTemplates?: any[];
  version?: string;
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



export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export interface NavLink {
  id?: string;
  label: string;
  url: string;
  target?: '_blank' | '_self';
}

export interface CompanyInfo {
  name: string;
  logoUrl: string;
  navLinks: NavLink[];
}

export interface JobInfo {
  title: string;
  description: string;
  location?: string;
  type?: string;
  salaryRange?: string;
}

export interface ApplySection {
  title: string;
  instructions: string;
  buttonText: string;
  declaration: string;
}

export interface BenefitsSection {
  title: string;
  items: string[];
}

export interface FooterSection {
  copyrightText: string;
  links: NavLink[];
}


export interface SubmissionMessage {
  title: string;
  message: string;
  actionText: string;
  actionLink: string;
}


// API Response Interfaces
interface JobPostDataDataBase {
  id: string;
  jobpost_id: JobPostData;
  created_at?: number;
  template_data: JobPostData;
}

export interface JobPostDataResponse {
  success: boolean;
  message: string;
  data?: JobPostDataDataBase[];
}

export interface JobPostDataCreateUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    [key: string]: any;
  };
}

// Error Interface
export interface JobPostManagerError {
  code: string;
  message: string;
  details?: string;
  timestamp: number;
}