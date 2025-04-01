export interface EmailData {
  html_template: string;
  text_content: string;
  subject: string;
  short_listed: boolean;
  variables: any;
}