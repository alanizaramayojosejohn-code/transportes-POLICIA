export interface Role {
  id: string;
  code: string;
  name: string;
}

export interface UserPersonnel {
  id: string;
  ci: string;
  firstName: string;
  lastName: string;
  unit: { id: string; name: string } | null;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  rank: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  roleId: string;
  role: Role;
  /// Ficha de personal vinculada (spec 015): null si la cuenta no tiene una.
  personnel: UserPersonnel | null;
}

export interface UserPage {
  items: User[];
  total: number;
}

export interface UserFilter {
  roleId?: string;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  rank?: string;
  phone?: string;
  roleId: string;
  /// Ficha de personal a vincular (spec 015): marca isDriver/isOfficer/isAdmin
  /// según el rol de la cuenta.
  personnelId?: string;
}

export type UpdateUserInput = Partial<CreateUserInput>;
