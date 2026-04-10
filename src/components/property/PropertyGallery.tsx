"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Image {
  url: string;
  alt?: string | null;
}

interface Props {
  images: Image[];
  title: string;
}

export default function PropertyGallery({ images, title }: Props) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400">
        No images available
      </div>
    );
  }

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <>
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-80 md:h-96 rounded-2xl overflow-hidden">
        {/* Main image */}
        <div
          className="col-span-2 row-span-2 relative cursor-pointer group"
          onClick={() => setLightbox(true)}
        >
          <img
            src={images[0]?.url}
            alt={images[0]?.alt || title}
            className="w-full h-full object-cover group-hover:brightness-90 transition"
          />
        </div>
        {/* Side images */}
        {images.slice(1, 5).map((img, i) => (
          <div
            key={i}
            className="relative cursor-pointer group"
            onClick={() => { setCurrent(i + 1); setLightbox(true); }}
          >
            <img
              src={img.url}
              alt={img.alt || `${title} photo ${i + 2}`}
              className="w-full h-full object-cover group-hover:brightness-90 transition"
            />
            {i === 3 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">+{images.length - 5} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full" onClick={() => setLightbox(false)}>
            <X className="w-6 h-6" />
          </button>
          <button className="absolute left-4 text-white p-2 hover:bg-white/20 rounded-full" onClick={(e) => { e.stopPropagation(); prev(); }}>
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img
            src={images[current]?.url}
            alt={images[current]?.alt || title}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="absolute right-4 text-white p-2 hover:bg-white/20 rounded-full" onClick={(e) => { e.stopPropagation(); next(); }}>
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="absolute bottom-4 text-white text-sm">{current + 1} / {images.length}</div>
        </div>
      )}
    </>
  );
}
