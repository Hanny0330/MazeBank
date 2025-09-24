import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Keep in sync with AuthService.apiBase
  private apiBase = 'http://localhost:3000/api';

  constructor(private router: Router, private httpBackend: HttpBackend) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    try {
      const token = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('maze_token') : null;
      const isApi = req.url.startsWith(this.apiBase) || req.url.includes('/api/');
      let authReq = req;
      if (token && isApi) {
        authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }

      return next.handle(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401 && isApi) {
            // Try refresh once using HttpBackend to avoid interceptor loops
            const refresh = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('maze_refresh') : null;
            if (!refresh) {
              // Not refreshable - clear and redirect to login
              if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem('maze_token');
                localStorage.removeItem('maze_refresh');
              }
              this.router.navigate(['/login']);
              return throwError(() => err);
            }

            const http = new HttpClient(this.httpBackend);
            return http.post<{ accessToken?: string }>(`${this.apiBase}/auth/refresh`, { refreshToken: refresh }).pipe(
              switchMap(resp => {
                if (resp && resp.accessToken) {
                  if (typeof window !== 'undefined' && window.localStorage) localStorage.setItem('maze_token', resp.accessToken);
                  const retry = req.clone({ setHeaders: { Authorization: `Bearer ${resp.accessToken}` } });
                  return next.handle(retry);
                }
                if (typeof window !== 'undefined' && window.localStorage) {
                  localStorage.removeItem('maze_token');
                  localStorage.removeItem('maze_refresh');
                }
                this.router.navigate(['/login']);
                return throwError(() => err);
              }),
              catchError(e => {
                if (typeof window !== 'undefined' && window.localStorage) {
                  localStorage.removeItem('maze_token');
                  localStorage.removeItem('maze_refresh');
                }
                this.router.navigate(['/login']);
                return throwError(() => e);
              })
            );
          }
          return throwError(() => err);
        })
      );
    } catch (e) {
      return next.handle(req);
    }
  }
}
