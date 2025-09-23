import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RoleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/role';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let auth: AuthService;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RoleGuard, AuthService, { provide: Router, useValue: routerSpy }],
    });
    guard = TestBed.inject(RoleGuard);
    auth = TestBed.inject(AuthService);
  });

  it('should allow when roles match', () => {
    auth.loginAs(Role.Ejecutivo);
    const route: any = { data: { roles: [Role.Ejecutivo] } };
    expect(guard.canActivate(route)).toBeTrue();
  });

  it('should redirect to login when not authenticated', () => {
    auth.logout();
    const route: any = { data: { roles: [Role.Cliente] } };
    expect(guard.canActivate(route)).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect to inicio when role mismatch', () => {
    auth.loginAs(Role.Cliente);
    const route: any = { data: { roles: [Role.Ejecutivo] } };
    expect(guard.canActivate(route)).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/inicio']);
  });
});
