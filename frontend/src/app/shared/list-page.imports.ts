import { BadgeComponent } from './badge/badge.component';
import { ButtonDirective } from './button/button.directive';
import { CardComponent } from './card/card.component';
import { FilterControlDirective } from './filter-bar/filter-control.directive';
import { FilterBarComponent } from './filter-bar/filter-bar.component';
import { PageHeadComponent } from './page-head/page-head.component';
import { PaginationComponent } from './pagination/pagination.component';
import { TableEmptyRowComponent } from './table/table-empty-row.component';
import {
  TableCellDirective,
  TableHeadCellDirective,
  TableHeadRowDirective,
  TableRowDirective,
} from './table/table-parts.directive';
import { TableComponent } from './table/table.component';

/** Piezas compartidas que usa casi cualquier pantalla de listado (`*-list`). */
export const LIST_PAGE_IMPORTS = [
  PageHeadComponent,
  CardComponent,
  FilterBarComponent,
  FilterControlDirective,
  TableComponent,
  TableHeadRowDirective,
  TableHeadCellDirective,
  TableRowDirective,
  TableCellDirective,
  TableEmptyRowComponent,
  PaginationComponent,
  ButtonDirective,
  BadgeComponent,
] as const;
