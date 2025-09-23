import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Role } from '../models/role';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const roles: Role[] = (route.data && (route.data['roles'] as Role[])) || [];
    const userRole = this.auth.getRole();
    if (!this.auth.isAuthenticated() || !userRole) {
      this.router.navigate(['/login']);
      return false;
    }
    if (roles.length === 0) {
      return true;
    }
    if (roles.includes(userRole)) {
      return true;
    }
    // unauthorized - redirect to inicio
    this.router.navigate(['/inicio']);
    return false;
  }
}
