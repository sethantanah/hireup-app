import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface MarkdownRule {
  pattern: RegExp;
  replacement: string;
}

@Injectable({
  providedIn: 'root',
})
export class FormattingService {
  private rules: MarkdownRule[] = [
    // Headers
    {
      pattern: /^# (.*$)/gm,
      replacement: '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>',
    },
    {
      pattern: /^## (.*$)/gm,
      replacement: '<h2 class="text-2xl font-bold mt-5 mb-3">$1</h2>',
    },
    {
      pattern: /^### (.*$)/gm,
      replacement: '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>',
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
      pattern: /^(- .*$)/gm,
      replacement: '<li class="list-disc ml-6">$1</li>',
    },
    {
      pattern: /(<li class="list-disc ml-6">- (.*?)<\/li>)/g,
      replacement: '<li class="list-disc ml-6">$2</li>',
    },
    {
      pattern: /(<li class="list-disc ml-6">.*<\/li>)+/g,
      replacement: '<ul class="space-y-2 my-2">$&</ul>',
    },

    // Links
    {
      pattern: /\[(.*?)\]\((.*?)\)/g,
      replacement:
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>',
    },

    // Code blocks
    {
      pattern: /```([\s\S]*?)```/g,
      replacement:
        '<pre class="bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto"><code class="font-mono text-sm">$1</code></pre>',
    },
    {
      pattern: /`(.*?)`/g,
      replacement:
        '<code class="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-sm">$1</code>',
    },

    // Blockquotes
    {
      pattern: /^> (.*$)/gm,
      replacement:
        '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-700">$1</blockquote>',
    },

    // Line breaks
    {
      pattern: /\n/g,
      replacement: '<br>',
    },
  ];
  constructor(private sanitizer: DomSanitizer) {}

  parseMarkdown(markdown: string): SafeHtml {
    let html = markdown;
    
    this.rules.forEach(rule => {
      html = html.replace(rule.pattern, rule.replacement);
    });

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
