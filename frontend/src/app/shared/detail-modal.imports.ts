import { BadgeComponent } from './badge/badge.component';
import { ButtonDirective } from './button/button.directive';
import { DataCellComponent } from './data-cell/data-cell.component';
import { DetailHeaderComponent } from './detail-header/detail-header.component';
import { DetailSectionComponent } from './detail-section/detail-section.component';
import { FormActionsComponent } from './form-actions/form-actions.component';
import { ModalComponent } from './modal/modal.component';

/** Piezas compartidas de cualquier ficha de detalle en modal (`*-detail`, sólo lectura). */
export const DETAIL_MODAL_IMPORTS = [
  ModalComponent,
  DetailHeaderComponent,
  DetailSectionComponent,
  DataCellComponent,
  BadgeComponent,
  FormActionsComponent,
  ButtonDirective,
] as const;
