import { ButtonDirective } from './button/button.directive';
import { FieldControlDirective } from './field/field-control.directive';
import { FieldComponent } from './field/field.component';
import { FormActionsComponent } from './form-actions/form-actions.component';
import { ModalComponent } from './modal/modal.component';

/** Piezas compartidas de cualquier formulario en modal (`*-form`). */
export const FORM_MODAL_IMPORTS = [
  ModalComponent,
  FieldComponent,
  FieldControlDirective,
  FormActionsComponent,
  ButtonDirective,
] as const;
