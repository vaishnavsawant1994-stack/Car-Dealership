import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeliveryCaseStatus, DeliveryChecklistCode, UserRole, WorkshopChecklistCode, WorkshopOrderStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'

vi.mock('server-only', () => ({}))

const { tx, scope } = vi.hoisted(() => ({
  tx: {
    deliveryCase: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    deliveryChecklistEntry: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    vehicle: { updateMany: vi.fn() },
    vehicleStatusHistory: { create: vi.fn() },
    workshopOrder: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    workshopChecklistEntry: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  scope: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback(tx)) },
}))
vi.mock('@/lib/auth/showroom-scope', () => ({ getActorShowroomScope: scope }))

import { transitionDeliveryCase, updateDeliveryChecklistItem } from '@/lib/delivery/delivery-service'
import { transitionWorkshopOrder, updateWorkshopChecklist } from '@/lib/workshop/workshop-service'

const actor = { id: 'staff-a', role: UserRole.SALES } as AdminActor
const visible = { global: false, showroomIds: ['showroom-a'] }
const queueScope = {
  showroomId: { in: ['showroom-a'] },
  OR: [{ assignedToId: null }, { assignedToId: actor.id }],
}

describe('showroom scope on checklist child writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scope.mockResolvedValue(visible)
    tx.deliveryCase.findFirst.mockResolvedValue({ id: 'delivery-a' })
    tx.deliveryChecklistEntry.findFirst.mockResolvedValue({ id: 'delivery-item-a', version: 1 })
    tx.deliveryChecklistEntry.updateMany.mockResolvedValue({ count: 1 })
    tx.deliveryCase.update.mockResolvedValue({ id: 'delivery-a' })
    tx.deliveryCase.updateMany.mockResolvedValue({ count: 1 })
    tx.deliveryChecklistEntry.findMany.mockResolvedValue([])
    tx.vehicle.updateMany.mockResolvedValue({ count: 1 })
    tx.vehicleStatusHistory.create.mockResolvedValue({})
    tx.workshopOrder.findFirst.mockResolvedValue({ id: 'workshop-a' })
    tx.workshopChecklistEntry.findFirst.mockResolvedValue({ id: 'workshop-item-a', version: 1 })
    tx.workshopChecklistEntry.updateMany.mockResolvedValue({ count: 1 })
    tx.workshopOrder.update.mockResolvedValue({ id: 'workshop-a' })
    tx.workshopOrder.updateMany.mockResolvedValue({ count: 1 })
    tx.workshopChecklistEntry.findMany.mockResolvedValue([])
    tx.auditLog.create.mockResolvedValue({})
  })

  it('repeats showroom and assignment scope in delivery checklist child read and write', async () => {
    const code = Object.values(DeliveryChecklistCode).find((item) => item !== DeliveryChecklistCode.CLEARED_PAYMENT_VERIFIED)!
    expect(await updateDeliveryChecklistItem('delivery-a', actor, { code, completed: true, version: 1 })).toEqual({ type: 'updated' })
    expect(tx.deliveryChecklistEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deliveryCase: { is: expect.objectContaining(queueScope) } }),
    }))
    expect(tx.deliveryChecklistEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deliveryCase: { is: expect.objectContaining(queueScope) } }),
    }))
  })

  it('repeats showroom and assignment scope in delivery handover final writes', async () => {
    tx.deliveryCase.findFirst.mockResolvedValue({
      id: 'delivery-a', dealId: 'deal-a', vehicleId: 'vehicle-a',
      status: DeliveryCaseStatus.READY_FOR_HANDOVER, version: 2,
    })
    expect(await transitionDeliveryCase('delivery-a', actor, {
      version: 2, status: DeliveryCaseStatus.HANDED_OVER, customerAcknowledged: true,
    })).toEqual({ type: 'updated' })
    expect(tx.vehicle.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deliveryCases: { some: expect.objectContaining(queueScope) } }),
    }))
    expect(tx.deliveryCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining(queueScope),
    }))
  })

  it('repeats showroom and assignment scope in workshop status writes', async () => {
    tx.workshopOrder.findFirst.mockResolvedValue({
      id: 'workshop-a', vehicleId: 'vehicle-a', status: WorkshopOrderStatus.OPEN, version: 1,
    })
    expect(await transitionWorkshopOrder('workshop-a', actor, {
      version: 1, status: WorkshopOrderStatus.SCHEDULED,
    })).toEqual({ type: 'updated' })
    expect(tx.workshopOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining(queueScope),
    }))
  })

  it('repeats showroom and assignment scope in workshop checklist child read and write', async () => {
    const code = Object.values(WorkshopChecklistCode)[0]!
    expect(await updateWorkshopChecklist('workshop-a', actor, { code, completed: true, version: 1 })).toEqual({ type: 'updated' })
    expect(tx.workshopChecklistEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workshopOrder: { is: expect.objectContaining(queueScope) } }),
    }))
    expect(tx.workshopChecklistEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workshopOrder: { is: expect.objectContaining(queueScope) } }),
    }))
  })
})
