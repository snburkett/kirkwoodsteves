import type { ComponentPropsWithoutRef } from "react";

import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import MonteCarloWheelSimulator from "@/components/MonteCarloWheelSimulator";
import SimpleMacroTracker from "@/components/SimpleMacroTracker";

const merge = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

const components = {
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a {...props} className={merge("text-blue-600 hover:text-blue-500", props.className)} />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      {...props}
      className={merge("rounded bg-slate-100 px-1 py-0.5 font-mono text-sm", props.className)}
    />
  ),
  MonteCarloWheelSimulator,
  SimpleMacroTracker,
};

export async function renderMdx(source: string) {
  const { content } = await compileMDX({
    source,
    components,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  });

  return content;
}
