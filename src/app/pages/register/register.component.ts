import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  registerForm!: FormGroup;
  progressValue: number = 0;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
      fullName: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    });

    this.registerForm.valueChanges.subscribe(() => {
      this.updateProgress();
    });
  }

  updateProgress(): void {
    const controls = this.registerForm.controls;
    this.progressValue = 0;
    if (controls['email'].valid) this.progressValue += 20;
    if (controls['password'].valid) this.progressValue += 20;
    if (controls['confirmPassword'].valid) this.progressValue += 20;
    if (controls['fullName'].valid) this.progressValue += 20;
    if (controls['terms'].valid) this.progressValue += 20;
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      console.log(this.registerForm.value);
      this.registerForm.reset();
      this.progressValue = 0;
    }
  }

}
