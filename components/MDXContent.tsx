import { renderMdx } from "@/lib/mdx";

interface MDXContentProps {
  source: string;
}

// Renders MDX source as React on the server so client bundles stay lean.
export default async function MDXContent({ source }: MDXContentProps) {
  const Content = await renderMdx(source);

  return (
    <article className="space-y-6 leading-relaxed text-slate-800 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1.5">
      {Content}
    </article>
  );
}
