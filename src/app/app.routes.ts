import { Routes } from '@angular/router';

import { LoginComponent } from './components/auth/login/login';
import { LoadingProfileComponent } from './components/auth/loading-profile/loading-profile';
import { HazIniciadoComponent as ClienteHazIniciado } from './components/cliente/haz-iniciado/haz-iniciado';
import { HazIniciadoComponent as EjecutivoHazIniciado } from './components/ejecutivo/haz-iniciado/haz-iniciado';
import { HazIniciadoComponent as GerenteHazIniciado } from './components/gerente/haz-iniciado/haz-iniciado';
import { InicioComponent } from './components/inicio/inicio';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { Role } from './models/role';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'loading-profile', component: LoadingProfileComponent },
  { path: 'inicio', component: InicioComponent, canActivate: [AuthGuard] },
  {
    path: 'cliente/haz-iniciado',
    component: ClienteHazIniciado,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [Role.Cliente] }
  },
  {
    path: 'ejecutivo/haz-iniciado',
    component: EjecutivoHazIniciado,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [Role.Ejecutivo] }
  },
  {
    path: 'gerente/haz-iniciado',
    component: GerenteHazIniciado,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [Role.Gerente] }
  }
  ,
  { path: '**', redirectTo: 'login' }
];