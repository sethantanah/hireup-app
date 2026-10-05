export type AlertType = 'success' | 'danger' | 'error' | 'warning' | 'info';
export interface AlertConfig {
    type: AlertType;
    message: string;
    autoClose?: boolean;
    duration?: number;
  }