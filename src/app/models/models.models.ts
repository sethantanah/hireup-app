export type AlertType = 'success' | 'danger';
export interface AlertConfig {
    type: AlertType;
    message: string;
    autoClose?: boolean;
    duration?: number;
  }