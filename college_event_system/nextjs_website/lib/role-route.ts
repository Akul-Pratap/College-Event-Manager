export const ROLE_TO_ROUTE_SEGMENT: Record<string, string> = {
  super_admin: "super-admin",
  faculty_coordinator: "faculty-coordinator",
  class_incharge: "class-incharge",
  hod: "hod",
  organizer: "organizer",
  volunteer: "volunteer",
  cr: "cr",
  student: "student",
};

const ROUTE_SEGMENT_TO_ROLE: Record<string, string> = Object.entries(
  ROLE_TO_ROUTE_SEGMENT
).reduce<Record<string, string>>((acc, [role, segment]) => {
  acc[segment] = role;
  return acc;
}, {});

export function toCanonicalRole(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim().replace(/-/g, "_");
  return ROLE_TO_ROUTE_SEGMENT[normalized] ? normalized : undefined;
}

export function toRouteRoleSegment(
  value: string | null | undefined
): string | undefined {
  const canonical = toCanonicalRole(value);
  return canonical ? ROLE_TO_ROUTE_SEGMENT[canonical] : undefined;
}

export function routeSegmentToCanonicalRole(
  value: string | null | undefined
): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (ROUTE_SEGMENT_TO_ROLE[normalized]) {
    return ROUTE_SEGMENT_TO_ROLE[normalized];
  }
  return toCanonicalRole(normalized);
}
