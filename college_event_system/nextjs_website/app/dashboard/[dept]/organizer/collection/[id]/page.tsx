"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MoneyCollection } from "@/components/MoneyCollection";

export default function OrganizerCollectionPage() {
  const params = useParams();
  const dept = params?.dept as string;
  const eventId = params?.id as string;

  return (
    <div className="page-container space-y-6">
      <div className="page-header">
        <h1 className="page-title">Event Money Collection</h1>
        <p className="page-subtitle">
          Update collection for this event only.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/dashboard/${dept}/organizer`} className="btn-outline text-sm py-2 px-3">
          Back to Organizer Dashboard
        </Link>
      </div>

      <div className="card-base p-5">
        <MoneyCollection eventId={eventId} />
      </div>
    </div>
  );
}
