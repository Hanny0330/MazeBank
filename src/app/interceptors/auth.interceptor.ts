import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const access = this.auth.getAccessToken();
    let authReq = req;
    if (access) {
      authReq = req.clone({ setHeaders: { Authorization: `Bearer ${access}` } });
    }

    return next.handle(authReq).pipe(
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          // attempt refresh and retry once
          return from(this.auth.refreshAccessToken()).pipe(
            switchMap((newToken) => {
              const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
              return next.handle(retryReq);
            }),
            catchError((refreshErr) => {
              // refresh failed -> logout
              this.auth.logout();
              return throwError(refreshErr);
            }),
          );
        }
        return throwError(err);
      }),
    );
  }
}
