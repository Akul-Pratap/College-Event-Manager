export type UserRole =
  | "super_admin"
  | "hod"
  | "faculty_coordinator"
  | "class_incharge"
  | "organizer"
  | "volunteer"
  | "cr"
  | "student";

/**
 * Secondary roles that can be stacked on top of a primary role via Clerk user metadata.
 * These are a subset of `UserRole`, so they can be safely used as keys in `ROLE_PERMISSIONS`.
 */
export type SecondaryRole = Extract<
  UserRole,
  "class_incharge" | "organizer" | "volunteer" | "cr"
>;

export const ROLE_HIERARCHY: UserRole[] = [
  "super_admin",
  "hod",
  "faculty_coordinator",
  "class_incharge",
  "organizer",
  "volunteer",
  "cr",
  "student",
];

type RolePermissionSet = {
  /** Can approve or reject pending event requests. */
  approveEvents: boolean;
  /** Can create new events. */
  createEvents: boolean;
  /** Can use the QR attendance scanner. */
  scanQR: boolean;
  /** Can view money collection reports. */
  viewMoneyCollection: boolean;
  /**
   * Can edit money collection entries.
   * Scoping rules:
   *   - faculty_coordinator: own class + selected event
   *   - class_incharge: own class only
   *   - organizer: selected event only (via organizer collection screens)
   *   - cr: own class only
   */
  editMoneyCollection: boolean;
  /** Can review and approve/reject duty leave requests. */
  reviewDutyLeave: boolean;
  /** Can submit UPI or cash payments for an event (e.g. collecting fees from attendees). */
  submitPayment: boolean;
};

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionSet> = {
  super_admin: {
    approveEvents: true,
    createEvents: true,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: false,
    reviewDutyLeave: false,
    submitPayment: false,
  },
  hod: {
    approveEvents: true,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: false,
    reviewDutyLeave: false,
    submitPayment: false,
  },
  faculty_coordinator: {
    approveEvents: false,
    createEvents: true,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: true, // own class + selected event; scoping enforced by the API/UI
    reviewDutyLeave: true,
    submitPayment: false,
  },
  class_incharge: {
    approveEvents: false,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: true, // own class only
    reviewDutyLeave: false,
    submitPayment: false,
  },
  organizer: {
    approveEvents: false,
    createEvents: true,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: true, // selected event only, via organizer collection screens
    reviewDutyLeave: false,
    submitPayment: true,
  },
  volunteer: {
    approveEvents: false,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: false,
    editMoneyCollection: false,
    reviewDutyLeave: false,
    submitPayment: true,
  },
  cr: {
    approveEvents: false,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: true, // own class only
    reviewDutyLeave: false,
    submitPayment: true,
  },
  student: {
    approveEvents: false,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: false,
    editMoneyCollection: false,
    reviewDutyLeave: false,
    submitPayment: true,
  },
};

export function canApproveEvents(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].approveEvents;
}

export function canCreateEvents(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].createEvents;
}

export function canScanQR(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].scanQR;
}

export function canViewMoneyCollection(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].viewMoneyCollection;
}

export function canEditMoneyCollection(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].editMoneyCollection;
}

export function canReviewDutyLeave(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].reviewDutyLeave;
}

export function canSubmitPayment(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].submitPayment;
}

/**
 * Returns the merged permission set for a user who holds both a primary role
 * and an optional secondary role (e.g. student + organizer, faculty_coordinator + class_incharge).
 * Any `true` value in either set wins.
 */
export function getMergedPermissions(
  primaryRole: UserRole,
  secondaryRole?: SecondaryRole | null
): RolePermissionSet {
  const primary = ROLE_PERMISSIONS[primaryRole];
  if (!secondaryRole) return primary;
  const secondary = ROLE_PERMISSIONS[secondaryRole];
  return {
    approveEvents: primary.approveEvents || secondary.approveEvents,
    createEvents: primary.createEvents || secondary.createEvents,
    scanQR: primary.scanQR || secondary.scanQR,
    viewMoneyCollection: primary.viewMoneyCollection || secondary.viewMoneyCollection,
    editMoneyCollection: primary.editMoneyCollection || secondary.editMoneyCollection,
    reviewDutyLeave: primary.reviewDutyLeave || secondary.reviewDutyLeave,
    submitPayment: primary.submitPayment || secondary.submitPayment,
  };
}
