import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmHostComponent } from './shared/confirm/confirm-host.component';
import { ToastHostComponent } from './shared/toast/toast-host.component';

@Component({
  imports: [RouterOutlet, ToastHostComponent, ConfirmHostComponent],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
