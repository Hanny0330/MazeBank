import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginForm: any;
  loading = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
  this.loginForm = this.fb.group({ email: [''], password: [''] });
  }

  async submit() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = null;
    const { email, password } = this.loginForm.value as { email: string; password: string };
    try {
      const resp = await this.auth.login(email, password);
      // navigate to loading-profile so existing route/component can fetch profile
      await this.router.navigate(['/loading-profile']);
    } catch (err: any) {
      this.error = err?.message || 'Error al iniciar sesión';
    } finally {
      this.loading = false;
    }
  }
}
