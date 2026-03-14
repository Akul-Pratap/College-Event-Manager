"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Calendar, MapPin, DollarSign, Loader2, CheckCircle, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  date: string;
  fee: number;
  payment_type: "free" | "paid" | "cash";
  max_responses: number | null;
  venues?: { name: string };
  clubs?: { name: string };
}

interface FormField {
  id: string;
  label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
  placeholder: string | null;
  validation_rules: Record<string, unknown> | null;
}

export default function RegisterEventPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const dept = params?.dept as string;
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [evtRes, fieldsRes] = await Promise.all([
          fetch(`${flaskUrl}/api/events/${eventId}`, { headers }),
          fetch(`${flaskUrl}/api/events/${eventId}/form`, { headers }),
        ]);
        const [evtData, fieldsData] = await Promise.all([evtRes.json(), fieldsRes.json()]);
        setEvent(evtData.event ?? null);
        const sortedFields = (fieldsData.fields ?? []).sort(
          (a: FormField, b: FormField) => a.order_index - b.order_index
        );
        setFields(sortedFields);
        // Init answers
        const init: Record<string, string | string[]> = {};
        sortedFields.forEach((f: FormField) => {
          init[f.id] = f.field_type === "checkbox" ? [] : "";
        });
        setAnswers(init);
      } catch (err) {
        setError("Could not load event details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, flaskUrl, getToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Validate required
    for (const field of fields) {
      if (field.is_required) {
        const val = answers[field.id];
        if (!val || (Array.isArray(val) && val.length === 0) || val === "") {
          setError(`"${field.label}" is required.`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const formAnswers = fields.map((f) => ({
        field_id: f.id,
        answer: Array.isArray(answers[f.id])
          ? (answers[f.id] as string[]).join(",")
          : answers[f.id] ?? "",
      }));
      const res = await fetch(`${flaskUrl}/api/events/${eventId}/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: formAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setRegistrationId(data.registration?.id ?? null);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateAnswer(fieldId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Registered!</h1>
          <p className="text-muted-foreground mb-6">
            {event?.payment_type === "free"
              ? "Your registration is confirmed."
              : "Please complete your payment to confirm your spot."}
          </p>
          <div className="flex flex-col gap-3">
            {event?.payment_type !== "free" && (
              <Link
                href={`/dashboard/${dept}/student/payment/${eventId}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
              >
                Pay Now <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              href={`/dashboard/${dept}/student/my-events`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-foreground font-medium hover:bg-accent transition"
            >
              View My Events
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/student/events`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Register for Event</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin" />
            <p className="text-sm">Loading event…</p>
          </div>
        ) : !event ? (
          <div className="text-center py-16 text-muted-foreground">Event not found.</div>
        ) : (
          <>
            {/* Event Info Card */}
            <div className="rounded-2xl border border-border bg-card p-5 mb-6">
              {event.clubs?.name && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mb-2">
                  {event.clubs.name}
                </span>
              )}
              <h1 className="text-xl font-bold text-foreground mb-3">{event.title}</h1>
              {event.description && (
                <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  {new Date(event.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
                {event.venues?.name && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" /> {event.venues.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-primary" />
                  {event.payment_type === "free" ? "Free" : `₹${event.fee} (${event.payment_type.toUpperCase()})`}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {fields.map((field) => (
                <div key={field.id} className="rounded-2xl border border-border bg-card p-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {field.label}
                    {field.is_required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <FieldInput field={field} value={answers[field.id]} onChange={(v) => updateAnswer(field.id, v)} />
                </div>
              ))}

              {fields.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
                  No custom form fields for this event. Click Register to proceed.
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? "Registering…" : "Confirm Registration"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string | string[];
  onChange: (v: string | string[]) => void;
}) {
  const cls =
    "w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  switch (field.field_type) {
    case "textarea":
      return (
        <textarea
          className={`${cls} min-h-[100px] resize-y`}
          placeholder={field.placeholder ?? ""}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
      return (
        <select
          className={cls}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select an option…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-col gap-2">
          {field.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="accent-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <div className="flex flex-col gap-2">
          {field.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                value={opt}
                checked={(value as string[]).includes(opt)}
                onChange={(e) => {
                  const arr = value as string[];
                  onChange(
                    e.target.checked ? [...arr, opt] : arr.filter((v) => v !== opt)
                  );
                }}
                className="accent-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case "date":
      return <input type="date" className={cls} value={value as string} onChange={(e) => onChange(e.target.value)} />;
    case "time":
      return <input type="time" className={cls} value={value as string} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <input type="number" className={cls} placeholder={field.placeholder ?? ""} value={value as string} onChange={(e) => onChange(e.target.value)} />;
    case "scale":
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            value={value as string || "5"}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 accent-primary"
          />
          <span className="text-sm font-semibold text-primary w-6 text-center">
            {value || "5"}
          </span>
        </div>
      );
    default:
      return (
        <input
          type={field.field_type === "email" ? "email" : "text"}
          className={cls}
          placeholder={field.placeholder ?? ""}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
