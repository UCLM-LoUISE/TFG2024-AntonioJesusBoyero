import { BehaviorSubject } from 'rxjs';

export class UserData {

  private static userDataSubject = new BehaviorSubject<string | null>(null);
  private static userData: any = []
  private static userEmail: any
  private static userRol: any

  static setUserName(name: string): void {
    this.userDataSubject.next(name);
  }

  static getUserName() {
    return this.userDataSubject.asObservable();
  }

  static setUserData(data: any): void {
    this.userData = data;
  }

  static getUserData() {
    return this.userData;
  }


  static setUserEmail(email: any): void {
    this.userEmail = email;
  }

  static getUserEmail() {
    return this.userEmail;
  }

  static setUserRol(rol: any) {
    this.userRol = rol
  }

  static getUserRol() {
    return this.userRol
  }
}
