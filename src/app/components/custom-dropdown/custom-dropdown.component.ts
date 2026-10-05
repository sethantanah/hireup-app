import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-dropdown.component.html',
  styleUrl: './custom-dropdown.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDropdownComponent),
      multi: true
    }
  ]
})
export class CustomDropdownComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() labelKey: string = '';
  @Input() valueKey: string = '';
  @Input() value: any = ''; // can be primitive or object depending on valueKey
  @Input() placeholder: string = 'Select option...';
  @Input() label: string = '';
  @Input() multiple: boolean = false;
  @Input() allowCustom: boolean = false;
  @Input() icon: string = '';
  @Input() dropUp: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  @Output() valueChange = new EventEmitter<any>();

  @HostBinding('class.relative') hostRelative = true;
  @HostBinding('style.zIndex') get hostZIndex() { return this.isOpen ? '999' : 'auto'; }
  @HostBinding('class.block') hostBlock = true;
  @HostBinding('class.w-full') hostWFull = true;

  isOpen: boolean = false;
  searchQuery: string = '';
  customInputValue: string = '';
  showCustomInput: boolean = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(private elementRef: ElementRef) {}

  writeValue(val: any): void {
    if (val !== undefined) {
      this.value = val;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  autoDropUp: boolean = false;
  menuStyle: { [key: string]: string } = {};

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.updatePosition();
      setTimeout(() => this.updatePosition(), 0);
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    if (this.isOpen) {
      this.updatePosition();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isOpen) {
      this.updatePosition();
    }
  }

  updatePosition(): void {
    if (!this.isOpen || !this.elementRef?.nativeElement) return;
    try {
      const triggerEl = this.elementRef.nativeElement.querySelector('.cursor-pointer') || this.elementRef.nativeElement;
      const rect = triggerEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const isUp = this.dropUp || (spaceBelow < 230 && spaceAbove > spaceBelow);
      this.autoDropUp = isUp;

      const width = Math.max(rect.width, 160);
      let left = rect.left;
      if (left + width > viewportWidth - 10) {
        left = Math.max(10, viewportWidth - width - 10);
      }

      if (isUp) {
        this.menuStyle = {
          position: 'fixed',
          bottom: `${Math.max(10, viewportHeight - rect.top + 6)}px`,
          left: `${left}px`,
          width: `${width}px`,
          maxHeight: '260px',
          zIndex: '99999'
        };
      } else {
        this.menuStyle = {
          position: 'fixed',
          top: `${rect.bottom + 6}px`,
          left: `${left}px`,
          width: `${width}px`,
          maxHeight: '260px',
          zIndex: '99999'
        };
      }
    } catch (e) {
      this.menuStyle = { zIndex: '99999' };
    }
  }

  get filteredOptions(): any[] {
    if (!this.options) return [];
    if (!this.searchQuery.trim()) {
      return this.options;
    }
    const q = this.searchQuery.toLowerCase();
    return this.options.filter(opt => this.getOptionLabel(opt).toLowerCase().includes(q));
  }

  get shouldShowSearch(): boolean {
    return (this.options?.length || 0) > 5;
  }

  get selectedValues(): any[] {
    if (this.multiple) {
      if (Array.isArray(this.value)) {
        return this.value;
      }
      return (this.value !== null && this.value !== undefined && this.value !== '') ? [this.value] : [];
    } else {
      return (this.value !== null && this.value !== undefined && this.value !== '') ? [this.value] : [];
    }
  }

  getOptionLabel(optionOrValue: any): string {
    if (optionOrValue === null || optionOrValue === undefined || optionOrValue === '') return '';
    
    let opt = optionOrValue;
    
    // Check if optionOrValue matches an option in options array
    if (this.options && Array.isArray(this.options) && this.options.length > 0) {
      const found = this.options.find(o => this.isEqual(this.getOptionValue(o), optionOrValue) || this.isEqual(o, optionOrValue));
      if (found) {
        opt = found;
      }
    }
    
    if (this.labelKey && typeof opt === 'object' && opt !== null) {
      if (opt[this.labelKey] !== undefined) {
        return String(opt[this.labelKey]);
      }
      return opt.label || opt.name || opt.title || String(opt);
    }
    return String(opt);
  }

  getOptionValue(option: any): any {
    if (this.valueKey && typeof option === 'object' && option !== null && option[this.valueKey] !== undefined) {
      return option[this.valueKey];
    }
    return option;
  }

  isSelected(option: any): boolean {
    if (option === null || option === undefined) return false;
    const optVal = this.getOptionValue(option);
    if (this.multiple) {
      return this.selectedValues.some(v => this.isEqual(v, optVal) || this.isEqual(v, option));
    }
    return this.isEqual(this.value, optVal) || this.isEqual(this.value, option);
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || a === undefined || b === null || b === undefined) return false;
    const aVal = this.getOptionValue(a);
    const bVal = this.getOptionValue(b);
    if (aVal === bVal) return true;
    if (typeof aVal === 'object' && typeof bVal === 'object') {
      if (aVal.id && bVal.id && aVal.id === bVal.id) return true;
      if (aVal.value && bVal.value && aVal.value === bVal.value) return true;
      try {
        return JSON.stringify(aVal) === JSON.stringify(bVal);
      } catch {
        return false;
      }
    }
    return String(aVal) === String(bVal);
  }

  selectOption(option: any): void {
    const optVal = this.getOptionValue(option);
    if (this.multiple) {
      let current = [...this.selectedValues];
      const index = current.findIndex(v => this.isEqual(this.getOptionValue(v), optVal) || this.isEqual(v, optVal));
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(this.valueKey ? optVal : option);
      }
      this.value = current;
      this.onChange(this.value);
      this.onTouched();
      this.valueChange.emit(this.value);
    } else {
      this.value = this.valueKey ? optVal : option;
      this.onChange(this.value);
      this.onTouched();
      this.valueChange.emit(this.value);
      this.isOpen = false;
    }
  }

  removeValue(option: any, event: MouseEvent): void {
    event.stopPropagation();
    const optVal = this.getOptionValue(option);
    if (this.multiple) {
      const current = this.selectedValues.filter(v => (!this.isEqual(this.getOptionValue(v), optVal)) && (!this.isEqual(v, optVal)));
      this.value = current;
      this.onChange(this.value);
      this.onTouched();
      this.valueChange.emit(this.value);
    } else {
      this.value = '';
      this.onChange(this.value);
      this.onTouched();
      this.valueChange.emit(this.value);
    }
  }

  addCustomEntry(): void {
    const val = this.customInputValue.trim();
    if (!val) return;
    
    let entry: any = val;
    if (this.labelKey && this.valueKey) {
        entry = { [this.labelKey]: val, [this.valueKey]: val };
    }
    
    if (!this.options.some(o => this.getOptionValue(o) === this.getOptionValue(entry))) {
      this.options.push(entry);
    }
    
    this.selectOption(entry);
    this.customInputValue = '';
    this.showCustomInput = false;
  }
}
