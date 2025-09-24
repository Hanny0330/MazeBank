import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Role } from '../models/role';

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userId?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // When developing locally we talk directly to the backend running on 3000.
  // If you later add a frontend proxy you can change this to '/api' or wire
  // it from Angular environments.
  private apiBase = 'http://localhost:3000/api';

  private tokenKey = 'maze_token';
  private refreshKey = 'maze_refresh';

  constructor(private http: HttpClient) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const resp$ = this.http.post<LoginResponse>(`${this.apiBase}/auth/login`, { email, password });
    const resp = await firstValueFrom(resp$);
    if (resp && resp.accessToken) {
      this.setTokens(resp.accessToken, resp.refreshToken);
    }
    return resp;
  }

  // Test helper: simulate a logged in user with given role by creating a fake JWT.
  // This is useful for unit tests that don't call the backend.
  loginAs(role: Role) {
    try {
      const payload = { role };
      // base64-encode payload to mimic JWT structure
      const b64 = typeof window !== 'undefined' && window.btoa ? window.btoa(JSON.stringify(payload)) : Buffer.from(JSON.stringify(payload)).toString('base64');
      const fake = `header.${b64}.signature`;
      this.setTokens(fake, undefined);
    } catch {
      // ignore
    }
  }

  logout() {
    const refresh = this.getRefreshToken();
    if (refresh) {
      // best-effort revoke
      this.http.post(`${this.apiBase}/auth/logout`, { refreshToken: refresh }).subscribe({});
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshKey);
    }
  }

  setTokens(token: string | undefined, refresh?: string | undefined) {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) localStorage.setItem(this.tokenKey, token);
      if (refresh) localStorage.setItem(this.refreshKey, refresh);
    }
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return localStorage.getItem(this.refreshKey);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getRole(): Role | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.role as Role) ?? null;
    } catch {
      return null;
    }
  }

  // Backend returns { accessToken, expiresIn } on refresh
  async refreshAccessToken(): Promise<string> {
    const refresh = this.getRefreshToken();
    if (!refresh) throw new Error('no refresh token');
    const resp$ = this.http.post<{ accessToken: string }>(`${this.apiBase}/auth/refresh`, { refreshToken: refresh });
    const resp = await firstValueFrom(resp$);
    if (!resp || !resp.accessToken) throw new Error('refresh failed');
    this.setTokens(resp.accessToken, refresh);
    return resp.accessToken;
  }

  async fetchProfile() {
    const resp$ = this.http.get(`${this.apiBase}/profile`);
    return await firstValueFrom(resp$);
  }
}
