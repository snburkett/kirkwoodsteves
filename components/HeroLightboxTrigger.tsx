"use client";

import { type ReactNode, useCallback } from "react";

import { POST_GALLERY_OPEN_EVENT, type PostGalleryOpenDetail } from "@/lib/galleryEvents";

interface HeroLightboxTriggerProps {
  fileName: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export default function HeroLightboxTrigger({
  fileName,
  title,
  className,
  style,
  children,
}: HeroLightboxTriggerProps) {
  const handleClick = useCallback(() => {
    const detail: PostGalleryOpenDetail = { fileName };
    window.dispatchEvent(new CustomEvent<PostGalleryOpenDetail>(POST_GALLERY_OPEN_EVENT, { detail }));
  }, [fileName]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={["group block w-full appearance-none text-left outline-none", className].filter(Boolean).join(" ")}
      style={style}
      aria-label={`Open ${title} image in gallery`}
    >
      {children}
    </button>
  );
}
