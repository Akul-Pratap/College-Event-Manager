# Website Role Hierarchy and Dataset Privileges

## Role Hierarchy (Website)

1. `super_admin`
2. `hod`
3. `faculty_coordinator`
4. `class_incharge`
5. `organizer`
6. `volunteer`
7. `cr`
8. `student`

## Policy Rules Implemented (Website)

- HOD has broad dashboard access but cannot edit money collection.
- Faculty coordinator cannot approve events.
- Faculty coordinator can also act as class incharge (same person, dual role). When `secondary_role` is set to `class_incharge` in user metadata, all class_incharge permissions are added on top of the primary role.
- A student can also hold `organizer`, `volunteer`, or `cr` as a secondary role. CR (Class Representative) is inherently a student with additional class-level privileges. When `secondary_role` is set, the student dashboard shows a **"[role] view" switcher button** in the header, linking directly to the organizer, volunteer, or CR dashboard.
- Any role combination is supported via the optional `secondary_role` field in Clerk user metadata.
- Only class advisor (`class_incharge`) and CR can edit class-level money entries.
- Organizer can edit money collection only through event-specific organizer collection screens.
- Super admin cannot edit money collection from website flows.
- QR scan page is available as a shared route for any authenticated user in a department.

## Dataset and Privilege Matrix

| Dataset / Feature | super_admin | hod | faculty_coordinator | class_incharge | organizer |   volunteer | cr | student |
|---|---|---|---|---|---|---|---|---|
| Events (view) | yes | yes | yes | yes | yes | yes | yes | yes |
| Events (create) | yes | no | yes | no | yes | no | no | no |
| Event approvals | yes | yes | no | no | no | no | no | no |
| Money collection (view) | yes | yes | yes | yes | yes | no | yes | no |
| Money collection (edit) | no | no | yes (own class)(selected event) | yes (own class) | yes (selected event) | no | yes (own class) | no |
| Duty leave review | no | no | yes | no | no | no | no | no |
| QR attendance scan | yes | yes | yes | yes | yes | yes | yes | yes |
| Payment submission (UPI/cash flow) | no | no | no | no | yes | yes | yes | yes |

## Payment and QR Behavior

- Paid events can carry a UPI ID at event creation time.
- Student payment page generates an event-specific UPI deep link.
- Student payment page renders a QR image from that event-specific UPI deep link.
- Users can tap `Open UPI App` to redirect directly into UPI payment apps.

## Notes

- This file documents website behavior. API/DB enforcement should remain aligned in Flask and SQL policies.
- Single editable source for website role hierarchy and permissions: `college_event_system/nextjs_website/lib/role-policy.ts`.
