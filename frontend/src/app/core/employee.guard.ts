import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './services/session.service';

export const employeeGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  const role = (sessionService.getRole() ?? '').toUpperCase();
  if (role === 'ADMIN') {
    return router.createUrlTree(['/admin/dashboard']);
  }

  return true;
};