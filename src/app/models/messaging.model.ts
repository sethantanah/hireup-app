export interface EmailData {
  html_template: string;
  text_content: string;
  subject: string;
  short_listed: string;
  variables: any;
}

export interface EmailDataAPISend {
  template_data: EmailData;
  short_listed: string;
  batch_size: number
}
