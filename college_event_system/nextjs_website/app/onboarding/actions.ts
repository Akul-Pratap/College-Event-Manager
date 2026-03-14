"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function completeOnboarding(department: string, role: string) {
  const { userId, getToken } = await auth();
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

    const flaskUrl =
      process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

    const deptRes = await fetch(`${flaskUrl}/api/departments`, {
      method: "GET",
      cache: "no-store",
    });

    if (!deptRes.ok) {
      return { success: false, error: "Could not load departments from API." };
    }

    const deptPayload = await deptRes.json();
    const departments = (deptPayload?.departments ?? []) as Array<{
      id: string;
      name?: string;
      code?: string;
    }>;

    const selected = departments.find((d) => {
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

    const token = await getToken();
    if (!token) {
      return { success: false, error: "Could not create auth token for profile sync." };
    }

    const regRes = await fetch(`${flaskUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerk_id: user.id,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "User",
        email: primaryEmail,
        role,
        department_id: selected.id,
      }),
    });

    const regData = await regRes.json().catch(() => ({}));
    if (!regRes.ok) {
      return {
        success: false,
        error: regData?.error ?? "Failed to create user profile in database.",
      };
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        department,
        role
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user metadata", error);
    return { success: false, error: "Failed to update profile." };
  }
}
