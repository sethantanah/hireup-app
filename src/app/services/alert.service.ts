import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AlertConfig } from '../models/models.models';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private alertSubject = new BehaviorSubject<AlertConfig | null>(null);
  alert$ = this.alertSubject.asObservable();

  showAlert(config: AlertConfig): void {
    this.alertSubject.next({
      autoClose: true,
      duration: 5000,
      ...config,
    });

    // Set up auto-close if enabled
    if (config.autoClose !== false) {
      const duration = config.duration || 5000;
      setTimeout(() => {
        // Only clear if this is still the current alert
        if (
          this.alertSubject.value &&
          this.alertSubject.value.message === config.message &&
          this.alertSubject.value.type === config.type
        ) {
          this.clearAlert();
        }
      }, duration);
    }
  }

  showSuccess(message: string, duration = 5000): void {
    this.showAlert({
      type: 'success',
      message,
      duration,
    });

    // Set up auto-close if enabled
    setTimeout(() => {
      // Only clear if this is still the current alert
      this.clearAlert();
    }, duration);
  }

  showDanger(message: string, duration = 5000): void {
    this.showAlert({
      type: 'danger',
      message,
      duration,
    });

    // Set up auto-close if enabled
    setTimeout(() => {
      // Only clear if this is still the current alert
      this.clearAlert();
    }, duration);
  }

  clearAlert(): void {
    this.alertSubject.next(null);
  }
}
