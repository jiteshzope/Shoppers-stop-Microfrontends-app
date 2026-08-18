import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type SessionState } from '@ecommerce-mf/session';
import { App } from './app';
import { ShellHeaderComponent } from './components/shell-header/shell-header.component';
import { AuthRemoteService } from './services/auth-remote.service';
import { CartRemoteService } from './services/cart-remote.service';
import { ProductRemoteService } from './services/product-remote.service';
import { ShellStore } from './stores/shell.store';

@Component({
  selector: 'app-shell-header',
  template: '',
})
class MockShellHeaderComponent {}

const createSession = (): SessionState => ({
  isAuthenticated: true,
  user: {
    id: 'user-1',
    name: 'Taylor',
    email: 'taylor@example.com',
    phoneNumber: '1234567890',
    roles: ['customer'],
  },
});

describe('App', () => {
  const configureTestingModule = async (session: SessionState | null) => {
    const authRemote = {
      session: signal<SessionState | null>(session),
    };

    const store = {
      setAuthSession: vi.fn(),
      loadCartItemCount: vi.fn().mockResolvedValue(undefined),
      clearAuthSession: vi.fn(),
    };

    TestBed.overrideComponent(App, {
      remove: { imports: [ShellHeaderComponent] },
      add: { imports: [MockShellHeaderComponent] },
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthRemoteService, useValue: authRemote },
        { provide: CartRemoteService, useValue: {} },
        { provide: ProductRemoteService, useValue: {} },
        { provide: ShellStore, useValue: store },
      ],
    }).compileComponents();

    return { store };
  };

  it('creates the app', async () => {
    await configureTestingModule(null);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.title).toBe('shell');
  });

  it('syncs authenticated remote session into the store and loads cart count', async () => {
    const session = createSession();
    const { store } = await configureTestingModule(session);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(store.setAuthSession).toHaveBeenCalledWith(session);
    expect(store.loadCartItemCount).toHaveBeenCalledTimes(1);
    expect(store.clearAuthSession).not.toHaveBeenCalled();
  });

  it('clears shell state when there is no authenticated remote session', async () => {
    const { store } = await configureTestingModule(null);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(store.clearAuthSession).toHaveBeenCalledTimes(1);
    expect(store.setAuthSession).not.toHaveBeenCalled();
    expect(store.loadCartItemCount).not.toHaveBeenCalled();
  });
});
