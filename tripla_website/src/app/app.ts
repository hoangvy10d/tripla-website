import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthModalComponent } from './pages/auth-modal/auth-modal-component/auth-modal-component';
import { AuthService } from './services/auth-service';

@Component({
  imports: [RouterOutlet, AuthModalComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('tripla_website');
  readonly authService = inject(AuthService);
}
