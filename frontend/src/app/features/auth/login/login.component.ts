import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ThemeService } from '../../../core/theme.service';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Login del sistema (spec 013, H1/H3). Única ruta pública. */
@Component({
  imports: [IconComponent],
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  protected readonly themeService = inject(ThemeService);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly passwordVisible = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  protected togglePasswordVisible(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected async submit(): Promise<void> {
    if (!this.username().trim() || !this.password()) {
      this.errorMessage.set('Ingrese su nombre de usuario y su contraseña.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.authService.login(this.username(), this.password());
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl || '/');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      this.submitting.set(false);
    }
  }
}
