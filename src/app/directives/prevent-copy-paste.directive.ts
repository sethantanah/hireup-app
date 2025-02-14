import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appPreventCopyPaste]',
})
export class PreventCopyPasteDirective {
  // Listen for the copy event and prevent it
  @HostListener('copy', ['$event'])
  onCopy(event: ClipboardEvent) {
    event.preventDefault();
    console.log('Copying is not allowed!');
  }

  // Listen for the cut event and prevent it
  @HostListener('cut', ['$event'])
  onCut(event: ClipboardEvent) {
    event.preventDefault();
    console.log('Cutting is not allowed!');
  }

  // Listen for the paste event and prevent it
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    console.log('Pasting is not allowed!');
  }
}
