import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  CreateSparePartInput,
  CreateStockMovementInput,
  SparePart,
  SparePartCategory,
  SparePartFilter,
  SparePartPage,
  UpdateSparePartInput,
} from './spare-part.model';

const SPARE_PART_FIELDS = `
  id
  code
  name
  description
  unit
  minStock
  currentStock
  lastUnitCost
  location
  isActive
  categoryId
  category {
    id
    name
  }
`;

const SPARE_PARTS_QUERY = gql`
  query SpareParts($categoryId: String, $isActive: Boolean, $search: String, $skip: Int, $take: Int) {
    spareParts(categoryId: $categoryId, isActive: $isActive, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${SPARE_PART_FIELDS}
      }
    }
  }
`;

const SPARE_PART_CATEGORIES_QUERY = gql`
  query SparePartCategories {
    sparePartCategories {
      id
      name
    }
  }
`;

const CREATE_SPARE_PART_MUTATION = gql`
  mutation CreateSparePart($input: CreateSparePartInput!) {
    createSparePart(input: $input) {
      ${SPARE_PART_FIELDS}
    }
  }
`;

const UPDATE_SPARE_PART_MUTATION = gql`
  mutation UpdateSparePart($id: String!, $input: UpdateSparePartInput!) {
    updateSparePart(id: $id, input: $input) {
      ${SPARE_PART_FIELDS}
    }
  }
`;

const DEACTIVATE_SPARE_PART_MUTATION = gql`
  mutation DeactivateSparePart($id: String!) {
    deactivateSparePart(id: $id) {
      id
      isActive
    }
  }
`;

const REACTIVATE_SPARE_PART_MUTATION = gql`
  mutation ReactivateSparePart($id: String!) {
    reactivateSparePart(id: $id) {
      id
      isActive
    }
  }
`;

const REGISTER_STOCK_MOVEMENT_MUTATION = gql`
  mutation RegisterStockMovement($input: CreateStockMovementInput!) {
    registerStockMovement(input: $input) {
      id
      balanceAfter
    }
  }
`;

interface SparePartsQueryResult {
  spareParts: SparePartPage;
}

interface SparePartCategoriesResult {
  sparePartCategories: SparePartCategory[];
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: SparePartFilter): Observable<SparePartPage> {
    return this.apollo
      .watchQuery<SparePartsQueryResult>({
        query: SPARE_PARTS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.spareParts as SparePartPage) ?? { items: [], total: 0 }),
      );
  }

  listCategories(): Observable<SparePartCategory[]> {
    return this.apollo
      .watchQuery<SparePartCategoriesResult>({
        query: SPARE_PART_CATEGORIES_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.sparePartCategories as SparePartCategory[]) ?? []),
      );
  }

  async create(input: CreateSparePartInput): Promise<SparePart> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createSparePart: SparePart }>({
        mutation: CREATE_SPARE_PART_MUTATION,
        variables: { input },
        refetchQueries: ['SpareParts'],
      }),
    );
    return result.data!.createSparePart;
  }

  async update(id: string, input: UpdateSparePartInput): Promise<SparePart> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateSparePart: SparePart }>({
        mutation: UPDATE_SPARE_PART_MUTATION,
        variables: { id, input },
        refetchQueries: ['SpareParts'],
      }),
    );
    return result.data!.updateSparePart;
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DEACTIVATE_SPARE_PART_MUTATION,
        variables: { id },
        refetchQueries: ['SpareParts'],
      }),
    );
  }

  async reactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REACTIVATE_SPARE_PART_MUTATION,
        variables: { id },
        refetchQueries: ['SpareParts'],
      }),
    );
  }

  async registerMovement(input: CreateStockMovementInput): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REGISTER_STOCK_MOVEMENT_MUTATION,
        variables: { input },
        refetchQueries: ['SpareParts'],
      }),
    );
  }
}
