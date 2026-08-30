import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('USER');

  if (token || user) {
    return true;
  }

  router.navigate(['/auth/signin']);
  return false;
};
