import { Component } from '@angular/core';

/** Pie de formulario dentro de `<app-modal>`: sticky, con los botones de Cancelar/Guardar. */
@Component({
  selector: 'app-form-actions',
  template: `
    <div class="sticky bottom-0 flex justify-end gap-2.5 border-t border-edge bg-surface px-6 py-4">
      <ng-content />
    </div>
  `,
})
export class FormActionsComponent {}
