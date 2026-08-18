import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShellStore } from '../../stores/shell.store';

@Component({
  selector: 'app-shell-header',
  imports: [RouterLink],
  templateUrl: './shell-header.component.html',
  styleUrl: './shell-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellHeaderComponent {
  readonly store = inject(ShellStore) as InstanceType<typeof ShellStore>;

  async logout(): Promise<void> {
    await this.store.logout();
  }
}
