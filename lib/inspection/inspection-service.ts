import 'server-only'

import { Prisma, UserRole, VehicleCheckResult, VehicleInspectionStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { inspectionShowroomWhere, showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { assessVehicleInspection, getConditionCheck, vehicleConditionChecks } from './checklist'

const editable: VehicleInspectionStatus[] = [VehicleInspectionStatus.DRAFT, VehicleInspectionStatus.IN_PROGRESS]
const active: VehicleInspectionStatus[] = [...editable, VehicleInspectionStatus.READY_FOR_REVIEW]

export function canEditVehicleInspection(actor: Pick<AdminActor, 'id' | 'role'>, inspectorId: string) {
  return actor.id === inspectorId || actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN
}

export function canReviewVehicleInspection(actor: Pick<AdminActor, 'id' | 'role'>, inspectorId: string): boolean {
  return actor.id !== inspectorId && (actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN)
}

export async function startVehicleInspection(vehicleId: string, actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({
      where: { id: vehicleId, ...showroomScopeWhere(scope) }, select: { id: true, stockNumber: true },
    })
    if (!vehicle) return { type: 'not-found' as const }
    const existing = await tx.vehicleInspection.findFirst({
      where: { vehicleId, status: { in: active } },
      select: { id: true, inspectorId: true },
    })
    if (existing && !canEditVehicleInspection(actor, existing.inspectorId)) return { type: 'busy' as const }
    if (existing) return { type: 'existing' as const, id: existing.id }

    const inspection = await tx.vehicleInspection.create({
      data: {
        vehicleId,
        inspectorId: actor.id,
        status: VehicleInspectionStatus.DRAFT,
        checks: {
          create: vehicleConditionChecks.map((item) => ({
            code: item.code,
            category: item.category,
            result: VehicleCheckResult.NOT_CHECKED,
          })),
        },
      },
      select: { id: true },
    })
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'VEHICLE_INSPECTION_STARTED',
        entity: 'VehicleInspection',
        entityId: inspection.id,
        resourceType: 'Vehicle',
        resourceId: vehicleId,
        summary: 'Started an internal vehicle condition inspection.',
      },
    })
    return { type: 'created' as const, id: inspection.id }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function updateVehicleInspectionCheck(
  inspectionId: string, actor: AdminActor,
  input: { code: string; result: VehicleCheckResult; remarks: string; version: number },
) {
  if (!getConditionCheck(input.code)) return { type: 'invalid-check' as const }
  if (input.result === VehicleCheckResult.FAIL && !input.remarks.trim()) {
    return { type: 'remarks-required' as const }
  }
  const scopeWhere = inspectionShowroomWhere(await getActorShowroomScope(actor))
  return prisma.$transaction(async (tx) => {
    const inspection = await tx.vehicleInspection.findFirst({
      where: { id: inspectionId, ...scopeWhere },
      select: { id: true, inspectorId: true, version: true, status: true, vehicleId: true },
    })
    if (!inspection || !canEditVehicleInspection(actor, inspection.inspectorId)) {
      return { type: 'not-found' as const }
    }
    if (!editable.includes(inspection.status)) return { type: 'not-editable' as const }
    if (inspection.version !== input.version) return { type: 'conflict' as const }
    const claim = await tx.vehicleInspection.updateMany({
      where: { id: inspectionId, version: input.version, status: { in: editable }, ...scopeWhere },
      data: { version: { increment: 1 }, status: VehicleInspectionStatus.IN_PROGRESS },
    })
    if (claim.count !== 1) return { type: 'conflict' as const }
    await tx.vehicleInspectionCheck.update({
      where: { inspectionId_code: { inspectionId, code: input.code } },
      data: { result: input.result, remarks: input.remarks.trim() || null },
    })
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'VEHICLE_INSPECTION_CHECK_RECORDED',
        entity: 'VehicleInspection',
        entityId: inspectionId,
        resourceType: 'Vehicle',
        resourceId: inspection.vehicleId,
        summary: 'Vehicle condition check recorded.',
        metadata: { checkCode: input.code, result: input.result },
      },
    })
    return { type: 'updated' as const, version: input.version + 1 }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function submitVehicleInspection(inspectionId: string, actor: AdminActor, version: number) {
  const scopeWhere = inspectionShowroomWhere(await getActorShowroomScope(actor))
  return prisma.$transaction(async (tx) => {
    const inspection = await tx.vehicleInspection.findFirst({
      where: { id: inspectionId, ...scopeWhere },
      select: {
        vehicleId: true, inspectorId: true, version: true, status: true,
        checks: { select: { code: true, result: true, remarks: true } },
      },
    })
    if (!inspection || !canEditVehicleInspection(actor, inspection.inspectorId)) {
      return { type: 'not-found' as const }
    }
    if (!editable.includes(inspection.status)) return { type: 'not-editable' as const }
    if (inspection.version !== version) return { type: 'conflict' as const }
    const assessment = assessVehicleInspection(inspection.checks)
    if (!assessment.canSubmit) return { type: 'not-ready' as const, assessment }
    const claim = await tx.vehicleInspection.updateMany({
      where: { id: inspectionId, version, status: { in: editable }, ...scopeWhere },
      data: { status: VehicleInspectionStatus.READY_FOR_REVIEW, version: { increment: 1 }, submittedAt: new Date() },
    })
    if (!claim.count) return { type: 'conflict' as const }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'VEHICLE_INSPECTION_SUBMITTED',
        entity: 'VehicleInspection', entityId: inspectionId,
        resourceType: 'Vehicle', resourceId: inspection.vehicleId,
        summary: 'Internal condition inspection submitted for separate review.',
        metadata: { failureCount: assessment.failures.length, criticalFailureCount: assessment.criticalFailures.length },
      },
    })
    return { type: 'submitted' as const, version: version + 1 }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function reviewVehicleInspection(
  inspectionId: string, actor: AdminActor,
  input: { approved: boolean; version: number; reviewNote: string },
) {
  if (!input.approved && input.reviewNote.trim().length < 10) return { type: 'reason-required' as const }
  return prisma.$transaction(async (tx) => {
    const inspection = await tx.vehicleInspection.findUnique({
      where: { id: inspectionId },
      select: {
        vehicleId: true, inspectorId: true, version: true, status: true,
        checks: { select: { code: true, result: true, remarks: true } },
      },
    })
    if (!inspection) return { type: 'not-found' as const }
    if (!canReviewVehicleInspection(actor, inspection.inspectorId)) {
      return { type: 'separation-of-duties' as const }
    }
    if (inspection.status !== VehicleInspectionStatus.READY_FOR_REVIEW) return { type: 'not-reviewable' as const }
    if (inspection.version !== input.version) return { type: 'conflict' as const }
    const assessment = assessVehicleInspection(inspection.checks)
    if (input.approved && !assessment.canApprove) {
      return { type: 'not-approvable' as const, assessment }
    }
    const nextStatus = input.approved ? VehicleInspectionStatus.APPROVED : VehicleInspectionStatus.REJECTED
    const claim = await tx.vehicleInspection.updateMany({
      where: { id: inspectionId, status: VehicleInspectionStatus.READY_FOR_REVIEW, version: input.version },
      data: {
        status: nextStatus,
        version: { increment: 1 },
        reviewerId: actor.id,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote.trim() || null,
      },
    })
    if (!claim.count) return { type: 'conflict' as const }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: input.approved ? 'VEHICLE_INSPECTION_APPROVED' : 'VEHICLE_INSPECTION_REJECTED',
        entity: 'VehicleInspection', entityId: inspectionId,
        resourceType: 'Vehicle', resourceId: inspection.vehicleId,
        summary: input.approved ? 'Vehicle condition inspection approved by a separate reviewer.' : 'Vehicle condition inspection rejected for remediation.',
        metadata: { failureCount: assessment.failures.length },
      },
    })
    // Do not auto-publish the vehicle or mark it certified. Those are separate gates.
    return { type: 'reviewed' as const, status: nextStatus, version: input.version + 1 }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

