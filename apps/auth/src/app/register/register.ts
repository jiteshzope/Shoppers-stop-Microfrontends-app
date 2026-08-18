import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register implements OnInit {
  readonly store = inject(AuthStore) as InstanceType<typeof AuthStore>;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly name = signal('');
  readonly email = signal('');
  readonly phoneNumber = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');

  readonly hasAttemptedSubmit = signal(false);

  readonly passwordsDoNotMatch = computed(
    () =>
      (this.hasAttemptedSubmit() || this.confirmPassword().length > 0) &&
      this.password() !== this.confirmPassword(),
  );

  private getReturnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/product';
  }

  async ngOnInit(): Promise<void> {
    await this.store.refreshSession();
    if (this.store.isAuthenticated()) {
      await this.router.navigateByUrl(this.getReturnUrl());
    }
  }

  async onSubmit(form: NgForm): Promise<void> {
    this.hasAttemptedSubmit.set(true);

    if (form.invalid || this.passwordsDoNotMatch() || this.store.isSubmitting()) {
      return;
    }

    const didRegister = await this.store.register({
      name: this.name().trim(),
      email: this.email().trim(),
      phoneNumber: this.phoneNumber().trim(),
      password: this.password(),
      confirmPassword: this.confirmPassword(),
    });

    if (didRegister) {
      form.resetForm({
        name: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
      });
      this.name.set('');
      this.email.set('');
      this.phoneNumber.set('');
      this.password.set('');
      this.confirmPassword.set('');
      this.hasAttemptedSubmit.set(false);
      await this.router.navigateByUrl(this.getReturnUrl());
    }
  }

  clearError(): void {
    this.store.clearError();
  }
}
