import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ShellHeaderComponent } from './shell-header.component';
import { ShellStore } from '../../stores/shell.store';

describe('ShellHeaderComponent', () => {
  const configureTestingModule = async (isAuthenticated: boolean) => {
    const store = {
      isAuthenticated: vi.fn(() => isAuthenticated),
      cartItemCount: vi.fn(() => 3),
      user: vi.fn(() =>
        isAuthenticated
          ? {
              id: 'user-1',
              name: 'Taylor',
              email: 'taylor@example.com',
              phoneNumber: '1234567890',
              roles: ['customer'],
            }
          : null,
      ),
      goToLogin: vi.fn(),
      goToRegister: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ShellHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: ShellStore, useValue: store },
      ],
    }).compileComponents();

    return { store };
  };

  it('renders login and register actions for guests', async () => {
    const { store } = await configureTestingModule(false);
    const fixture = TestBed.createComponent(ShellHeaderComponent);

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Shoppers');
    expect(text).toContain('Stop');
    expect(text).toContain('Login');
    expect(text).toContain('Register');
    expect(text).not.toContain('taylor@example.com');

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].nativeElement.click();
    buttons[1].nativeElement.click();

    expect(store.goToLogin).toHaveBeenCalledTimes(1);
    expect(store.goToRegister).toHaveBeenCalledTimes(1);
  });

  it('renders authenticated user details and logs out', async () => {
    const { store } = await configureTestingModule(true);
    const fixture = TestBed.createComponent(ShellHeaderComponent);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cart-badge')?.textContent).toContain('3');
    expect(compiled.textContent).toContain('Taylor');
    expect(compiled.textContent).toContain('taylor@example.com');

    const logoutButton = fixture.debugElement.query(By.css('button'));
    logoutButton.nativeElement.click();

    expect(store.logout).toHaveBeenCalledTimes(1);
  });
});