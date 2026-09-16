export type DocumentType =
  'SOAT' | 'INSPECCION_TECNICA' | 'RUAT' | 'POLIZA_SEGURO' | 'CERTIFICADO_GNV' | 'OTRO';

export const DOCUMENT_TYPES: DocumentType[] = [
  'SOAT',
  'INSPECCION_TECNICA',
  'RUAT',
  'POLIZA_SEGURO',
  'CERTIFICADO_GNV',
  'OTRO',
];

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  SOAT: 'SOAT',
  INSPECCION_TECNICA: 'Inspección técnica',
  RUAT: 'RUAT',
  POLIZA_SEGURO: 'Póliza de seguro',
  CERTIFICADO_GNV: 'Certificado GNV',
  OTRO: 'Otro',
};

export interface VehicleDocumentVehicle {
  id: string;
  plate: string;
}

export interface VehicleDocument {
  id: string;
  type: DocumentType;
  documentNumber: string | null;
  issuedAt: string | null;
  expiresAt: string;
  notes: string | null;
  vehicle: VehicleDocumentVehicle;
}

export interface VehicleDocumentPage {
  items: VehicleDocument[];
  total: number;
}

export interface VehicleDocumentFilter {
  vehicleId?: string;
  type?: DocumentType;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateVehicleDocumentInput {
  vehicleId: string;
  type: DocumentType;
  documentNumber?: string;
  issuedAt?: string;
  expiresAt: string;
  notes?: string;
}
