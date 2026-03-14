"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  type: "event_photo" | "notice" | "winner";
  created_at: string;
  events?: { title: string };
}

export default function HODGalleryPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "event_photo" | "winner" | "notice">("all");

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/gallery`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setImages(data.images ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  const filtered = images.filter((img) => filter === "all" || img.type === filter);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/hod`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Department Gallery</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "event_photo", "winner", "notice"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "event_photo" ? "📸 Photos" : f === "winner" ? "🏆 Winners" : "📢 Notices"}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground self-center">{filtered.length} images</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No images found</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {filtered.map((img, i) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="break-inside-avoid rounded-xl overflow-hidden border border-border bg-muted group relative"
              >
                <img src={img.image_url} alt={img.caption ?? "Gallery image"} className="w-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  {img.caption && <p className="text-white text-xs font-medium line-clamp-2">{img.caption}</p>}
                  {img.events?.title && <p className="text-white/70 text-xs line-clamp-1">{img.events.title}</p>}
                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-white/20 text-white text-xs w-fit">
                    {img.type.replace("_", " ")}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
