export interface PersonnelUnit {
  id: string;
  name: string;
}

export interface PersonnelVehicle {
  id: string;
  plate: string;
}

/**
 * Fusión de lo que antes eran `Driver` (spec 005) y `Officer` (spec 002):
 * una misma persona puede ser conductora, encargada de transportes o tener
 * cuenta de sistema, cualquier combinación de las tres a la vez.
 */
export interface Personnel {
  id: string;
  ci: string;
  ciComplement: string;
  firstName: string;
  lastName: string;
  rank: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  isDriver: boolean;
  isOfficer: boolean;
  isAdmin: boolean;
  licenseNumber: string | null;
  licenseCategory: string | null;
  licenseExpiresAt: string | null;
  observations: string | null;
  unitId: string | null;
  unit: PersonnelUnit | null;
  /// Vehículo del que es conductor encargado vigente (spec 014).
  currentVehicle: PersonnelVehicle | null;
  /// Cuenta de sistema vinculada, si la tiene (spec 004/015).
  userId: string | null;
}

export interface PersonnelPage {
  items: Personnel[];
  total: number;
}

export interface PersonnelFilter {
  isDriver?: boolean;
  isOfficer?: boolean;
  isAdmin?: boolean;
  unitId?: string;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreatePersonnelInput {
  ci: string;
  ciComplement?: string;
  firstName: string;
  lastName: string;
  rank?: string;
  phone?: string;
  email?: string;
  isDriver?: boolean;
  isOfficer?: boolean;
  isAdmin?: boolean;
  licenseNumber?: string;
  licenseCategory?: string;
  licenseExpiresAt?: string;
  observations?: string;
  unitId?: string;
}

export type UpdatePersonnelInput = Partial<CreatePersonnelInput>;
