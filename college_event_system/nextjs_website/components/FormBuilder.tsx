/// <reference types="react" />
"use client";
import { useAuth } from "@clerk/nextjs";
import React, { useState, useCallback } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Wand2, Save } from "lucide-react";

type FieldType = "short_answer" | "paragraph" | "multiple_choice" | "checkboxes" | "dropdown" | "linear_scale" | "date" | "time" | "file_upload" | "section_header";

interface FormField {
  id: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  options: string[];
  order_index: number;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "short_answer", label: "Short Answer" },
  { value: "paragraph", label: "Paragraph" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" },
  { value: "linear_scale", label: "Linear Scale" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "file_upload", label: "File Upload" },
  { value: "section_header", label: "Section Header" },
];

function SortableField({ field, onUpdate, onRemove }: { key?: string | number; field: FormField; onUpdate: (id: string, updates: Partial<FormField>) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const hasOptions = ["multiple_choice", "checkboxes", "dropdown"].includes(field.field_type);

  return (
    <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-1 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input
              value={field.label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate(field.id, { label: e.target.value })}
              placeholder={field.field_type === "section_header" ? "Section Title" : "Question"}
              className="flex-1 border-0 border-b border-border bg-transparent text-sm font-medium focus:outline-none focus:border-primary pb-1"
            />
            <select
              value={field.field_type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onUpdate(field.id, { field_type: e.target.value as FieldType })}
              className="border border-border rounded-lg px-2 py-1 text-xs bg-background"
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
          </div>

          {hasOptions && (
            <div className="space-y-1.5 pl-2">
              {field.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                  <input
                    value={opt}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newOpts = [...field.options];
                      newOpts[i] = e.target.value;
                      onUpdate(field.id, { options: newOpts });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 border-b border-border bg-transparent text-xs focus:outline-none focus:border-primary"
                  />
                  <button onClick={() => onUpdate(field.id, { options: field.options.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => onUpdate(field.id, { options: [...field.options, ""] })} className="text-xs text-primary hover:underline">
                + Add option
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={field.is_required}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate(field.id, { is_required: e.target.checked })}
              className="rounded"
            />
            Required
          </label>
          <button onClick={() => onRemove(field.id)} className="text-muted-foreground hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface FormBuilderProps {
  eventId: string;
  eventType?: string;
  initialFields?: FormField[];
  onSaved?: () => void;
}

export function FormBuilder({ eventId, eventType = "general", initialFields = [], onSaved }: FormBuilderProps) {
  const { getToken } = useAuth();
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [saving, setSaving] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: "",
      field_type: "short_answer",
      is_required: false,
      options: [],
      order_index: fields.length,
    };
    setFields((prev) => [...prev, newField]);
  };

  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDragEnd = ({ active, over }: import("@dnd-kit/core").DragEndEvent) => {
    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === String(active.id));
        const newIndex = items.findIndex((i) => i.id === String(over!.id));
        return arrayMove(items, oldIndex, newIndex).map((f, i) => ({ ...f, order_index: i }));
      });
    }
  };

  const loadAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/ai/suggest-form`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: eventType }),
      });
      const data = await res.json();
      const suggested: FormField[] = (data.suggestions || []).map((s: { label?: string; field_type?: string; required?: boolean; options?: string[] }, i: number) => ({
        id: `ai-${Date.now()}-${i}`,
        label: s.label || "",
        field_type: (s.field_type || "short_answer") as FieldType,
        is_required: s.required || false,
        options: s.options || [],
        order_index: fields.length + i,
      }));
      setFields((prev) => [...prev, ...suggested]);
    } catch {
      alert("Failed to get AI suggestions.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const saveForm = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/events/${eventId}/form`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: fields.map((f, i) => ({ ...f, order_index: i })) }),
      });
      if (res.ok) {
        onSaved?.();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save form.");
      }
    } catch {
      alert("Failed to save form.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Form Builder</h3>
        <div className="flex gap-2">
          <button
            onClick={loadAISuggestions}
            disabled={loadingSuggestions}
            className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/5"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {loadingSuggestions ? "Loading..." : "AI Suggest"}
          </button>
          <button
            onClick={saveForm}
            disabled={saving}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Form"}
          </button>
        </div>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
          No fields yet. Add a field or use AI Suggest.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((field) => (
              <SortableField key={field.id} field={field} onUpdate={updateField} onRemove={removeField} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={addField}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border text-muted-foreground rounded-xl py-3 text-sm hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Field
      </button>
    </div>
  );
}
