import { Injectable } from '@angular/core';
export interface JobTemplate {
  id: string;
  title: string;
  description: string;
  preview?: string;
  formOnly?: boolean;
}
@Injectable({
  providedIn: 'root',
})
export class TemplatesService {
  templates: JobTemplate[] = [
    {
      id: '1',
      title: 'Classic',
      description: 'Classic template great for cooporate hiring.',
      preview: 'assets/classic-template.jpg',
      formOnly: false
    },
    {
      id: '2',
      title: 'Classic - Grid',
      description: 'Classic template great for cooporate hiring.',
      preview: 'assets/classic-template.jpg',
      formOnly: false
    },
    {
      id: '3',
      title: 'Classic - Grid 2',
      description: 'Classic template great for cooporate hiring.',
      preview: 'assets/classic-template.jpg',
      formOnly: false
    },
  ];
  constructor() {}
}
