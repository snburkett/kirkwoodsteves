import { serialize } from "next-mdx-remote/serialize";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import remarkGfm from "remark-gfm";

export async function serializeMdx(source: string): Promise<MDXRemoteSerializeResult> {
  return serialize(source, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
    },
  });
}
