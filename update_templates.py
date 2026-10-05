import re

file_path = r'c:\Users\User\Documents\Projects\hse\hireup-app\src\app\pages\job-posts\manager\templates-manager\templates-manager.component.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# For Template 2
# Job Details Sidebar visibility
content = content.replace(
    '<div class="lg:col-span-1" *ngIf="formOnly === false">',
    '<div class="lg:col-span-1" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showJobDescription !== false">'
)
# Add getCornerRadiusClass to cards in Template 2
content = content.replace(
    '<div class="bg-white rounded-xl shadow-md overflow-hidden mb-6">',
    '<div class="bg-white rounded-xl shadow-md overflow-hidden mb-6" [ngClass]="getCornerRadiusClass(\'rounded-xl\')">'
)
content = content.replace(
    '<div class="bg-white rounded-xl shadow-md p-6 sticky top-6">',
    '<div class="bg-white rounded-xl shadow-md p-6 sticky top-6" [ngClass]="getCornerRadiusClass(\'rounded-xl\')">'
)
content = content.replace(
    '<div class="bg-white rounded-xl shadow-md p-6">',
    '<div class="bg-white rounded-xl shadow-md p-6" [ngClass]="getCornerRadiusClass(\'rounded-xl\')">'
)
content = content.replace(
    '<div class="mt-8 bg-white rounded-xl shadow-md p-6 text-center">',
    '<div class="mt-8 bg-white rounded-xl shadow-md p-6 text-center" [ngClass]="getCornerRadiusClass(\'rounded-xl\')">'
)

# For Template 3
content = content.replace(
    '<div class="text-start mb-8" *ngIf="formOnly === false">',
    '<div class="text-start mb-8" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showCompanyDetails !== false">'
)
content = content.replace(
    '<div class="bg-white rounded-lg border border-gray-200 p-6">',
    '<div class="bg-white rounded-lg border border-gray-200 p-6" [ngClass]="getCornerRadiusClass(\'rounded-lg\')">'
)

# For Template 4
content = content.replace(
    '<div class="lg:w-1/3" *ngIf="formOnly === false">',
    '<div class="lg:w-1/3" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showJobDescription !== false">'
)
content = content.replace(
    '<div class="bg-white rounded-lg shadow-sm p-6 sticky top-6">',
    '<div class="bg-white rounded-lg shadow-sm p-6 sticky top-6" [ngClass]="getCornerRadiusClass(\'rounded-lg\')">'
)
content = content.replace(
    '<div class="bg-white rounded-lg shadow-sm p-6">',
    '<div class="bg-white rounded-lg shadow-sm p-6" [ngClass]="getCornerRadiusClass(\'rounded-lg\')">'
)


# For Template 5
content = content.replace(
    '<div class="flex items-center gap-3" *ngIf="formOnly === false">',
    '<div class="flex items-center gap-3" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showCompanyDetails !== false">'
)
content = content.replace(
    '<h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" *ngIf="formOnly === false">',
    '<h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showJobDescription !== false">'
)
content = content.replace(
    '<div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">',
    '<div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6" [ngClass]="getCornerRadiusClass(\'rounded-2xl\')">'
)
content = content.replace(
    '<div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 md:p-8 mb-6 border-t-4 border-t-[var(--primary-color)]">',
    '<div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 md:p-8 mb-6 border-t-4 border-t-[var(--primary-color)]" [ngClass]="getCornerRadiusClass(\'rounded-2xl\')">'
)


# For Template 6
content = content.replace(
    '<div class="p-4 border-b border-slate-800 flex items-center justify-between gap-4 mb-4" *ngIf="formOnly === false">',
    '<div class="p-4 border-b border-slate-800 flex items-center justify-between gap-4 mb-4" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showCompanyDetails !== false">'
)
content = content.replace(
    '<div class="mb-4 p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80" *ngIf="formOnly === false && jobAppData?.job?.description">',
    '<div class="mb-4 p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showJobDescription !== false && jobAppData?.job?.description">'
)

# For Template 7
content = content.replace(
    '<div class="p-6 border-b border-slate-800/80 flex items-center justify-between gap-4 mb-6" *ngIf="formOnly === false">',
    '<div class="p-6 border-b border-slate-800/80 flex items-center justify-between gap-4 mb-6" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showCompanyDetails !== false">'
)
content = content.replace(
    '<div class="mb-6 p-6 bg-slate-900/90 rounded-2xl border border-slate-800" *ngIf="formOnly === false && jobAppData?.job?.description">',
    '<div class="mb-6 p-6 bg-slate-900/90 rounded-2xl border border-slate-800" *ngIf="formOnly === false && jobAppData?.sectionVisibility?.showJobDescription !== false && jobAppData?.job?.description">'
)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating existing templates")
