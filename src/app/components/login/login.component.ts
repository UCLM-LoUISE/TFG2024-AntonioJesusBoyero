import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent{

  email: string = '';
  password: string = '';
  rememberMe: boolean = false;

  constructor() { }

  signIn() {
    console.log('Email:', this.email);
    console.log('Password:', this.password);
    console.log('Remember Me:', this.rememberMe);
    this.resetValues();
  }


  resetValues(){
    this.email = ''
    this.password = ''
    this.rememberMe = false
    console.log("Valores reiniciados");
  }

}
