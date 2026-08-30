import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-custom-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-dropdown.component.html',
  styleUrl: './custom-dropdown.component.scss'
})
export class CustomDropdownComponent {
  @Input() options: string[] = [];
  @Input() value: any = ''; // string or string[]
  @Input() placeholder: string = 'Select option...';
  @Input() label: string = '';
  @Input() multiple: boolean = false;
  @Input() allowCustom: boolean = false;
  @Input() icon: string = '';

  @Output() valueChange = new EventEmitter<any>();

  @HostBinding('class.relative') hostRelative = true;
  @HostBinding('class.z-40') get isZIndexActive() { return this.isOpen; }
  @HostBinding('class.block') hostBlock = true;
  @HostBinding('class.w-full') hostWFull = true;

  isOpen: boolean = false;
  searchQuery: string = '';
  customInputValue: string = '';
  showCustomInput: boolean = false;

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
    }
  }

  get filteredOptions(): string[] {
    if (!this.options) return [];
    if (!this.searchQuery.trim()) {
      return this.options;
    }
    const q = this.searchQuery.toLowerCase();
    return this.options.filter(opt => opt.toLowerCase().includes(q));
  }

  get shouldShowSearch(): boolean {
    return (this.options?.length || 0) > 5;
  }

  get selectedValues(): string[] {
    if (this.multiple) {
      if (Array.isArray(this.value)) {
        return this.value;
      }
      return this.value ? [this.value] : [];
    } else {
      return this.value ? [this.value] : [];
    }
  }

  isSelected(option: string): boolean {
    if (this.multiple) {
      return this.selectedValues.includes(option);
    }
    return this.value === option;
  }

  selectOption(option: string): void {
    if (this.multiple) {
      let current = [...this.selectedValues];
      if (current.includes(option)) {
        current = current.filter(item => item !== option);
      } else {
        current.push(option);
      }
      this.value = current;
      this.valueChange.emit(this.value);
    } else {
      this.value = option;
      this.valueChange.emit(this.value);
      this.isOpen = false;
    }
  }

  removeValue(option: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.multiple) {
      const current = this.selectedValues.filter(item => item !== option);
      this.value = current;
      this.valueChange.emit(this.value);
    } else {
      this.value = '';
      this.valueChange.emit(this.value);
    }
  }

  addCustomEntry(): void {
    const val = this.customInputValue.trim();
    if (!val) return;
    
    if (!this.options.includes(val)) {
      this.options.push(val);
    }
    
    this.selectOption(val);
    this.customInputValue = '';
    this.showCustomInput = false;
  }
}
