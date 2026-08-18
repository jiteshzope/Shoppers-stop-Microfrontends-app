import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  readonly store = inject(AuthStore) as InstanceType<typeof AuthStore>;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly email = signal('');
  readonly password = signal('');

  readonly hasAttemptedSubmit = signal(false);

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

    if (form.invalid || this.store.isSubmitting()) {
      return;
    }

    const didLogin = await this.store.login({
      email: this.email().trim(),
      password: this.password(),
    });

    if (didLogin) {
      form.resetForm({
        email: '',
        password: '',
      });
      this.email.set('');
      this.password.set('');
      this.hasAttemptedSubmit.set(false);
      await this.router.navigateByUrl(this.getReturnUrl());
    }
  }

  clearError(): void {
    this.store.clearError();
  }
}
