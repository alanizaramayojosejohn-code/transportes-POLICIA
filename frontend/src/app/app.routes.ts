import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'vehiculos', pathMatch: 'full' },
  {
    path: 'vehiculos',
    loadComponent: () =>
      import('./features/vehicles/vehicles-list/vehicles-list.component').then(
        (m) => m.VehiclesListComponent,
      ),
  },
  {
    path: 'unidades',
    loadComponent: () =>
      import('./features/units/units-list/units-list.component').then((m) => m.UnitsListComponent),
  },
  {
    path: 'asignaciones',
    loadComponent: () =>
      import('./features/unit-assignments/unit-assignments-list/unit-assignments-list.component').then(
        (m) => m.UnitAssignmentsListComponent,
      ),
  },
];
