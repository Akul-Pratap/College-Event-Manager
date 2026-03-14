"use client";

// organizer/form-builder/[id]/page.tsx
// Uses the existing FormBuilder component from components/FormBuilder.tsx

import { useParams } from "next/navigation";
import Link from "next/link";
import { FormBuilder } from "@/components/FormBuilder";

export default function FormBuilderPage() {
  const params = useParams();
  const dept = params?.dept as string;
  const eventId = params?.id as string;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link
            href={`/dashboard/${dept}/organizer`}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            ← Back
          </Link>
          <span className="font-bold text-foreground">Form Builder</span>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <FormBuilder eventId={eventId} />
      </div>
    </div>
  );
}
