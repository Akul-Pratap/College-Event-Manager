export type UserRole =
  | "super_admin"
  | "hod"
  | "faculty_coordinator"
  | "class_incharge"
  | "organizer"
  | "volunteer"
  | "cr"
  | "student";

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
  approveEvents: boolean;
  createEvents: boolean;
  scanQR: boolean;
  viewMoneyCollection: boolean;
  editMoneyCollection: boolean;
};

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionSet> = {
  super_admin: {
    approveEvents: true,
    createEvents: true,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: false,
  },
  hod: {
    approveEvents: true,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: false,
  },
  faculty_coordinator: {
    approveEvents: false,
    createEvents: true,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: true, // faculty coordinator can also act as class incharge
  },
  class_incharge: {
    approveEvents: false,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: true,
  },
  organizer: {
    approveEvents: false,
    createEvents: true,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: true,
  },
  volunteer: {
    approveEvents: false,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: false,
    editMoneyCollection: false,
  },
  cr: {
    approveEvents: false,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: true,
    editMoneyCollection: true,
  },
  student: {
    approveEvents: false,
    createEvents: false,
    scanQR: true,
    viewMoneyCollection: false,
    editMoneyCollection: false,
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
