import { Component } from '@angular/core';
import { ShellComponent } from './layout/shell/shell.component';

@Component({
  imports: [ShellComponent],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
