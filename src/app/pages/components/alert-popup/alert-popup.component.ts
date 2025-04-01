import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { AlertType } from '../../../models/models.models';

@Component({
  selector: 'app-alert-popup',
  imports: [CommonModule],
  templateUrl: './alert-popup.component.html',
  styleUrl: './alert-popup.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)' }),
        animate('300ms ease-out', style({ transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(-100%)' })),
      ]),
    ]),
  ],
})
export class AlertPopupComponent implements OnInit, OnDestroy {
  @Input() show = false;
  @Input() type: AlertType = 'success';
  @Input() message = '';
  @Input() autoClose = true;
  @Input() duration = 5000; // 5 seconds
  @Output() closed = new EventEmitter<void>();

  private timeoutId: any;

  ngOnInit(): void {
    if (this.autoClose && this.show) {
      this.setAutoCloseTimeout();
    }
  }

  ngOnDestroy(): void {
    this.clearAutoCloseTimeout();
  }

  close(): void {
    this.show = false;
    this.closed.emit();
    this.clearAutoCloseTimeout();
  }

  private setAutoCloseTimeout(): void {
    this.clearAutoCloseTimeout();
    if (this.autoClose) {
      this.timeoutId = setTimeout(() => {
        this.close();
      }, this.duration);
    }
  }

  private clearAutoCloseTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
