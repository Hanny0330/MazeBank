import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/role';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let auth: AuthService;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthGuard, AuthService, { provide: Router, useValue: routerSpy }],
    });
    guard = TestBed.inject(AuthGuard);
    auth = TestBed.inject(AuthService);
  });

  it('should allow navigation when authenticated', () => {
    auth.loginAs(Role.Cliente);
    expect(guard.canActivate()).toBeTrue();
  });

  it('should redirect to /login when not authenticated', () => {
    auth.logout();
    expect(guard.canActivate()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
