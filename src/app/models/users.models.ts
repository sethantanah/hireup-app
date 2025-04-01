export interface UserData {
  id: string;
  email: string;
  password: string;
  full_name: string;
  logo_url?: string;
  company_name: string;
  position_in_company: string;
}

export interface UserReq {
  email: string;
  password: string;
  full_name: string;
  logo_url?: string;
  company_name: string;
  position_in_company: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// In a separate file like error-messages.ts
export const ERROR_MESSAGES = {
  default: 'Failed to sign up. Please try again.',
  network: 'Network error. Please check your connection.',
  http: {
    400: 'Invalid data. Please check your inputs and try again.',
    401: 'Authentication failed. Please check your credentials.',
    403: 'You are not authorized to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This email/username is already taken.',
    500: 'A server error occurred. Please try again later.',
  },
  getMessage: function (err: any): string {
    if (err.message?.includes('Network Error')) {
      return this.network;
    }

    if (err.status && this.http[err.status as keyof typeof this.http]) {
      return this.http[err.status as keyof typeof this.http];
    }

    return err.error?.message || err.message || this.default;
  },
};

export const SIGNIN_ERRORS = {
  default: 'Failed to sign in. Please try again.',
  network: 'Network error. Please check your connection.',
  http: {
    400: 'Invalid email or password format.',
    401: 'Invalid credentials. Please check your email and password.',
    403: 'Account not verified. Please check your email.',
    404: 'Account not found. Please sign up first.',
    429: 'Too many attempts. Please try again later.',
    500: 'Server error. Please try again later.',
  },
  getMessage(err: any): string {
    if (err.message?.includes('Network Error')) {
      return this.network;
    }

    // Handle specific error codes
    if (err.status) {
      return (
        this.http[err.status as keyof typeof this.http] ||
        err.error?.message ||
        this.default
      );
    }

    // Handle Firebase/Auth0/other auth provider errors
    if (err.code) {
      return (
        this.authProviderErrors[
          err.code as keyof typeof this.authProviderErrors
        ] || this.default
      );
    }

    return err.message || this.default;
  },

  // Optional: Platform-specific auth errors (Firebase, Auth0, etc.)
  authProviderErrors: {
    // Firebase examples
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Account temporarily locked.',

    // Auth0 examples
    invalid_user_password: 'Invalid credentials',
    unauthorized: 'Login required',
  },
};
