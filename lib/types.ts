export type SectionName = "emporium" | "pulse" | "ai" | "oddities";

export interface BaseFrontMatter {
  title: string;
  slug: string;
  date: string; // ISO string for consistency
  tags?: string[];
}

export interface EmporiumFrontMatter extends BaseFrontMatter {
  type: "emporium";
  priceUSD: number;
  condition: string;
  images: string[];
  status: "available" | "pending" | "sold";
}

export interface PulseFrontMatter extends BaseFrontMatter {
  type: "pulse";
  sourceUrl: string;
}

export interface AIFrontMatter extends BaseFrontMatter {
  type: "ai";
  attachments?: string[];
}

export interface OdditiesFrontMatter extends BaseFrontMatter {
  type: "oddities";
}

export type FrontMatter =
  | EmporiumFrontMatter
  | PulseFrontMatter
  | AIFrontMatter
  | OdditiesFrontMatter;

export type Post = FrontMatter & {
  section: SectionName;
  body: string;
  filePath: string;
};

export interface SearchIndexItem {
  section: SectionName;
  slug: string;
  title: string;
  date: string;
  tags?: string[];
  extras?: Record<string, unknown>;
}
