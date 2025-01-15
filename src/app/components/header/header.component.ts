import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Input() logoUrl: string = 'assets/logo.png'; // Default logo, can be overridden
  @Input() navLinks: { text: string, url: string }[] = [];
}
