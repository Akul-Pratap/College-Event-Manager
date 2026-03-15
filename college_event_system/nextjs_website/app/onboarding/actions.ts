"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { toCanonicalRole } from "@/lib/role-route";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEPARTMENT_SLUG_TO_CODE: Record<string, string> = {
  "computer-science": "CS",
  electronics: "EC",
  mechanical: "ME",
  civil: "CE",
  management: "MBA",
};

const DEPARTMENT_CODE_TO_NAME: Record<string, string> = {
  CS: "Computer Science",
  EC: "Electronics",
  ME: "Mechanical",
  CE: "Civil",
  MBA: "Management",
};

export async function completeOnboarding(department: string, role: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Not authorized" };

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const requestedRole = toCanonicalRole(role);

    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
      return { success: false, error: "No primary email found in Clerk profile." };
    }

    const supabase = createServiceClient();

    const { data: departments, error: deptError } = await supabase
      .from("departments")
      .select("id, name, code")
      .order("name", { ascending: true });

    if (deptError) {
      return {
        success: false,
        error: `Could not load departments from database: ${deptError.message}`,
      };
    }

    const departmentList = (departments ?? []) as Array<{
      id: string;
      name?: string;
      code?: string;
    }>;

    let selected = departmentList.find((d) => {
      const nameSlug = slugify(d.name ?? "");
      const codeSlug = slugify(d.code ?? "");
      return nameSlug === department || codeSlug === department;
    });

    // Fallback: map known UI slugs to canonical DB codes and re-query directly.
    if (!selected?.id) {
      const mappedCode = DEPARTMENT_SLUG_TO_CODE[department] ?? department.toUpperCase();
      const { data: deptByCode, error: deptByCodeError } = await supabase
        .from("departments")
        .select("id, name, code")
        .eq("code", mappedCode)
        .maybeSingle();

      if (deptByCodeError) {
        return {
          success: false,
          error: `Department lookup failed: ${deptByCodeError.message}`,
        };
      }

      if (deptByCode) {
        selected = deptByCode;
      }

      // Final fallback: if mapped department does not exist, create it.
      if (!selected?.id) {
        const mappedName = DEPARTMENT_CODE_TO_NAME[mappedCode] ?? department
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const { data: createdDept, error: createDeptError } = await supabase
          .from("departments")
          .insert({ name: mappedName, code: mappedCode })
          .select("id, name, code")
          .single();

        if (!createDeptError && createdDept) {
          selected = createdDept;
        }
      }
    }

    if (!selected?.id) {
      const available = departmentList.map((d) => d.code || d.name || "unknown").join(", ");
      return {
        success: false,
        error: `Department '${department}' was not found in database. Available: ${available || "none"}.`,
      };
    }

    const fullName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      user.username ||
      "User";

    const { data: upsertedUser, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          clerk_id: user.id,
          name: fullName,
          email: primaryEmail,
          role: requestedRole ?? "student",
          department_id: selected.id,
        },
        {
          onConflict: "clerk_id",
        }
      )
      .select("id")
      .single();

    if (userError) {
      return {
        success: false,
        error: `Failed to create user profile in database: ${userError.message}`,
      };
    }

    const { data: syncedUser } = await supabase
      .from("users")
      .select("role")
      .eq("clerk_id", user.id)
      .maybeSingle();

    const effectiveRole =
      toCanonicalRole((syncedUser?.role as string | undefined) ?? null) ??
      requestedRole ??
      toCanonicalRole(typeof user.publicMetadata?.role === "string" ? user.publicMetadata.role : null) ??
      "student";

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        department,
        department_id: selected.id,
        role: effectiveRole,
        supabase_user_id: upsertedUser?.id,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user metadata", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile.",
    };
  }
}
