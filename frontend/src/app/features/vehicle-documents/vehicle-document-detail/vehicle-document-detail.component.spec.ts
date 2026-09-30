import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { VehicleDocument } from '../vehicle-document.model';
import { VehicleDocumentDetailComponent } from './vehicle-document-detail.component';

const DAY_MS = 24 * 60 * 60 * 1000;

function documentExpiringIn(days: number): VehicleDocument {
  return {
    id: 'doc-1',
    type: 'SOAT',
    documentNumber: 'SOAT-2026-001',
    issuedAt: '2026-01-02T00:00:00.000Z',
    expiresAt: new Date(Date.now() + days * DAY_MS).toISOString(),
    notes: null,
    vehicle: { id: 'v-1', plate: '4021-LIG' },
  };
}

@Component({
  imports: [VehicleDocumentDetailComponent],
  template: `<app-vehicle-document-detail [document]="document()" />`,
})
class HostComponent {
  readonly document = signal<VehicleDocument>(documentExpiringIn(200));
}

function setup(document: VehicleDocument) {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.document.set(document);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

describe('VehicleDocumentDetailComponent', () => {
  it('un documento con meses por delante figura como vigente', () => {
    const { text } = setup(documentExpiringIn(200));

    expect(text()).toContain('Vigente');
    expect(text()).not.toContain('Vencido');
    expect(text()).toContain('4021-LIG');
    expect(text()).toContain('SOAT-2026-001');
  });

  /// Un mes de aviso: es el plazo con el que la unidad alcanza a tramitar la renovación.
  it('dentro del mes previo avisa que está por vencer', () => {
    const { text } = setup(documentExpiringIn(10));

    expect(text()).toContain('Por vencer');
    expect(text()).toContain('Vence en 10 día(s)');
  });

  it('justo en el límite del aviso todavía es «por vencer», no «vencido»', () => {
    const { text } = setup(documentExpiringIn(30));

    expect(text()).toContain('Por vencer');
    expect(text()).not.toContain('Vencido');
  });

  it('pasada la fecha figura como vencido y dice hace cuánto', () => {
    const { text } = setup(documentExpiringIn(-5));

    expect(text()).toContain('Vencido');
    expect(text()).toContain('Vencido hace 5 día(s)');
  });

  it('sin número ni observaciones no deja los bloques en blanco', () => {
    const { text } = setup({
      ...documentExpiringIn(100),
      documentNumber: null,
      notes: null,
    });

    expect(text()).toContain('Sin número de documento registrado.');
    expect(text()).toContain('Sin observaciones.');
  });
});
