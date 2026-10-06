import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { PwaInstallService } from '../../../core/pwa-install.service';
import { ThemeService } from '../../../core/theme.service';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { IconComponent } from '../../../shared/icon/icon.component';
import { FormValidation } from '../../../shared/validation/form-validation';
import { required } from '../../../shared/validation/validators';

interface LoginForm {
  username: string;
  password: string;
}

/** Login del sistema (spec 013, H1/H3). Única ruta pública. */
@Component({
  imports: [IconComponent, ButtonDirective],
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly pwaInstall = inject(PwaInstallService);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly passwordVisible = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly form = computed<LoginForm>(() => ({
    username: this.username(),
    password: this.password(),
  }));
  protected readonly validation = new FormValidation(this.form, {
    username: required('Ingrese su nombre de usuario.'),
    password: required('Ingrese su contraseña.'),
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  protected togglePasswordVisible(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected async installPwa(): Promise<void> {
    await this.pwaInstall.promptInstall();
  }

  protected dismissInstall(): void {
    this.pwaInstall.dismiss();
  }

  protected async submit(): Promise<void> {
    if (!this.validation.validateAll()) {
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
