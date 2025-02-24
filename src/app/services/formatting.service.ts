import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavLink } from '../models/jobpost.model';

interface MarkdownRule {
  pattern: RegExp;
  replacement: string;
}

interface FormatNavLink {
  formattedUrl: string;
  type: string;
  url: string;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class FormattingService {
  private rules: MarkdownRule[] = [
    // Headers
    {
      pattern: /^# (.*$)/gm,
      replacement: '<h1 class="text-3xl font-bold mb-6">$1</h1>',
    },
    {
      pattern: /^## (.*$)/gm,
      replacement: '<h2 class="text-2xl font-bold mb-4">$1</h2>',
    },
    {
      pattern: /^### (.*$)/gm,
      replacement: '<h3 class="text-xl font-bold mb-3">$1</h3>',
    },

    // Text styling
    {
      pattern: /\*\*(.*?)\*\*/g,
      replacement: '<strong class="font-bold">$1</strong>',
    },
    {
      pattern: /\*(.*?)\*/g,
      replacement: '<em class="italic">$1</em>',
    },

    // Lists
    {
      pattern: /^[\s]*[-*+] (.*?)$/gm,
      replacement:
        '<li class="flex flex-row items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-500 flex-shrink-0"></span>$1</li>',
    },
    {
      pattern: /(<li.*?>.*?<\/li>[\n]*)+/g,
      replacement: '<ul class="space-y-1.5 my-4">$&</ul>',
    },

    // Numbered Lists
    {
      pattern: /^[\s]*(\d+\.) (.*?)$/gm,
      replacement:
        '<li class="flex items-start gap-2"><span class="font-medium text-slate-600">$1</span>$2</li>',
    },
    {
      pattern: /(<li.*?\d+\..*?<\/li>[\n]*)+/g,
      replacement: '<ol class="space-y-1.5 my-4 list-none">$&</ol>',
    },

    // Links
    {
      pattern: /\[(.*?)\]\((.*?)\)/g,
      replacement:
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>',
    },

    // Images
    {
      pattern: /!\[(.*?)\]\((.*?)\)/g,
      replacement:
        '<img src="$2" alt="$1" class="rounded-lg max-w-full my-4 border border-slate-200">',
    },

    // Code blocks
    {
      pattern: /```([\s\S]*?)```/g,
      replacement:
        '<pre class="bg-slate-50 p-4 rounded-lg my-4 overflow-x-auto border border-slate-200"><code class="font-mono text-sm">$1</code></pre>',
    },
    {
      pattern: /`(.*?)`/g,
      replacement:
        '<code class="bg-slate-50 px-1.5 py-0.5 rounded font-mono text-sm border border-slate-200">$1</code>',
    },

    // Blockquotes
    {
      pattern: /^> (.*$)/gm,
      replacement:
        '<blockquote class="border-l-4 border-slate-300 pl-4 py-1 my-4 text-slate-600">$1</blockquote>',
    },

    // Horizontal Rule
    {
      pattern: /^---$/gm,
      replacement: '<hr class="my-8 border-t border-slate-200">',
    },

    // Paragraphs
    {
      pattern: /^(?!<[a-z])(.*$)/gm,
      replacement: '<p class="mb-4">$1</p>',
    },

    // Clean up empty paragraphs
    {
      pattern: /<p>\s*<\/p>/g,
      replacement: '',
    },
  ];

  constructor(private sanitizer: DomSanitizer) {}

  parseMarkdown(markdown: string): SafeHtml {
    let html = markdown;

    // Pre-process to handle line breaks
    html = html.replace(/\r\n|\r|\n/g, '\n');

    this.rules.forEach((rule) => {
      html = html.replace(rule.pattern, rule.replacement);
    });

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }


  cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  processLinks(links: NavLink[]): FormatNavLink[] {
    // Phone regex matches common formats including international
    const phoneRegex =
      /^(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{0,4}$/;
    // Email regex for basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return links.map((link) => {
      const trimmedUrl = link.url.trim();

      // Check if it's a phone number
      if (phoneRegex.test(trimmedUrl)) {
        return {
          ...link,
          type: 'phone',
          formattedUrl: `tel:${this.cleanPhoneNumber(trimmedUrl)}`,
        };
      }

      // Check if it's an email
      if (emailRegex.test(trimmedUrl)) {
        return {
          ...link,
          type: 'email',
          formattedUrl: `mailto:${trimmedUrl}`,
        };
      }

      // Handle URLs
      return {
        ...link,
        type: 'url',
        formattedUrl:
          trimmedUrl.startsWith('http://') ||
          trimmedUrl.startsWith('https://')
            ? trimmedUrl
            : `https://${trimmedUrl}`,
      };
    });
  }
}
