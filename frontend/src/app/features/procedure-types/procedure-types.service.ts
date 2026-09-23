import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  CreateProcedureTypeInput,
  ProcedureAction,
  ProcedureChecklistItem,
  ProcedureType,
  ProcedureTypeFilter,
  ProcedureTypePage,
  UpdateProcedureChecklistItemInput,
  UpdateProcedureTypeInput,
} from './procedure-type.model';

const PROCEDURE_TYPE_FIELDS = `
  id
  name
  description
  action
  isActive
`;

const PROCEDURE_TYPES_QUERY = gql`
  query ProcedureTypes($action: ProcedureAction, $isActive: Boolean, $search: String, $skip: Int, $take: Int) {
    procedureTypes(action: $action, isActive: $isActive, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${PROCEDURE_TYPE_FIELDS}
      }
    }
  }
`;

const CREATE_PROCEDURE_TYPE_MUTATION = gql`
  mutation CreateProcedureType($input: CreateProcedureTypeInput!) {
    createProcedureType(input: $input) {
      ${PROCEDURE_TYPE_FIELDS}
    }
  }
`;

const UPDATE_PROCEDURE_TYPE_MUTATION = gql`
  mutation UpdateProcedureType($id: String!, $input: UpdateProcedureTypeInput!) {
    updateProcedureType(id: $id, input: $input) {
      ${PROCEDURE_TYPE_FIELDS}
    }
  }
`;

const DEACTIVATE_PROCEDURE_TYPE_MUTATION = gql`
  mutation DeactivateProcedureType($id: String!) {
    deactivateProcedureType(id: $id) {
      id
      isActive
    }
  }
`;

const REACTIVATE_PROCEDURE_TYPE_MUTATION = gql`
  mutation ReactivateProcedureType($id: String!) {
    reactivateProcedureType(id: $id) {
      id
      isActive
    }
  }
`;

const DELETE_PROCEDURE_TYPE_MUTATION = gql`
  mutation DeleteProcedureType($id: String!) {
    deleteProcedureType(id: $id)
  }
`;

const CHECKLIST_ITEM_FIELDS = `
  id
  completed
  documentCode
  procedureTypeId
  procedureType {
    id
    name
  }
`;

const UPDATE_VEHICLE_CHECKLIST_MUTATION = gql`
  mutation UpdateVehicleChecklist($vehicleId: String!, $items: [UpdateProcedureChecklistItemInput!]!) {
    updateVehicleChecklist(vehicleId: $vehicleId, items: $items) {
      ${CHECKLIST_ITEM_FIELDS}
    }
  }
`;

const UPDATE_FUEL_RECORD_CHECKLIST_MUTATION = gql`
  mutation UpdateFuelRecordChecklist($fuelRecordId: String!, $items: [UpdateProcedureChecklistItemInput!]!) {
    updateFuelRecordChecklist(fuelRecordId: $fuelRecordId, items: $items) {
      ${CHECKLIST_ITEM_FIELDS}
    }
  }
`;

const UPDATE_STOCK_MOVEMENT_CHECKLIST_MUTATION = gql`
  mutation UpdateStockMovementChecklist($stockMovementId: String!, $items: [UpdateProcedureChecklistItemInput!]!) {
    updateStockMovementChecklist(stockMovementId: $stockMovementId, items: $items) {
      ${CHECKLIST_ITEM_FIELDS}
    }
  }
`;

const UPDATE_MAINTENANCE_ORDER_CHECKLIST_MUTATION = gql`
  mutation UpdateMaintenanceOrderChecklist($maintenanceOrderId: String!, $items: [UpdateProcedureChecklistItemInput!]!) {
    updateMaintenanceOrderChecklist(maintenanceOrderId: $maintenanceOrderId, items: $items) {
      ${CHECKLIST_ITEM_FIELDS}
    }
  }
`;

interface ProcedureTypesQueryResult {
  procedureTypes: ProcedureTypePage;
}

/**
 * Catálogo de tipos de trámite y checklist de trámites por acción (spec
 * 016). Un solo servicio para las cuatro pantallas que embeben el checklist
 * (vehículos, combustible, inventario, mantenimiento): todas comparten el
 * mismo tipo `ProcedureChecklistItem` y las mismas cuatro mutaciones de
 * edición posterior (RF-15), que sólo difieren en qué id de registro toman.
 */
