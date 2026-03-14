"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Image as ImageIcon, Upload, Loader2, Trash2, X, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef } from "react";

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  type: "event_photo" | "notice" | "winner";
  created_at: string;
}

export default function OrganizerGalleryPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;
  const eventId = params?.id as string;

  const [eventTitle, setEventTitle] = useState("");
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [type, setType] = useState<GalleryImage["type"]>("event_photo");
  const [preview, setPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [evtRes, galRes] = await Promise.all([
          fetch(`${flaskUrl}/api/events/${eventId}`, { headers }),
          fetch(`${flaskUrl}/api/events/${eventId}/gallery`, { headers }),
        ]);
        const [evtData, galData] = await Promise.all([evtRes.json(), galRes.json()]);
        setEventTitle(evtData.event?.title ?? "Event");
        setImages(galData.images ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, flaskUrl, getToken]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function handleUpload() {
    if (!file) { setError("Select an image first."); return; }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("image", file);
      formData.append("caption", caption.trim());
      formData.append("type", type);
      const res = await fetch(`${flaskUrl}/api/events/${eventId}/gallery`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImages((prev) => [data.image, ...prev]);
      setFile(null);
      setPreview(null);
      setCaption("");
      setSuccess("Image uploaded successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(imgId: string) {
    const token = await getToken();
    const res = await fetch(`${flaskUrl}/api/gallery/${imgId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setImages((prev) => prev.filter((img) => img.id !== imgId));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/organizer`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground truncate">Gallery — {eventTitle}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Upload panel */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Upload Image</h2>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={preview} alt="Preview" className="w-full max-h-48 object-contain bg-muted" />
              <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition text-muted-foreground">
              <ImageIcon className="w-8 h-8" />
              <span className="text-sm">Click to select image</span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="event_photo">Event Photo</option>
                <option value="winner">Winner</option>
                <option value="notice">Notice</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Caption (optional)</label>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Winners of Round 1"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          {success && <div className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {success}</div>}
          <button onClick={handleUpload} disabled={uploading || !file}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>

        {/* Gallery grid */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : images.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No images uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, i) => (
              <motion.div key={img.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted">
                <img src={img.image_url} alt={img.caption ?? "Gallery"} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  {img.caption && <p className="text-white text-xs text-center">{img.caption}</p>}
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">{img.type.replace("_", " ")}</span>
                  <button onClick={() => deleteImage(img.id)}
                    className="w-8 h-8 rounded-full bg-destructive/80 flex items-center justify-center hover:bg-destructive transition">
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
