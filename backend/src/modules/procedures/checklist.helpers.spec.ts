import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { saveChecklistItems } from './checklist.helpers.js';

function buildTxMock() {
  return {
    procedureType: { findMany: vi.fn() },
    procedureChecklistItem: { createMany: vi.fn() },
  };
}

describe('saveChecklistItems', () => {
  it('no hace nada si no hay ítems (RF-13)', async () => {
    const tx = buildTxMock();

    await saveChecklistItems(tx as never, undefined, { vehicleId: 'v1' });
    await saveChecklistItems(tx as never, [], { vehicleId: 'v1' });

    expect(tx.procedureChecklistItem.createMany).not.toHaveBeenCalled();
  });

  it('rechaza si algún tipo de trámite no existe', async () => {
    const tx = buildTxMock();
    tx.procedureType.findMany.mockResolvedValue([{ id: 't1' }]);

    await expect(
      saveChecklistItems(
        tx as never,
        [{ procedureTypeId: 't1' }, { procedureTypeId: 't2' }],
        { vehicleId: 'v1' },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('guarda un ítem por tipo, marcado o no, con el vínculo al padre (RF-9/RF-10)', async () => {
    const tx = buildTxMock();
    tx.procedureType.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);

    await saveChecklistItems(
      tx as never,
      [
        { procedureTypeId: 't1', completed: true, documentCode: 'CAJA-1' },
        { procedureTypeId: 't2' },
      ],
      { maintenanceOrderId: 'o1' },
    );

    expect(tx.procedureChecklistItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          procedureTypeId: 't1',
          completed: true,
          documentCode: 'CAJA-1',
          maintenanceOrderId: 'o1',
        },
        {
          procedureTypeId: 't2',
          completed: false,
          documentCode: undefined,
          maintenanceOrderId: 'o1',
        },
      ],
    });
  });

  it('vincula el checklist a ambos, movimiento y orden, cuando se indican los dos (spec 016, RF-11)', async () => {
    const tx = buildTxMock();
    tx.procedureType.findMany.mockResolvedValue([{ id: 't1' }]);

    await saveChecklistItems(tx as never, [{ procedureTypeId: 't1' }], {
      stockMovementId: 'm1',
      maintenanceOrderId: 'o1',
    });

    expect(tx.procedureChecklistItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          procedureTypeId: 't1',
          completed: false,
          documentCode: undefined,
          stockMovementId: 'm1',
          maintenanceOrderId: 'o1',
        },
      ],
    });
  });
});
