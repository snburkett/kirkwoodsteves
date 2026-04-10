import Image from "next/image";

export default function TemporaryClosureOverlay() {
  return (
    <div className="temporary-closure-overlay fixed inset-0 z-[150] flex min-h-screen items-start justify-center overflow-hidden px-6 pt-[30vh] sm:items-center sm:pt-0">
      <Image
        src="/images/chatbat/closedBat.png"
        alt="Closed bat"
        width={520}
        height={520}
        priority
        className="relative h-auto w-[min(78vw,520px)] opacity-90 drop-shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
      />
    </div>
  );
}
