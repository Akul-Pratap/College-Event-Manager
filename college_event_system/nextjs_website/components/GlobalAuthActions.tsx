"use client";

import { useClerk, useUser } from "@clerk/nextjs";

export default function GlobalAuthActions() {
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();

  // Avoid hydration mismatch while Clerk session state initializes.
  if (!isLoaded || !user) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[60]">
      <button
        type="button"
        onClick={() => void signOut({ redirectUrl: "/sign-in" })}
        className="rounded-md border border-border bg-background/95 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm backdrop-blur hover:bg-accent"
      >
        Logout
      </button>
    </div>
  );
}
