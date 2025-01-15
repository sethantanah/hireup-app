import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  @Input() companyName: string = 'Company Name'; // Default, can be overridden
  @Input() footerLinks: { text: string, url: string }[] = []
}
