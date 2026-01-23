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
  max_pages?: string | number;
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
  applicationData?: {};
  company: Company;
  job: Job;
  applySection: ApplySection;
  benefits: Benefit;
  footer: Footer;
  formData: FormData;
  requestForDataForm?: FormData;
  submissionMessage: SubmissionMessage;
  colorScheme: ColorScheme;
  id?: string;
  sections: string[];
  additionalSections?: string[]
  deadline: string;
  templateId: string;
  lastUpdated?: number;
  cardSettings?: string[];
  searchFilterSettings?: string[];
  cardDisplaySettings?: string[];
  rankingSettings?: DocumentEvaluationSchema;
  shortListingSettings?: DocumentEvaluationSchema;
  emailTemplates?: EmailTemplate[];
  applicationStages?: ApplicationStage[];
  version?: string;
}


export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  stageId?: string;
  type: 'auto' | 'manual';
  placeholders: string[];
  for?: string;
}

interface EvaluationMetric {
  score: string;
  weight: number;
}

interface DocumentCriteria {
  evalution_type?: string;
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
  application_metrics: any;
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




// JOB POST DATA MODEL INTERFACES
export interface JobPost {
  id: string;
  last_updated?: number;
  card_settings?: string[];
  search_filter_settings?: string[];
  card_display_settings?: string[];
  ranking_settings?: DocumentEvaluationSchema;
  created_at?: string;
  updated_at?: string;
  title: string;
  user_id: string;
  received_documents: number;
  short_listed: number;
  sent_emails: number;
  total_views: number;
  application_deadline?: string;
  status: 'draft' | 'published' | 'closed' | 'archived';
  department?: string;
  location?: string;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'remote';
  experience_level?: 'entry' | 'mid' | 'senior' | 'executive';
  salary_range?: SalaryRange;
  template_data?: JobPostData;
  stage_metrics?: StageMetricsSummary;
  current_stage_id?: string;
  hiring_team?: HiringTeamMember[];
  constraints?: string[];
  tags?: string[];
  application_stages?: ApplicationStage[];
  stage_progress?: StageProgress[];
}

export interface ApplicationStage {
  id: string;
  jobpost_id: string;
  name: string;
  description?: string;
  order: number;
  is_active: boolean;
  hide_stage?: boolean;
  is_skippable: boolean;
  stage_type: 'standard' | 'evaluation' | 'approval' | 'notification';
  required_approvals?: number;
  auto_advance_days?: number;
  email_template_id?: string;
  created_at?: string;
  updated_at?: string;
  metrics?: StageMetrics;
}

export interface StageMetrics {
  id?: string;
  jobpost_id: string;
  stage_id: string;
  candidate_count: number;
  completed_count: number;
  successful_count: number;
  rejected_count: number;
  average_completion_time_hours?: number;
  conversion_rate?: number;
  last_updated?: string;
  metrics_snapshot?: {
    weekly_trend?: number[];
    completion_rate?: number;
    success_rate?: number;
    average_time?: string;
    bottlenecks?: string[];
  };
}

export interface StageMetricsSummary {
  total_candidates: number;
  active_stages: number;
  overall_conversion_rate: number;
  average_time_to_hire: number;
  stage_breakdown: {
    [stageId: string]: {
      name: string;
      candidate_count: number;
      completion_rate: number;
      success_rate: number;
      average_time: string;
    };
  };
}

export interface StageProgress {
  stage_id: string;
  stage_name: string;
  candidate_count: number;
  completed_count: number;
  pending_count: number;
  success_rate: number;
  average_duration: string;
  is_current: boolean;
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  is_public: boolean;
}

export interface HiringTeamMember {
  user_id: string;
  full_name: string;
  email: string;
  role: 'hiring_manager' | 'recruiter' | 'interviewer' | 'approver';
  stages: string[]; // Stage IDs this member is involved in
}


export interface EvaluationCriteria {
  name: string;
  weight: number;
  description: string;
  max_score: number;
}
