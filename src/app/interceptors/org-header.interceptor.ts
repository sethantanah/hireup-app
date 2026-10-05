import { HttpInterceptorFn } from '@angular/common/http';

export const orgHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  let orgId = '';
  try {
    const saved = localStorage.getItem('current_organization') || localStorage.getItem('ACTIVE_ORG');
    if (saved) {
      const parsed = JSON.parse(saved);
      orgId = parsed?.id || parsed?.organization_id || '';
    }
  } catch (e) {}

  let headers = req.headers;
  if (orgId && !headers.has('X-Organization-ID')) {
    headers = headers.set('X-Organization-ID', orgId);
  }

  const cloned = req.clone({ headers });
  return next(cloned);
};
