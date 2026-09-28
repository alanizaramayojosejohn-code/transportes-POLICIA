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
        // TRANSPORTES no ve el catálogo general de unidades: la suya vive
        // resumida en su propio panel de inicio.
        canActivate: [
          roleGuard([
            'ADMINISTRADOR',
            'COMBUSTIBLE',
            'MANTENIMIENTO',
            'ALMACEN',
            'CONSULTA',
            'CONDUCTOR',
          ]),
        ],
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
        // ALMACEN no opera combustible: es dominio de COMBUSTIBLE.
        canActivate: [
          roleGuard([
            'ADMINISTRADOR',
            'TRANSPORTES',
            'COMBUSTIBLE',
            'MANTENIMIENTO',
            'CONSULTA',
            'CONDUCTOR',
          ]),
        ],
        loadComponent: () =>
          import('./features/fuel-records/fuel-records-list/fuel-records-list.component').then(
            (m) => m.FuelRecordsListComponent,
          ),
      },
      {
        path: 'combustible/bitacora',
        canActivate: [
          roleGuard([
            'ADMINISTRADOR',
            'TRANSPORTES',
            'COMBUSTIBLE',
            'MANTENIMIENTO',
            'CONSULTA',
            'CONDUCTOR',
          ]),
        ],
        loadComponent: () =>
          import('./features/fuel-records/fuel-logbook/fuel-logbook-report.component').then(
            (m) => m.FuelLogbookReportComponent,
          ),
      },
      {
        path: 'mantenimiento',
        // Sin refacciones/mantenimiento para TRANSPORTES: es dominio de
        // MANTENIMIENTO/ALMACEN, no de la operación de su unidad.
        canActivate: [
          roleGuard([
            'ADMINISTRADOR',
            'COMBUSTIBLE',
            'MANTENIMIENTO',
            'ALMACEN',
            'CONSULTA',
            'CONDUCTOR',
          ]),
        ],
        loadComponent: () =>
          import('./features/maintenance-orders/maintenance-orders-list/maintenance-orders-list.component').then(
            (m) => m.MaintenanceOrdersListComponent,
          ),
      },
      {
        path: 'inventario',
        // Tampoco para COMBUSTIBLE: cada uno opera su propio dominio, sin
        // pisarse (ver `ROLE_EXCLUDED_PATHS` en el shell).
        canActivate: [
          roleGuard(['ADMINISTRADOR', 'MANTENIMIENTO', 'ALMACEN', 'CONSULTA', 'CONDUCTOR']),
        ],
        loadComponent: () =>
          import('./features/inventory/spare-parts-list/spare-parts-list.component').then(
            (m) => m.SparePartsListComponent,
          ),
      },
      {
        path: 'documentacion',
        canActivate: [
          roleGuard([
            'ADMINISTRADOR',
            'COMBUSTIBLE',
            'MANTENIMIENTO',
            'ALMACEN',
            'CONSULTA',
            'CONDUCTOR',
          ]),
        ],
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
        path: 'tramites',
        loadComponent: () =>
          import('./features/procedure-types/procedure-types-list/procedure-types-list.component').then(
            (m) => m.ProcedureTypesListComponent,
          ),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'reportes/movimientos-almacen',
        // Spec 018: mismo dominio que Inventario (Kardex), sin Combustible ni Transportes.
        canActivate: [roleGuard(['ADMINISTRADOR', 'CONSULTA', 'MANTENIMIENTO', 'ALMACEN'])],
        loadComponent: () =>
          import('./features/inventory/stock-movements-list/stock-movements-list.component').then(
            (m) => m.StockMovementsListComponent,
          ),
      },
      {
        path: 'reportes/historial-vehiculo',
        // Spec 018 RF-12/RF-13/RF-16: ADMINISTRADOR y CONSULTA sin acotar, TRANSPORTES por
        // unidad y CONDUCTOR siempre al vehículo del que está a cargo (sin selector).
        canActivate: [roleGuard(['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'CONDUCTOR'])],
        loadComponent: () =>
          import('./features/reports/vehicle-history/vehicle-history.component').then(
            (m) => m.VehicleHistoryComponent,
          ),
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
