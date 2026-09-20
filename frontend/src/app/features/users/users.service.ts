import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import { CreateUserInput, Role, UpdateUserInput, User, UserFilter, UserPage } from './user.model';

const USER_FIELDS = `
  id
  username
  email
  fullName
  rank
  phone
  isActive
  lastLoginAt
  roleId
  role {
    id
    code
    name
  }
  personnel {
    id
    ci
    firstName
    lastName
    unit {
      id
      name
    }
  }
`;

const USERS_QUERY = gql`
  query Users($roleId: String, $isActive: Boolean, $search: String, $skip: Int, $take: Int) {
    users(roleId: $roleId, isActive: $isActive, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${USER_FIELDS}
      }
    }
  }
`;

const ROLES_QUERY = gql`
  query Roles {
    roles {
      id
      code
      name
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ${USER_FIELDS}
    }
  }
`;

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: String!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      ${USER_FIELDS}
    }
  }
`;

const DEACTIVATE_USER_MUTATION = gql`
  mutation DeactivateUser($id: String!) {
    deactivateUser(id: $id) {
      id
      isActive
    }
  }
`;

const REACTIVATE_USER_MUTATION = gql`
  mutation ReactivateUser($id: String!) {
    reactivateUser(id: $id) {
      id
      isActive
    }
  }
`;

interface UsersQueryResult {
  users: UserPage;
}

interface RolesQueryResult {
  roles: Role[];
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: UserFilter): Observable<UserPage> {
    return this.apollo
      .watchQuery<UsersQueryResult>({
        query: USERS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.users as UserPage) ?? { items: [], total: 0 }),
      );
  }

  /// Catálogo cerrado para el selector de rol del formulario (RF-13).
  listRoles(): Observable<Role[]> {
    return this.apollo
      .watchQuery<RolesQueryResult>({
        query: ROLES_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => (result.data?.roles as Role[]) ?? []));
  }

  async create(input: CreateUserInput): Promise<User> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createUser: User }>({
        mutation: CREATE_USER_MUTATION,
        variables: { input },
        refetchQueries: ['Users'],
      }),
    );
    return result.data!.createUser;
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateUser: User }>({
        mutation: UPDATE_USER_MUTATION,
        variables: { id, input },
        refetchQueries: ['Users'],
      }),
    );
    return result.data!.updateUser;
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DEACTIVATE_USER_MUTATION,
        variables: { id },
        refetchQueries: ['Users'],
      }),
    );
  }

  async reactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REACTIVATE_USER_MUTATION,
        variables: { id },
        refetchQueries: ['Users'],
      }),
    );
  }
}
