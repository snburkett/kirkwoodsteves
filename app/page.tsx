import HeaderTitle from "./(components)/HeaderTitle";
import QuadrantWheelNav from "./(components)/QuadrantWheelNav";
import Link from "next/link";

const sections = [
  {
    id: "emporium",
    title: "Emporium",
    blurb: "Rare hardware and artifacts curated for the curious buyer.",
  },
  {
    id: "pulse",
    title: "Pulse",
    blurb: "Signals from local governance, civic data, and fast-moving feeds.",
  },
  {
    id: "ai",
    title: "AI Lab",
    blurb: "Notebooks and playbooks for practical orchestration work.",
  },
  {
    id: "oddities",
    title: "Oddities",
    blurb: "Loose threads, prototypes, and things that defy tidy labels.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
        <header className="order-1 space-y-4 text-center lg:order-none lg:w-[420px] lg:text-left">
          <div className="relative inline-flex max-w-full items-start justify-start lg:ml-0 lg:-mb-8 lg:pl-4">
            <HeaderTitle />
          </div>
          <p className="text-lg text-slate-600">
            A staging ground for civic tech, small-batch AI workflows, and the curious marketplace orbiting them.
          </p>
        </header>
        <section className="order-0 w-full px-4 sm:px-6 lg:order-none lg:w-auto lg:px-0">
          <div className="relative mx-auto flex max-w-[600px] items-start justify-center lg:-mt-6 lg:ml-[-48px] lg:block">
            <div className="pointer-events-none absolute -top-4 left-6 hidden h-6 w-16 bg-gradient-to-r from-slate-50 via-transparent to-transparent lg:block" />
            <QuadrantWheelNav />
          </div>
        </section>
      </div>
      <section className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={`/${section.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600">
              {section.title}
            </h2>
            <p className="mt-3 text-slate-600">{section.blurb}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
