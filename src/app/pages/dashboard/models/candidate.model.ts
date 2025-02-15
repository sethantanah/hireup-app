export interface Candidate {
  id: string;
  form_data: FormData;
  uploaded_files: {
    cv: string;
    reference_letter: string;
  };
  resume_text?: string,
  resume_data: {
    personal_details: {
      full_name: string;
      email: string;
      phone_number: string;
      linkedin: string;
      github: string;
      portfolio: string;
      address: string;
    };
    education: {
      institution: string;
      degree: string;
      field_of_study: string;
      start_date: string;
      end_date: string;
      location: string;
      description: string;
    }[];
    work_experience: {
      company: string;
      job_title: string;
      start_date: string;
      end_date: string;
      location: string;
      description: string;
    }[];
    skills: {
      technical_skills: string[];
      soft_skills: string[];
      languages: string[];
    };
    certifications: {
      name: string;
      issuing_organization: string;
      issue_date: string;
      expiration_date: string;
      credential_id: string;
    }[];
    projects: {
      name: string;
      description: string;
      start_date: string;
      end_date: string;
      technologies_used: string[];
      outcome: string;
    }[];
    achievements: {
      title: string;
      date: string;
      description: string;
    }[];
    volunteer_experience: {
      organization: string;
      role: string;
      start_date: string;
      end_date: string;
      description: string;
    }[];
    interests: string[];
    references: {
      name: string;
      relationship: string;
      contact_info: string;
    }[];

    skills_score?: number,
    projects_score?: number,
    education_score?: number,
    work_experience_score?: number,
    overall_score?: number
  };
}


export interface FormData {
  full_name: FormDataItem;
    date_of_birth: FormDataItem;
    email: FormDataItem;
    phone_number: FormDataItem;
    residential_address: FormDataItem;
    highest_degree: FormDataItem;
    field_of_study: FormDataItem;
    institution_name: FormDataItem;
    year_of_graduation: FormDataItem;
    years_of_experience: FormDataItem;
    availability: FormDataItem;
    agree_to_declaration: FormDataItem;
}


export interface FormDataItem {
  lable: string;
  value: string | boolean | number;
}