import { VehicleCheckResult } from '@prisma/client'

/** Fixed v1 condition checklist; a migration-backed inspection snapshots each code. */
export const vehicleConditionChecks = [
  {
    "code": "DOCUMENTS_01",
    "category": "Documents",
    "label": "VIN and chassis number match",
    "critical": true
  },
  {
    "code": "DOCUMENTS_02",
    "category": "Documents",
    "label": "Registration and ownership record",
    "critical": false
  },
  {
    "code": "DOCUMENTS_03",
    "category": "Documents",
    "label": "Outstanding finance or lien check",
    "critical": true
  },
  {
    "code": "DOCUMENTS_04",
    "category": "Documents",
    "label": "Insurance document status",
    "critical": false
  },
  {
    "code": "DOCUMENTS_05",
    "category": "Documents",
    "label": "Service records consistency",
    "critical": false
  },
  {
    "code": "DOCUMENTS_06",
    "category": "Documents",
    "label": "Pollution or emissions certificate",
    "critical": false
  },
  {
    "code": "EXTERIOR_01",
    "category": "Exterior",
    "label": "Panel alignment",
    "critical": false
  },
  {
    "code": "EXTERIOR_02",
    "category": "Exterior",
    "label": "Paint defects",
    "critical": false
  },
  {
    "code": "EXTERIOR_03",
    "category": "Exterior",
    "label": "Body corrosion",
    "critical": false
  },
  {
    "code": "EXTERIOR_04",
    "category": "Exterior",
    "label": "Structural or frame damage",
    "critical": true
  },
  {
    "code": "EXTERIOR_05",
    "category": "Exterior",
    "label": "Windscreen and other glass",
    "critical": false
  },
  {
    "code": "EXTERIOR_06",
    "category": "Exterior",
    "label": "Exterior lamps",
    "critical": false
  },
  {
    "code": "EXTERIOR_07",
    "category": "Exterior",
    "label": "Wipers and washers",
    "critical": false
  },
  {
    "code": "EXTERIOR_08",
    "category": "Exterior",
    "label": "Mirrors and trim",
    "critical": false
  },
  {
    "code": "MECHANICAL_01",
    "category": "Mechanical",
    "label": "Engine oil condition",
    "critical": false
  },
  {
    "code": "MECHANICAL_02",
    "category": "Mechanical",
    "label": "Engine leaks",
    "critical": false
  },
  {
    "code": "MECHANICAL_03",
    "category": "Mechanical",
    "label": "Coolant and overheating",
    "critical": false
  },
  {
    "code": "MECHANICAL_04",
    "category": "Mechanical",
    "label": "Exhaust and emissions",
    "critical": false
  },
  {
    "code": "MECHANICAL_05",
    "category": "Mechanical",
    "label": "Belts and hoses",
    "critical": false
  },
  {
    "code": "MECHANICAL_06",
    "category": "Mechanical",
    "label": "Battery and charging",
    "critical": false
  },
  {
    "code": "MECHANICAL_07",
    "category": "Mechanical",
    "label": "Electronic diagnostic faults",
    "critical": false
  },
  {
    "code": "MECHANICAL_08",
    "category": "Mechanical",
    "label": "Air conditioning",
    "critical": false
  },
  {
    "code": "CHASSIS_01",
    "category": "Chassis",
    "label": "Brake system",
    "critical": true
  },
  {
    "code": "CHASSIS_02",
    "category": "Chassis",
    "label": "Brake pads and discs",
    "critical": false
  },
  {
    "code": "CHASSIS_03",
    "category": "Chassis",
    "label": "Tyre tread and age",
    "critical": true
  },
  {
    "code": "CHASSIS_04",
    "category": "Chassis",
    "label": "Suspension components",
    "critical": false
  },
  {
    "code": "CHASSIS_05",
    "category": "Chassis",
    "label": "Steering response",
    "critical": true
  },
  {
    "code": "CHASSIS_06",
    "category": "Chassis",
    "label": "Wheels and rims",
    "critical": false
  },
  {
    "code": "CHASSIS_07",
    "category": "Chassis",
    "label": "Wheel alignment",
    "critical": false
  },
  {
    "code": "INTERIOR_01",
    "category": "Interior",
    "label": "Seats and restraints",
    "critical": false
  },
  {
    "code": "INTERIOR_02",
    "category": "Interior",
    "label": "Upholstery condition",
    "critical": false
  },
  {
    "code": "INTERIOR_03",
    "category": "Interior",
    "label": "Infotainment electronics",
    "critical": false
  },
  {
    "code": "INTERIOR_04",
    "category": "Interior",
    "label": "Instrument warning lights",
    "critical": false
  },
  {
    "code": "INTERIOR_05",
    "category": "Interior",
    "label": "Seat-belt operation",
    "critical": true
  },
  {
    "code": "INTERIOR_06",
    "category": "Interior",
    "label": "Airbag or safety-system faults",
    "critical": true
  },
  {
    "code": "INTERIOR_07",
    "category": "Interior",
    "label": "Door locks and windows",
    "critical": false
  },
  {
    "code": "ROADTEST_01",
    "category": "RoadTest",
    "label": "Cold start",
    "critical": false
  },
  {
    "code": "ROADTEST_02",
    "category": "RoadTest",
    "label": "Acceleration",
    "critical": false
  },
  {
    "code": "ROADTEST_03",
    "category": "RoadTest",
    "label": "Transmission and clutch",
    "critical": false
  },
  {
    "code": "ROADTEST_04",
    "category": "RoadTest",
    "label": "Brake performance",
    "critical": true
  },
  {
    "code": "ROADTEST_05",
    "category": "RoadTest",
    "label": "Unexpected road noise",
    "critical": false
  },
  {
    "code": "ROADTEST_06",
    "category": "RoadTest",
    "label": "Handling and tracking",
    "critical": false
  },
  {
    "code": "ROADTEST_07",
    "category": "RoadTest",
    "label": "Parking and reverse systems",
    "critical": false
  }
] as const

export type VehicleConditionCode = (typeof vehicleConditionChecks)[number]['code']

export function getConditionCheck(code: string) {
  return vehicleConditionChecks.find((check) => check.code === code) ?? null
}

export function assessVehicleInspection(
  recorded: Array<{ code: string; result: VehicleCheckResult; remarks: string | null }>,
) {
  const byCode = new Map(recorded.map((check) => [check.code, check]))
  const unchecked: string[] = []
  const failures: string[] = []
  const criticalFailures: string[] = []
  const missingRemarks: string[] = []
  for (const check of vehicleConditionChecks) {
    const result = byCode.get(check.code)
    if (!result || result.result === VehicleCheckResult.NOT_CHECKED) {
      unchecked.push(check.code)
    } else if (result.result === VehicleCheckResult.FAIL) {
      failures.push(check.code)
      if (check.critical) criticalFailures.push(check.code)
      if (!result.remarks?.trim()) missingRemarks.push(check.code)
    }
  }
  return {
    total: vehicleConditionChecks.length,
    completed: vehicleConditionChecks.length - unchecked.length,
    unchecked,
    failures,
    criticalFailures,
    missingRemarks,
    canSubmit: unchecked.length === 0 && missingRemarks.length === 0,
    canApprove: unchecked.length === 0 && failures.length === 0,
  }
}
