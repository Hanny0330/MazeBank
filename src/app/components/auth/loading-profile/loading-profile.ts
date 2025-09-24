import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-loading-profile',
  imports: [],
  templateUrl: './loading-profile.html',
  styleUrls: ['./loading-profile.css']
})
export class LoadingProfileComponent {
  constructor(private auth: AuthService, private router: Router) {
    this.init();
  }

  private async init() {
    try {
      // fetchProfile is expected to return a structure with role and other user info
      const profile: any = await this.auth.fetchProfile();
      const role = profile?.role || this.auth.getRole();
      // navigate based on role
      if (role === 'Cliente' || role === 'cliente') {
        await this.router.navigate(['/cliente/haz-iniciado']);
        return;
      }
      if (role === 'Ejecutivo' || role === 'ejecutivo') {
        await this.router.navigate(['/ejecutivo/haz-iniciado']);
        return;
      }
      if (role === 'Gerente' || role === 'gerente') {
        await this.router.navigate(['/gerente/haz-iniciado']);
        return;
      }
      // default
      await this.router.navigate(['/inicio']);
    } catch (err) {
      // If anything fails, redirect to login to re-authenticate
      try { await this.router.navigate(['/login']); } catch { /* ignore */ }
    }
  }
}
