import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard } from './core/guards/auth.guard';
import { homeGuard, roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        canActivate: [homeGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
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
          import('./features/units/units-list/units-list.component').then(
            (m) => m.UnitsListComponent,
          ),
      },
      {
        path: 'asignaciones',
        loadComponent: () =>
          import('./features/unit-assignments/unit-assignments-list/unit-assignments-list.component').then(
            (m) => m.UnitAssignmentsListComponent,
          ),
      },
      {
        path: 'conductores',
        loadComponent: () =>
          import('./features/drivers/drivers-list/drivers-list.component').then(
            (m) => m.DriversListComponent,
          ),
      },
      {
        path: 'mi-vehiculo',
        canActivate: [roleGuard(['CONDUCTOR'])],
        loadComponent: () =>
          import('./features/my-vehicle/my-vehicle.component').then((m) => m.MyVehicleComponent),
      },
      {
        path: 'recorridos',
        loadComponent: () =>
          import('./features/trips/trips-list/trips-list.component').then(
            (m) => m.TripsListComponent,
          ),
      },
      {
        path: 'combustible',
        loadComponent: () =>
          import('./features/fuel-records/fuel-records-list/fuel-records-list.component').then(
            (m) => m.FuelRecordsListComponent,
          ),
      },
      {
        path: 'mantenimiento',
        loadComponent: () =>
          import('./features/maintenance-orders/maintenance-orders-list/maintenance-orders-list.component').then(
            (m) => m.MaintenanceOrdersListComponent,
          ),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventory/spare-parts-list/spare-parts-list.component').then(
            (m) => m.SparePartsListComponent,
          ),
      },
      {
        path: 'documentacion',
        loadComponent: () =>
          import('./features/vehicle-documents/vehicle-documents-list/vehicle-documents-list.component').then(
            (m) => m.VehicleDocumentsListComponent,
          ),
      },
      {
        path: 'incidentes',
        loadComponent: () =>
          import('./features/incidents/incidents-list/incidents-list.component').then(
            (m) => m.IncidentsListComponent,
          ),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'area-transportes',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadComponent: () =>
          import('./features/transport-office/transport-office.component').then(
            (m) => m.TransportOfficeComponent,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadComponent: () =>
          import('./features/users/users-list/users-list.component').then(
            (m) => m.UsersListComponent,
          ),
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadComponent: () =>
          import('./features/audit/audit.component').then((m) => m.AuditComponent),
      },
    ],
  },
];
