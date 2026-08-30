import { Injectable } from '@angular/core';

export interface JobTemplate {
  id: string;
  title: string;
  description: string;
  preview?: string;
  formOnly?: boolean;
  category?: string;
  badge?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TemplatesService {
  templates: JobTemplate[] = [
    {
      id: '1',
      title: 'Classic Corporate',
      description: 'Clean structured layout ideal for enterprise and corporate job openings.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Enterprise',
      badge: 'Popular'
    },
    {
      id: '2',
      title: 'Modern Floating Card',
      description: 'Gradient header with responsive application cards and live section indicators.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Modern',
      badge: 'Featured'
    },
    {
      id: '3',
      title: 'Minimalist Focus',
      description: 'Streamlined distraction-free interface designed to maximize completion rates.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Minimal',
      badge: 'High Conversion'
    },
    {
      id: '4',
      title: 'Enterprise Sidebar Progress',
      description: 'Dual pane design featuring sticky job details and real-time step progress tracking.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Enterprise',
      badge: 'Recommended'
    },
    {
      id: '5',
      title: 'Creative Split Hero',
      description: 'Bold brand hero background, interactive tab bar, and elevated input fields.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Creative',
      badge: 'New'
    },
    {
      id: '6',
      title: 'Compact Embedded Portal',
      description: 'Ultra-sleek high-density form optimized for fast mobile submissions.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Mobile First',
      badge: 'Fast'
    },
    {
      id: '7',
      title: 'Executive Dark Mode',
      description: 'Sleek dark mode layout tailored for senior technology and executive roles.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Executive',
      badge: 'Dark Theme'
    }
  ];

  constructor() {}
}
