import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appPreventScreenShot]',
})
export class PreventScreenShotDirective {
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'PrintScreen') {
      event.preventDefault();
      alert('Screenshots are not allowed!');
      // You can also blur the screen or take other actions here
    }
  }
}
