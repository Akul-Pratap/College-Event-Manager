"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";

// Returns a Supabase client authenticated with the current Clerk session.
// Use this inside client components to keep existing UI while swapping data source.
export function useClerkSupabase() {
  const { getToken } = useAuth();

  return useMemo(() => createClerkSupabaseClient(getToken), [getToken]);
}
