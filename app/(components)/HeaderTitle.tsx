import { brand } from "../(theme)/tokens";

export default function HeaderTitle() {
  return (
    <div
      aria-label="Site title"
      className="relative z-30 flex items-center gap-3 lg:-ml-4 lg:-mt-4"
    >
      <span
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-full lg:h-14 lg:w-14"
        style={{ backgroundColor: `${brand.accent}20` }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          role="img"
          aria-hidden="true"
          className="text-slate-700"
        >
          <circle cx="20" cy="20" r="18" fill="currentColor" fillOpacity="0.08" />
          <circle cx="14.5" cy="16" r="2" fill="currentColor" />
          <circle cx="24.5" cy="16" r="2" fill="currentColor" />
          <path
            d="M14 24c1.8 2.1 4.2 3.2 6 3.2s4.2-1.1 6-3.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M27 28c3.5 1 5.5 3.1 6.6 5.9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            transform="rotate(-18 27 28)"
          />
          <path
            d="M31 33c1.4-0.6 2.7-1.1 4.2-1.4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            transform="rotate(-12 31 33)"
          />
        </svg>
        <span
          className="absolute bottom-[3px] right-[-14px] hidden h-3 w-6 rounded-full bg-slate-700/80 blur-[1px] lg:block"
        />
      </span>
      <span
        className="font-bold tracking-tight"
        style={{
          fontSize: "clamp(20px, 3vw, 38px)",
          color: brand.neutrals.text,
        }}
      >
        Kirkwood Steve&apos;s
      </span>
    </div>
  );
}
