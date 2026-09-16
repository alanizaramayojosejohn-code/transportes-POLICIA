export interface Role {
  id: string;
  code: string;
  name: string;
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
}

export type UpdateUserInput = Partial<CreateUserInput>;
