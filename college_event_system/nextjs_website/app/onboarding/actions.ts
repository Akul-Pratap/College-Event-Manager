"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function completeOnboarding(department: string, role: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Not authorized" };

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

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

    const selected = departmentList.find((d) => {
      const nameSlug = slugify(d.name ?? "");
      const codeSlug = slugify(d.code ?? "");
      return nameSlug === department || codeSlug === department;
    });

    if (!selected?.id) {
      return {
        success: false,
        error: `Department '${department}' was not found in database.`,
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
          role,
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

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        department,
        department_id: selected.id,
        role,
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
