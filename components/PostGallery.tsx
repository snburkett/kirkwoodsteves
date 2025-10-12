"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

import { POST_GALLERY_OPEN_EVENT, type PostGalleryOpenDetail } from "@/lib/galleryEvents";
import type { PostImage } from "@/lib/types";

interface PostGalleryProps {
  title: string;
  heroImage?: PostImage;
  images: PostImage[];
}

export default function PostGallery({ title, heroImage, images }: PostGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const lightboxImages = useMemo(() => {
    const ordered = heroImage ? [heroImage, ...images] : images;
    const seen = new Set<string>();
    return ordered.filter((image) => {
      if (seen.has(image.fileName)) {
        return false;
      }
      seen.add(image.fileName);
      return true;
    });
  }, [heroImage, images]);
  const totalImages = lightboxImages.length;
  const hasLightbox = totalImages > 0;
  const heroAppearsInThumbnails = heroImage != null && images.length === 0;
  const thumbnails = heroAppearsInThumbnails ? (heroImage ? [heroImage] : []) : images;

  const openLightbox = useCallback(
    (index: number) => {
      if (!hasLightbox) {
        return;
      }
      setActiveIndex(index);
    },
    [hasLightbox],
  );

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const showNext = useCallback(() => {
    if (!hasLightbox) {
      return;
    }
    setActiveIndex((current) => {
      if (current === null) {
        return current;
      }
      return (current + 1) % totalImages;
    });
  }, [hasLightbox, totalImages]);

  const showPrev = useCallback(() => {
    if (!hasLightbox) {
      return;
    }
    setActiveIndex((current) => {
      if (current === null) {
        return current;
      }
      return (current - 1 + totalImages) % totalImages;
    });
  }, [hasLightbox, totalImages]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!hasLightbox) {
      return;
    }

    function handleOpen(event: Event) {
      const customEvent = event as CustomEvent<PostGalleryOpenDetail>;
      const targetFile = customEvent.detail?.fileName;

      if (totalImages === 0) {
        return;
      }

      if (typeof targetFile === "string") {
        const index = lightboxImages.findIndex((image) => image.fileName === targetFile);
        setActiveIndex(index >= 0 ? index : 0);
        return;
      }

      setActiveIndex(0);
    }

    window.addEventListener(POST_GALLERY_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(POST_GALLERY_OPEN_EVENT, handleOpen);
  }, [hasLightbox, lightboxImages, totalImages]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrev();
      }
    }

    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", handleKey);
    };
  }, [activeIndex, closeLightbox, showNext, showPrev]);

  const activeImage = useMemo(() => {
    if (activeIndex === null) {
      return null;
    }
    return lightboxImages[activeIndex] ?? null;
  }, [activeIndex, lightboxImages]);

  if (!heroImage && thumbnails.length === 0) {
    return null;
  }

  const lightbox = (
    <AnimatePresence>
      {activeImage ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ marginTop: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLightbox}
        >
          <motion.div
            className="relative mx-4 flex max-h-[100vh] max-w-[96vw] items-center justify-center overflow-hidden"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-[80vh] w-[90vw] max-h-[900px] max-w-[1100px]">
              <Image
                src={activeImage.src}
                alt={`${title} gallery image`}
                fill
                priority
                className="object-contain"
                sizes="100vw"
              />
            </div>
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white shadow-lg transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
            >
              Close
            </button>
            {totalImages > 1 ? (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white shadow-lg transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white shadow-lg transition hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
                  aria-label="Next image"
                >
                  ›
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
                  {activeIndex! + 1} / {totalImages}
                </span>
              </>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gallery</h2>
          <p className="text-sm text-slate-500">Click any photo to view it full-size.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {thumbnails.map((image, index) => {
            const lightboxIndex = heroImage ? (heroAppearsInThumbnails ? 0 : index + 1) : index;
            const sequenceNumber = index + 1;
            return (
              <button
                type="button"
                key={image.src}
                onClick={() => openLightbox(lightboxIndex)}
                className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`View ${title} image ${sequenceNumber}`}
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={image.src}
                    alt={`${title} gallery image ${sequenceNumber}`}
                    fill
                    className="object-cover transition duration-200 group-hover:scale-105"
                    sizes="(min-width: 1280px) 320px, (min-width: 1024px) 280px, (min-width: 768px) 45vw, 100vw"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
      {portalTarget ? createPortal(lightbox, portalTarget) : lightbox}
    </>
  );
}
