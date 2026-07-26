import { inject, Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })

export class AuthService {

  private auth = inject(Auth); // ✅ inyección moderna con Firebase modular

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}
