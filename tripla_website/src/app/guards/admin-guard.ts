import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) {
    return router.createUrlTree(['/admin/login'], {
      queryParams: { returnUrl: state.url || '/admin' }
    });
  }

  if (String(user.role || '').toLowerCase() !== 'admin') {
    return router.createUrlTree(['/login-failed'], {
      queryParams: {
        code: 'WRONG_ROLE',
        reason: 'Quyền truy cập bị từ chối: chỉ tài khoản Quản trị viên (admin) được truy cập.',
        from: 'admin',
        username: user.email || ''
      }
    });
  }

  return true;
};

