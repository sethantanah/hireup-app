import re

file_path = r'c:\Users\User\Documents\Projects\hse\hireup-app\src\app\pages\job-posts\manager\templates-manager\templates-manager.component.html'

template_8_9 = """
<!-- Template 8: Professional Corporate Sidebar -->
<div *ngIf="templateId === '8' && jobAppData">
  <div class="min-h-screen bg-slate-50 flex" [ngStyle]="{
      '--primary-color': jobAppData?.colorScheme?.primary || '#1e293b',
      '--secondary-color': jobAppData?.colorScheme?.secondary || '#334155'
    }">
    
    <!-- Left Sidebar for Company & Job Details -->
    <div class="hidden lg:flex flex-col w-1/3 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-y-auto" *ngIf="formOnly === false">
      <div class="p-8 space-y-8">
        <!-- Brand -->
        <div class="flex items-center gap-4" *ngIf="jobAppData?.sectionVisibility?.showCompanyDetails !== false">
          <img *ngIf="jobAppData.company.logoUrl" [src]="jobAppData.company.logoUrl" alt="Logo" class="h-12 w-auto object-contain" />
          <h2 class="text-xl font-bold text-slate-800" *ngIf="!jobAppData.company.logoUrl">{{ jobAppData.company.name }}</h2>
        </div>
        
        <!-- Job Details -->
        <div *ngIf="jobAppData?.sectionVisibility?.showJobDescription !== false">
          <h1 class="text-3xl font-extrabold text-slate-900 leading-tight">{{ jobAppData.job.title }}</h1>
          <div class="mt-6 text-sm text-slate-600 prose prose-slate" [innerHTML]="formattingService.parseMarkdown(jobAppData.job.description)"></div>
        </div>
        
        <!-- Footer in sidebar -->
        <div class="mt-12 pt-8 border-t border-slate-100">
          <p class="text-xs text-slate-500">{{ jobAppData.footer.copyrightText }}</p>
          <nav class="mt-4 flex flex-col gap-2">
            <a *ngFor="let link of formattingService.processLinks(jobAppData.footer.links)" [href]="link.formattedUrl" target="_blank"
               class="text-xs text-[var(--primary-color)] hover:underline font-medium">
              {{ link.text }}
            </a>
          </nav>
        </div>
      </div>
    </div>
    
    <!-- Main Application Area -->
    <div class="w-full lg:w-2/3 p-6 sm:p-12 lg:p-20 overflow-y-auto">
      
      <!-- Mobile Header (Visible only on mobile/tablet or if formOnly is true) -->
      <div class="lg:hidden mb-8 space-y-4" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showCompanyDetails !== false">
        <div class="flex items-center gap-3">
          <img *ngIf="jobAppData.company.logoUrl" [src]="jobAppData.company.logoUrl" alt="Logo" class="h-10 w-auto" />
          <h2 class="text-lg font-bold text-slate-800" *ngIf="!jobAppData.company.logoUrl">{{ jobAppData.company.name }}</h2>
        </div>
        <h1 class="text-2xl font-bold text-slate-900" *ngIf="jobAppData?.sectionVisibility?.showJobDescription !== false">{{ jobAppData.job.title }}</h1>
      </div>

      <div class="max-w-2xl mx-auto w-full">
        <!-- Deadline Check -->
        <div *ngIf="deadlinePassed" class="bg-rose-50 rounded-xl p-6 border border-rose-200 text-center mb-8">
          <h3 class="text-lg font-bold text-rose-600">Deadline Ended</h3>
          <p class="text-sm text-rose-500">The application deadline has passed.</p>
        </div>

        <div *ngIf="!deadlinePassed" class="bg-white p-8 sm:p-10 shadow-sm border border-slate-200" [ngClass]="getCornerRadiusClass('rounded-2xl')">
          <h3 class="text-xl font-bold text-slate-800 mb-2">{{ jobAppData.applySection.title }}</h3>
          <p class="text-sm text-slate-500 mb-8">{{ jobAppData.applySection.instructions }}</p>

          <!-- Section Tabs -->
          <div *ngIf="jobAppData.sections.length > 1" class="flex flex-wrap gap-2 mb-8">
            <button *ngFor="let sec of jobAppData.sections; let i = index" (click)="setCurrentSection(sec)"
                    [class]="sec === activeSection ? 'bg-[var(--primary-color)] text-white font-semibold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                    class="px-4 py-2 text-xs transition-all" [ngClass]="getCornerRadiusClass('rounded-lg')">
              {{ i + 1 }}. {{ sec }}
            </button>
          </div>

          <form *ngIf="form" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
            <div *ngFor="let field of jobAppData.formData.fields" [hidden]="field.section !== activeSection" class="space-y-2">
              <label [for]="field.key" class="block text-sm font-semibold text-slate-700">
                {{ field.label }} <span *ngIf="field.required" class="text-rose-500">*</span>
              </label>
              <p *ngIf="field.instructions" class="text-xs text-slate-500" [innerHTML]="formattingService.parseMarkdown(field.instructions)"></p>

              <!-- Inputs -->
              <input *ngIf="['text', 'email', 'tel', 'number', 'date'].includes(field.type || 'text')"
                     [type]="field.type" [id]="field.key" [(ngModel)]="formValues[field.key]" [ngModelOptions]="{standalone: true}" (blur)="validateField(field)"
                     [ngClass]="getCornerRadiusClass('rounded-xl')"
                     class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all" />

              <textarea *ngIf="field.type === 'textarea' || field.type === 'text-area'" [id]="field.key" [(ngModel)]="formValues[field.key]" [ngModelOptions]="{standalone: true}" (blur)="validateField(field)" rows="4"
                        [ngClass]="getCornerRadiusClass('rounded-xl')"
                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"></textarea>

              <div *ngIf="field.type === 'checkbox'" class="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200" [ngClass]="getCornerRadiusClass('rounded-xl')">
                <input type="checkbox" [id]="field.key" [(ngModel)]="formValues[field.key]" [ngModelOptions]="{standalone: true}" (change)="validateField(field)" class="w-4 h-4 text-[var(--primary-color)] rounded border-slate-300" />
                <label [for]="field.key" class="text-sm font-medium text-slate-700 cursor-pointer">{{ field.label }}</label>
              </div>

              <!-- Selects -->
              <div *ngIf="field.type === 'select' && field.allowMultiSelect" class="space-y-3 p-4 bg-slate-50 border border-slate-200" [ngClass]="getCornerRadiusClass('rounded-xl')">
                <div *ngFor="let option of field.options" class="flex items-center space-x-3">
                  <input type="checkbox" [id]="field.key + '_' + option" [checked]="isOptionSelected(field.key, option)" (change)="toggleMultiSelectOption(field.key, option); validateField(field)"
                         class="h-4 w-4 text-[var(--primary-color)] border-slate-300 rounded" />
                  <label [for]="field.key + '_' + option" class="text-sm text-slate-700 cursor-pointer">{{ option }}</label>
                </div>
              </div>
              
              <div *ngIf="field.type === 'select' && !field.allowMultiSelect">
                <select [id]="field.key" [(ngModel)]="formValues[field.key]" [ngModelOptions]="{standalone: true}" (change)="validateField(field)"
                        [ngClass]="getCornerRadiusClass('rounded-xl')"
                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)]">
                  <option value="">Select Option</option>
                  <option *ngFor="let opt of field.options" [value]="opt">{{ opt }}</option>
                  <option *ngIf="field.allowOther" value="Other">Other</option>
                </select>
              </div>

              <!-- File Input -->
              <input *ngIf="field.type === 'file'" type="file" [id]="field.key" [accept]="field.acceptedTypes" (change)="onFileChange($event, field.key)"
                     [ngClass]="getCornerRadiusClass('rounded-xl')"
                     class="w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:border-0 file:text-sm file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 transition-colors" />

              <p *ngIf="errors[field.key]" class="text-xs text-rose-500 font-bold mt-1">{{ errors[field.key] }}</p>
            </div>

            <!-- Declaration Checkbox -->
            <div *ngIf="jobAppData.applySection.declaration && jobAppData.sections.indexOf(activeSection) >= jobAppData.sections.length - 1" class="mt-6 p-4 bg-slate-50 border border-slate-200" [ngClass]="getCornerRadiusClass('rounded-xl')">
              <label class="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" [(ngModel)]="formValues['agreeToDeclaration']" [ngModelOptions]="{standalone: true}" id="acceptDeclaration"
                       class="mt-0.5 h-4 w-4 text-[var(--primary-color)] border-slate-300 rounded" />
                <span class="text-sm text-slate-700 leading-relaxed">{{ jobAppData.applySection.declaration }}</span>
              </label>
            </div>

            <div class="flex justify-between items-center pt-8 border-t border-slate-100">
              <button *ngIf="jobAppData.sections.length > 1" type="button" (click)="goToPreviousSection()" [disabled]="jobAppData.sections.indexOf(activeSection) === 0"
                      class="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all disabled:opacity-40" [ngClass]="getCornerRadiusClass('rounded-xl')">
                Previous
              </button>
              <button *ngIf="jobAppData.sections.indexOf(activeSection) < jobAppData.sections.length - 1" type="button" (click)="goToNextSection()"
                      class="px-8 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-white text-sm font-semibold transition-all ml-auto" [ngClass]="getCornerRadiusClass('rounded-xl')">
                Next Step
              </button>
              <button *ngIf="jobAppData.sections.indexOf(activeSection) >= jobAppData.sections.length - 1" type="submit" [disabled]="form.invalid || isSubmitting"
                      class="px-8 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-white text-sm font-semibold transition-all ml-auto" [ngClass]="getCornerRadiusClass('rounded-xl')">
                <span *ngIf="!isSubmitting">Submit Application</span>
                <span *ngIf="isSubmitting" class="flex items-center justify-center">
                  <svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- End Template 8 -->

<!-- Template 9: Creative Agency Split -->
<div *ngIf="templateId === '9' && jobAppData">
  <div class="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans text-slate-100" [ngStyle]="{
      '--primary-color': jobAppData?.colorScheme?.primary || '#14b8a6',
      '--secondary-color': jobAppData?.colorScheme?.secondary || '#0f766e'
    }">
    
    <!-- Graphic Sidebar (Takes full height, fixed width on desktop) -->
    <div class="w-full md:w-[40%] lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col p-8 sm:p-12" *ngIf="formOnly === false">
      <!-- Abstract Background Graphic -->
      <div class="absolute inset-0 opacity-20 pointer-events-none">
        <div class="absolute top-0 -left-1/4 w-96 h-96 bg-[var(--primary-color)] rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
        <div class="absolute top-1/2 -right-1/4 w-96 h-96 bg-[var(--secondary-color)] rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      <div class="relative z-10 flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
        <div *ngIf="jobAppData?.sectionVisibility?.showCompanyDetails !== false" class="mb-10">
          <img *ngIf="jobAppData.company.logoUrl" [src]="jobAppData.company.logoUrl" alt="Logo" class="h-14 w-auto mb-6 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10" />
          <h2 class="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase" *ngIf="!jobAppData.company.logoUrl">{{ jobAppData.company.name }}</h2>
        </div>
        
        <div *ngIf="jobAppData?.sectionVisibility?.showJobDescription !== false">
          <h1 class="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">{{ jobAppData.job.title }}</h1>
          
          <div class="mt-8 text-slate-300 text-sm sm:text-base leading-relaxed prose prose-invert max-w-none" [innerHTML]="formattingService.parseMarkdown(jobAppData.job.description)"></div>
        </div>
      </div>
    </div>
    
    <!-- Form Area -->
    <div class="w-full md:w-[60%] lg:w-[55%] bg-white text-slate-900 overflow-y-auto p-6 sm:p-12 lg:p-16 flex flex-col">
      <div class="max-w-2xl w-full mx-auto my-auto">
        
        <div *ngIf="deadlinePassed" class="bg-rose-50 border border-rose-200 p-8 text-center" [ngClass]="getCornerRadiusClass('rounded-2xl')">
          <h3 class="text-xl font-black text-rose-600 uppercase tracking-wide">Deadline Ended</h3>
          <p class="text-rose-500 mt-2 font-medium">This application is no longer accepting submissions.</p>
        </div>

        <div *ngIf="!deadlinePassed">
          <div class="mb-10">
            <h3 class="text-3xl font-black text-slate-900 tracking-tight">{{ jobAppData.applySection.title }}</h3>
            <p class="text-slate-500 mt-3 text-lg">{{ jobAppData.applySection.instructions }}</p>
          </div>

          <!-- Section Indicators -->
          <div *ngIf="jobAppData.sections.length > 1" class="flex gap-2 mb-10 overflow-x-auto pb-2">
            <button *ngFor="let sec of jobAppData.sections; let i = index" (click)="setCurrentSection(sec)"
                    [class]="sec === activeSection ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-slate-200 text-slate-400 hover:border-slate-300'"
                    class="px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors">
              {{ i + 1 }}. {{ sec }}
            </button>
          </div>

          <form *ngIf="form" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-8">
            <div *ngFor="let field of jobAppData.formData.fields" [hidden]="field.section !== activeSection" class="space-y-2">
              <label [for]="field.key" class="block text-sm font-bold text-slate-800 uppercase tracking-wide">
                {{ field.label }} <span *ngIf="field.required" class="text-rose-500">*</span>
              </label>
              <p *ngIf="field.instructions" class="text-sm text-slate-500" [innerHTML]="formattingService.parseMarkdown(field.instructions)"></p>

              <!-- Inputs -->
              <input *ngIf="['text', 'email', 'tel', 'number', 'date'].includes(field.type || 'text')"
                     [type]="field.type" [id]="field.key" [(ngModel)]="formValues[field.key]" [ngModelOptions]="{standalone: true}" (blur)="validateField(field)"
                     [ngClass]="getCornerRadiusClass('rounded-xl')"
                     class="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 text-base font-medium focus:outline-none focus:border-[var(--primary-color)] focus:bg-white transition-all shadow-sm" />

              <textarea *ngIf="field.type === 'textarea' || field.type === 'text-area'" [id]="field.key" [(ngModel)]="formValues[field.key]" [ngModelOptions]="{standalone: true}" (blur)="validateField(field)" rows="4"
                        [ngClass]="getCornerRadiusClass('rounded-xl')"
                        class="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 text-base font-medium focus:outline-none focus:border-[var(--primary-color)] focus:bg-white transition-all shadow-sm"></textarea>

              <!-- Checkbox -->
              <div *ngIf="field.type === 'checkbox'" class="flex items-center gap-4 p-4 bg-slate-50 border-2 border-slate-100" [ngClass]="getCornerRadiusClass('rounded-xl')">
                <input type="checkbox" [id]="field.key" [(ngModel)]="formValues[field.key]" [ngModelOptions]="{standalone: true}" (change)="validateField(field)" class="w-5 h-5 text-[var(--primary-color)] rounded border-slate-300" />
                <label [for]="field.key" class="text-base font-medium text-slate-700 cursor-pointer select-none">{{ field.label }}</label>
              </div>

              <!-- Select -->
              <div *ngIf="field.type === 'select' && field.allowMultiSelect" class="space-y-3 p-5 bg-slate-50 border-2 border-slate-100" [ngClass]="getCornerRadiusClass('rounded-xl')">
                <div *ngFor="let option of field.options" class="flex items-center space-x-3">
                  <input type="checkbox" [id]="field.key + '_' + option" [checked]="isOptionSelected(field.key, option)" (change)="toggleMultiSelectOption(field.key, option); validateField(field)"
                         class="h-5 w-5 text-[var(--primary-color)] border-slate-300 rounded" />
                  <label [for]="field.key + '_' + option" class="text-base font-medium text-slate-700 cursor-pointer">{{ option }}</label>
                </div>
              </div>

              <div *ngIf="field.type === 'select' && !field.allowMultiSelect">
                <select [id]="field.key" [(ngModel)]="formValues[field.key]" [ngModelOptions]="{standalone: true}" (change)="validateField(field)"
                        [ngClass]="getCornerRadiusClass('rounded-xl')"
                        class="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 text-base font-medium focus:outline-none focus:border-[var(--primary-color)] focus:bg-white transition-all shadow-sm">
                  <option value="">Select Option</option>
                  <option *ngFor="let opt of field.options" [value]="opt">{{ opt }}</option>
                  <option *ngIf="field.allowOther" value="Other">Other</option>
                </select>
              </div>

              <input *ngIf="field.type === 'file'" type="file" [id]="field.key" [accept]="field.acceptedTypes" (change)="onFileChange($event, field.key)"
                     [ngClass]="getCornerRadiusClass('rounded-xl')"
                     class="w-full text-base font-medium text-slate-600 file:mr-4 file:py-3 file:px-6 file:border-0 file:text-sm file:font-black file:uppercase file:tracking-wider file:bg-slate-900 file:text-white hover:file:bg-slate-800 transition-colors bg-slate-50 border-2 border-slate-100 p-2" />

              <p *ngIf="errors[field.key]" class="text-sm text-rose-500 font-bold mt-2">{{ errors[field.key] }}</p>
            </div>

            <!-- Declaration -->
            <div *ngIf="jobAppData.applySection.declaration && jobAppData.sections.indexOf(activeSection) >= jobAppData.sections.length - 1" class="mt-8 p-5 bg-slate-50 border-2 border-slate-100" [ngClass]="getCornerRadiusClass('rounded-xl')">
              <label class="flex items-start space-x-4 cursor-pointer">
                <input type="checkbox" [(ngModel)]="formValues['agreeToDeclaration']" [ngModelOptions]="{standalone: true}" id="acceptDeclaration"
                       class="mt-1 h-5 w-5 text-[var(--primary-color)] border-slate-300 rounded" />
                <span class="text-base text-slate-700 font-medium leading-relaxed">{{ jobAppData.applySection.declaration }}</span>
              </label>
            </div>

            <!-- Actions -->
            <div class="flex justify-between items-center pt-10 border-t-2 border-slate-100">
              <button *ngIf="jobAppData.sections.length > 1" type="button" (click)="goToPreviousSection()" [disabled]="jobAppData.sections.indexOf(activeSection) === 0"
                      class="px-8 py-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-black uppercase tracking-wider transition-all disabled:opacity-40" [ngClass]="getCornerRadiusClass('rounded-xl')">
                Previous
              </button>
              <button *ngIf="jobAppData.sections.indexOf(activeSection) < jobAppData.sections.length - 1" type="button" (click)="goToNextSection()"
                      class="px-10 py-4 bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-white text-sm font-black uppercase tracking-wider transition-all shadow-xl shadow-[var(--primary-color)]/20 ml-auto" [ngClass]="getCornerRadiusClass('rounded-xl')">
                Next Step
              </button>
              <button *ngIf="jobAppData.sections.indexOf(activeSection) >= jobAppData.sections.length - 1" type="submit" [disabled]="form.invalid || isSubmitting"
                      class="px-10 py-4 bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] text-white text-sm font-black uppercase tracking-wider transition-all shadow-xl shadow-[var(--primary-color)]/20 ml-auto" [ngClass]="getCornerRadiusClass('rounded-xl')">
                <span *ngIf="!isSubmitting">Submit Form</span>
                <span *ngIf="isSubmitting" class="flex items-center justify-center">
                  <svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- End Template 9 -->
"""

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("<!-- Submission Popover Modal -->", template_8_9 + "\n<!-- Submission Popover Modal -->")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done appending template 8 and 9")
