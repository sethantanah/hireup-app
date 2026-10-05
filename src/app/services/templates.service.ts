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
      title: 'Executive Corporate',
      description: 'Clean structured enterprise layout with company header, navigation, and section pagination.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Enterprise',
      badge: 'Popular'
    },
    {
      id: '2',
      title: 'Enterprise Floating Card',
      description: 'Dual-column layout featuring sticky position overview and visual section progress.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Enterprise',
      badge: 'Featured'
    },
    {
      id: '3',
      title: 'Minimalist Corporate',
      description: 'Streamlined, clutter-free form designed to maximize candidate submission completion.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Minimal',
      badge: 'High Conversion'
    },
    {
      id: '4',
      title: 'Sidebar & Position Brief',
      description: 'Split layout featuring sticky job specifications and section progress tracker.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Enterprise',
      badge: 'Recommended'
    },
    {
      id: '5',
      title: 'Modern Executive Portal',
      description: 'Elevated header hero card with responsive section tabs and clean input styling.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Modern',
      badge: 'New'
    },
    {
      id: '6',
      title: 'Compact Enterprise Form',
      description: 'High-density professional application portal optimized for rapid mobile submission.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Mobile First',
      badge: 'Fast'
    },
    {
      id: '7',
      title: 'Executive Dark Mode',
      description: 'Sleek dark-themed corporate design tailored for tech & leadership roles.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Executive',
      badge: 'Dark Theme'
    },
    {
      id: '8',
      title: 'Professional Corporate Sidebar',
      description: 'Clean split layout with a highly professional sticky sidebar for the company info and job details. Excellent for standalone applications.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Enterprise',
      badge: 'Professional'
    },
    {
      id: '9',
      title: 'Creative Agency Split',
      description: 'A striking two-column layout with a dynamic graphic sidebar and a structured form application area.',
      preview: 'assets/classic-template.jpg',
      formOnly: false,
      category: 'Creative',
      badge: 'Premium'
    }
  ];

  constructor() {}
}
