import Image from "next/image";

import avatarSrc from "../../public/img/me.png";

export default function HeaderTitle() {
  return (
    <div
      aria-label="Site title"
      className="flex items-center gap-3"
    >
      <span className="relative inline-flex h-12 w-12 overflow-hidden rounded-full border border-slate-200 shadow-sm lg:h-14 lg:w-14">
        <Image
          src={avatarSrc}
          alt="Steven's avatar"
          fill
          sizes="(min-width: 1024px) 56px, 48px"
          className="object-cover"
          priority
        />
      </span>
      <span className="font-bold tracking-tight text-slate-900" style={{ fontSize: "clamp(22px, 3vw, 40px)" }}>
        Kirkwood Steve&apos;s
      </span>
    </div>
  );
}
