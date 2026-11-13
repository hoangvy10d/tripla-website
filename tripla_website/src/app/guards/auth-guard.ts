import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  auth.openAuthModal({
    redirectUrl: state.url || '/profile',
    notice: 'Vui lòng đăng nhập để truy cập trang cá nhân TRIPLA.'
  });

  return router.createUrlTree(['/home']);
};