@Injectable({ providedIn: 'root' })
export class ProcedureTypesService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: ProcedureTypeFilter): Observable<ProcedureTypePage> {
    return this.apollo
      .watchQuery<ProcedureTypesQueryResult>({
        query: PROCEDURE_TYPES_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map(
          (result) => (result.data?.procedureTypes as ProcedureTypePage) ?? { items: [], total: 0 },
        ),
      );
  }

  /** RF-9: tipos activos de una acción, para mostrar el checklist al registrar. */
  async listActive(action: ProcedureAction): Promise<ProcedureType[]> {
    const result = await firstValueFrom(
      this.apollo.query<ProcedureTypesQueryResult>({
        query: PROCEDURE_TYPES_QUERY,
        variables: { action, isActive: true, take: 100 },
        fetchPolicy: 'network-only',
      }),
    );
    return result.data?.procedureTypes.items ?? [];
  }

  async create(input: CreateProcedureTypeInput): Promise<ProcedureType> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createProcedureType: ProcedureType }>({
        mutation: CREATE_PROCEDURE_TYPE_MUTATION,
        variables: { input },
        refetchQueries: ['ProcedureTypes'],
      }),
    );
    return result.data!.createProcedureType;
  }

  async update(id: string, input: UpdateProcedureTypeInput): Promise<ProcedureType> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateProcedureType: ProcedureType }>({
        mutation: UPDATE_PROCEDURE_TYPE_MUTATION,
        variables: { id, input },
        refetchQueries: ['ProcedureTypes'],
      }),
    );
    return result.data!.updateProcedureType;
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DEACTIVATE_PROCEDURE_TYPE_MUTATION,
        variables: { id },
        refetchQueries: ['ProcedureTypes'],
      }),
    );
  }

  async reactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REACTIVATE_PROCEDURE_TYPE_MUTATION,
        variables: { id },
        refetchQueries: ['ProcedureTypes'],
      }),
    );
  }

  /** RF-7/RF-8: el backend rechaza si ya tiene ítems de checklist asociados. */
  async remove(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DELETE_PROCEDURE_TYPE_MUTATION,
        variables: { id },
        refetchQueries: ['ProcedureTypes'],
      }),
    );
  }

  /** RF-15: completar o corregir el checklist de un registro ya guardado. */
  async updateVehicleChecklist(
    vehicleId: string,
    items: UpdateProcedureChecklistItemInput[],
  ): Promise<ProcedureChecklistItem[]> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateVehicleChecklist: ProcedureChecklistItem[] }>({
        mutation: UPDATE_VEHICLE_CHECKLIST_MUTATION,
        variables: { vehicleId, items },
      }),
    );
    return result.data!.updateVehicleChecklist;
  }

  async updateFuelRecordChecklist(
    fuelRecordId: string,
    items: UpdateProcedureChecklistItemInput[],
  ): Promise<ProcedureChecklistItem[]> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateFuelRecordChecklist: ProcedureChecklistItem[] }>({
        mutation: UPDATE_FUEL_RECORD_CHECKLIST_MUTATION,
        variables: { fuelRecordId, items },
      }),
    );
    return result.data!.updateFuelRecordChecklist;
  }

  async updateStockMovementChecklist(
    stockMovementId: string,
    items: UpdateProcedureChecklistItemInput[],
  ): Promise<ProcedureChecklistItem[]> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateStockMovementChecklist: ProcedureChecklistItem[] }>({
        mutation: UPDATE_STOCK_MOVEMENT_CHECKLIST_MUTATION,
        variables: { stockMovementId, items },
      }),
    );
    return result.data!.updateStockMovementChecklist;
  }

  async updateMaintenanceOrderChecklist(
    maintenanceOrderId: string,
    items: UpdateProcedureChecklistItemInput[],
  ): Promise<ProcedureChecklistItem[]> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateMaintenanceOrderChecklist: ProcedureChecklistItem[] }>({
        mutation: UPDATE_MAINTENANCE_ORDER_CHECKLIST_MUTATION,
        variables: { maintenanceOrderId, items },
      }),
    );
    return result.data!.updateMaintenanceOrderChecklist;
  }
}
