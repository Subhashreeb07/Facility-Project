import { Injectable, signal } from '@angular/core';
import { CurrentUserResponse, LoginResponse } from '../models/employee-flow.models';

interface SessionState {
  token: string;
  user: CurrentUserResponse;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly storageKey = 'hyhub_employee_session';
  private readonly legacyStorage = localStorage;
  private readonly storage = sessionStorage;
  readonly state = signal<SessionState | null>(this.readFromStorage());

  setFromLogin(response: LoginResponse): void {
    const next: SessionState = {
      token: response.token,
      user: {
        employeeId: response.employeeId,
        name: response.name,
        email: response.email,
        role: response.role
      }
    };
    this.storage.setItem(this.storageKey, JSON.stringify(next));
    this.state.set(next);
  }

  refreshUser(user: CurrentUserResponse): void {
    const current = this.state();
    if (!current?.token) {
      return;
    }

    const next: SessionState = {
      token: current.token,
      user
    };

    this.storage.setItem(this.storageKey, JSON.stringify(next));
    this.state.set(next);
  }

  clear(): void {
    this.storage.removeItem(this.storageKey);
    this.legacyStorage.removeItem(this.storageKey);
    this.state.set(null);
  }

  getToken(): string | null {
    return this.state()?.token ?? null;
  }

  getEmployeeId(): string | null {
    return this.state()?.user.employeeId ?? null;
  }

  getRole(): string | null {
    return this.state()?.user.role ?? null;
  }

  private readFromStorage(): SessionState | null {
    const sessionRaw = this.storage.getItem(this.storageKey);
    if (sessionRaw) {
      try {
        return JSON.parse(sessionRaw) as SessionState;
      } catch {
        this.storage.removeItem(this.storageKey);
      }
    }

    // Migrate legacy shared session from localStorage to tab-scoped sessionStorage.
    const legacyRaw = this.legacyStorage.getItem(this.storageKey);
    if (!legacyRaw) {
      return null;
    }

    try {
      const parsed = JSON.parse(legacyRaw) as SessionState;
      this.storage.setItem(this.storageKey, JSON.stringify(parsed));
      this.legacyStorage.removeItem(this.storageKey);
      return parsed;
    } catch {
      this.legacyStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
