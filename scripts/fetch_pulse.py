#!/usr/bin/env python3
"""Generate the Kirkwood Pulse daily briefing.

This script loads configured sources, gathers recent stories, extracts article text,
summarizes each piece via OpenAI's Responses API, computes an aggregate sentiment,
and writes both JSON + Markdown outputs for the site.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import textwrap
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import feedparser
import requests
import trafilatura
import yaml
from bs4 import BeautifulSoup
from dateutil import parser as date_parser
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
import traceback

ROOT_DIR = Path(__file__).resolve().parent.parent
SOURCES_FILE = ROOT_DIR / "scripts" / "sources.yml"
STATE_FILE = ROOT_DIR / "data" / "pulse_state.json"
LATEST_JSON_FILE = ROOT_DIR / "content" / "pulse" / "latest.json"
MARKDOWN_DIR = ROOT_DIR / "content" / "pulse"
DEFAULT_SOURCE_URL = "https://kirkwoodsteves.com/pulse"
USER_AGENT = "KirkwoodPulseBot/2.0 (+https://kirkwoodsteves.com)"
OPENAI_MODEL = os.environ.get("PULSE_MODEL", "gpt-4.1-mini")
MAX_FEATURED_STORIES = int(os.environ.get("PULSE_MAX_FEATURED", "10"))
REQUEST_TIMEOUT = 20
DEBUG = False

SUMMARY_SCHEMA = {
  "name": "PulseStorySummary",
  "schema": {
    "type": "object",
    "properties": {
      "summary": {
        "type": "string",
        "description": "Concise narrative of the article (<=75 words).",
      },
      "sentiment_label": {
        "type": "string",
        "enum": ["positive", "neutral", "negative"],
      },
      "sentiment_score": {
        "type": "integer",
        "minimum": -100,
        "maximum": 100,
        "description": "Overall emotional tone ranging from -100 (very negative) to 100 (very positive).",
      },
      "priority": {
        "type": "string",
        "enum": ["high", "medium", "low"],
        "description": "How urgent or civically relevant the item feels.",
      },
      "community_impact": {
        "type": "string",
        "description": "One sentence on how this affects Kirkwood residents.",
      },
      "suggested_action": {
        "type": "string",
        "description": "Optional call-to-action the reader could take.",
      },
    },
    "required": ["summary", "sentiment_label", "sentiment_score", "priority", "community_impact"],
  },
}


@dataclass
class SourceConfig:
  name: str
  type: str
  url: str
  slug: str
  max_items: int


@dataclass
class Story:
  id: str
  source_slug: str
  source_name: str
  title: str
  url: str
  published: datetime
  excerpt: str
  content: str
  tags: List[str]


@dataclass
class StorySummary:
  summary: str
  sentiment_label: str
  sentiment_score: int
  community_impact: str
  priority: str
  suggested_action: Optional[str]


SESSION = requests.Session()
SESSION.headers.update(
  {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  }
)


def debug_log(message: str) -> None:
  if DEBUG:
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[debug {timestamp}] {message}")


def slugify(value: str) -> str:
  slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
  return slug or "source"


def trimmed_words(text: str, limit: int) -> str:
  words = text.split()
  if len(words) <= limit:
    return text
  return " ".join(words[:limit])


def load_sources_config() -> tuple[int, int, List[SourceConfig]]:
  if not SOURCES_FILE.exists():
    raise FileNotFoundError(f"Missing sources configuration: {SOURCES_FILE}")

  with SOURCES_FILE.open("r", encoding="utf-8") as handle:
    raw = yaml.safe_load(handle) or {}

  window_hours = int(raw.get("window_hours", 36))
  default_max_items = int(raw.get("max_items_per_source", 8))

  sources_data = raw.get("sources")
  if not isinstance(sources_data, list):
    raise ValueError("sources.yml must include a `sources` list.")

  sources: List[SourceConfig] = []
  for entry in sources_data:
    if not isinstance(entry, dict):
      continue
    name = entry.get("name")
    url = entry.get("url")
    source_type = (entry.get("type") or "rss").strip().lower()
    if not name or not url:
      continue
    slug = slugify(name)
    max_items = int(entry.get("max_items", default_max_items))
    sources.append(SourceConfig(name=name, type=source_type, url=url, slug=slug, max_items=max_items))

  if not sources:
    raise ValueError("No valid sources found in sources.yml.")

  debug_log(
    f"Loaded {len(sources)} sources (window={window_hours}h, default max_items={default_max_items}).",
  )
  return window_hours, default_max_items, sources


def load_state() -> Dict[str, Any]:
  if STATE_FILE.exists():
    try:
      with STATE_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)
    except json.JSONDecodeError:
      pass
  return {"seen": {}, "last_run": None}


def prune_state(state: Dict[str, Any]) -> Dict[str, Any]:
  horizon = datetime.now(tz=UTC) - timedelta(days=21)
  cleaned: Dict[str, str] = {}
  for story_id, seen_iso in state.get("seen", {}).items():
    try:
      seen_dt = datetime.fromisoformat(seen_iso)
    except ValueError:
      continue
    if seen_dt >= horizon:
      cleaned[story_id] = seen_iso
  state["seen"] = cleaned
  return state


def save_state(state: Dict[str, Any]) -> None:
  STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
  with STATE_FILE.open("w", encoding="utf-8") as handle:
    json.dump(state, handle, indent=2, sort_keys=True)
    handle.write("\n")


def parse_datetime(value: Any) -> Optional[datetime]:
  if value is None:
    return None
  if isinstance(value, datetime):
    return value.astimezone(UTC)
  if hasattr(value, "tm_year"):
    return datetime(
      year=value.tm_year,
      month=value.tm_mon,
      day=value.tm_mday,
      hour=value.tm_hour,
      minute=value.tm_min,
      second=value.tm_sec,
      tzinfo=UTC,
    )
  try:
    parsed = date_parser.parse(str(value))
  except (ValueError, TypeError):
    return None
  if parsed.tzinfo is None:
    parsed = parsed.replace(tzinfo=UTC)
  return parsed.astimezone(UTC)


def fetch_url(url: str) -> Optional[str]:
  try:
    response = SESSION.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.text
  except requests.RequestException:
    return None


def domains_related(base: str, candidate_url: str) -> bool:
  base_host = urlparse(base).netloc if "://" in base else base
  candidate_host = urlparse(candidate_url).netloc
  if not candidate_host:
    return False
  base_host = base_host.lower()
  candidate_host = candidate_host.lower()
  return candidate_host == base_host or candidate_host.endswith("." + base_host)


def extract_article(url: str, default_title: str = "") -> Optional[Tuple[str, Optional[str], Optional[datetime]]]:
  html = fetch_url(url)
  if not html:
    return None

  extraction = None
  try:
    extraction = trafilatura.bare_extraction(
      html,
      url=url,
      include_formatting=False,
      include_comments=False,
      favor_precision=True,
    )
  except Exception:
    extraction = None

  text = ""
  title = default_title
  published = None

  if extraction:
    if isinstance(extraction, dict):
      text = (extraction.get("text") or "").strip()
      title = extraction.get("title") or title
      published = parse_datetime(extraction.get("date"))
    else:
      text = (getattr(extraction, "text", "") or "").strip()
      title = getattr(extraction, "title", None) or title
      published = parse_datetime(getattr(extraction, "date", None))

  if not text:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
      tag.decompose()
    text = " ".join(soup.get_text(separator=" ").split())
    if not title:
      title = soup.title.string.strip() if soup.title and soup.title.string else default_title

  if not text:
    return None

  return text, title or default_title or url, published


def create_story_id(source_slug: str, url: str) -> str:
  digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
  return f"{source_slug}:{digest}"


def html_source_items(source: SourceConfig, cutoff: datetime) -> List[Story]:
  page_html = fetch_url(source.url)
  if not page_html:
    return []

  soup = BeautifulSoup(page_html, "html.parser")
  anchors = soup.find_all("a", href=True)

  candidates: List[Tuple[str, str]] = []
  seen_links: set[str] = set()

  for anchor in anchors:
    text = anchor.get_text(" ", strip=True)
    if not text or len(text) < 25:
      continue
    href = urljoin(source.url, anchor["href"])
    href = href.split("#")[0]
    if href in seen_links:
      continue
    if not href.lower().startswith("http"):
      continue
    if domains_related(source.url, href) is False:
      continue
    if href.lower().endswith(".pdf"):
      continue
    seen_links.add(href)
    candidates.append((href, text))
    if len(candidates) >= source.max_items:
      break

  stories: List[Story] = []
  for link, fallback_title in candidates:
    extraction = extract_article(link, fallback_title)
    if not extraction:
      continue
    text, resolved_title, published = extraction
    if published and published < cutoff:
      continue
    story_id = create_story_id(source.slug, link)
    excerpt = " ".join(text.split()[:60])
    stories.append(
      Story(
        id=story_id,
        source_slug=source.slug,
        source_name=source.name,
        title=resolved_title.strip(),
        url=link,
        published=published or datetime.now(tz=UTC),
        excerpt=excerpt,
        content=text,
        tags=[],
      )
    )

  return stories


def rss_source_items(source: SourceConfig, cutoff: datetime) -> List[Story]:
  feed = feedparser.parse(source.url, agent=USER_AGENT)

  items: List[Story] = []
  count = 0
  for entry in feed.entries:
    if count >= source.max_items:
      break
    link = entry.get("link")
    if not link:
      continue

    published = (
      parse_datetime(getattr(entry, "published_parsed", None))
      or parse_datetime(getattr(entry, "updated_parsed", None))
      or parse_datetime(entry.get("published"))
      or parse_datetime(entry.get("updated"))
    )
    if published and published < cutoff:
      continue

    extraction = extract_article(link, entry.get("title") or source.name)
    if not extraction:
      continue
    text, resolved_title, resolved_published = extraction
    final_published = resolved_published or published or datetime.now(tz=UTC)
    if final_published < cutoff:
      continue

    tags: List[str] = []
    for tag in entry.get("tags") or []:
      if isinstance(tag, dict):
        term = tag.get("term")
        if term:
          tags.append(str(term))
      else:
        tags.append(str(tag))

    story_id = create_story_id(source.slug, link)
    excerpt = entry.get("summary") or entry.get("description") or " ".join(text.split()[:60])
    excerpt = " ".join(excerpt.split())

    items.append(
      Story(
        id=story_id,
        source_slug=source.slug,
        source_name=source.name,
        title=resolved_title.strip(),
        url=link,
        published=final_published,
        excerpt=excerpt,
        content=text,
        tags=tags,
      )
    )
    count += 1

  items.sort(key=lambda story: story.published, reverse=True)
  return items


def collect_stories(sources: Iterable[SourceConfig], cutoff: datetime) -> Tuple[List[Story], int]:
  collected: List[Story] = []
  considered = 0
  for source in sources:
    if source.type == "html":
      stories = html_source_items(source, cutoff)
    else:
      stories = rss_source_items(source, cutoff)
    collected.extend(stories)
    considered += len(stories)
    debug_log(f"{source.name}: gathered {len(stories)} candidate stories.")
  collected.sort(key=lambda story: story.published, reverse=True)
  debug_log(f"Total candidates gathered: {len(collected)} (considered={considered}).")
  return collected, considered


def select_new_stories(stories: List[Story], seen: Dict[str, str]) -> List[Story]:
  fresh: List[Story] = []
  for story in stories:
    if story.id in seen:
      continue
    fresh.append(story)
    if len(fresh) >= MAX_FEATURED_STORIES:
      break
  return fresh


@retry(wait=wait_exponential(multiplier=2, min=2, max=10), stop=stop_after_attempt(3))
def summarize_story(client: OpenAI, story: Story) -> StorySummary:
  prompt = textwrap.dedent(
    f"""
    Provide a JSON summary for the following local news item.

    Source: {story.source_name}
    Title: {story.title}
    Published: {story.published.isoformat()}
    URL: {story.url}

    Article text:
    {trimmed_words(story.content, 900)}
    """
  ).strip()

  response = client.responses.create(
    model=OPENAI_MODEL,
    input=[
      {"role": "system", "content": "You are a civic analyst helping residents stay informed. Always respond with a single JSON object matching the required schema."},
      {"role": "user", "content": prompt},
    ],
    temperature=0.2,
  )

  json_payload = getattr(response, "output_text", None)

  if not json_payload and getattr(response, "output", None):
    for block in response.output:
      if block.type == "message":
        for segment in block.content:
          candidate = getattr(segment, "text", None)
          if not candidate and hasattr(segment, "json_schema"):
            candidate = json.dumps(segment.json_schema, ensure_ascii=False)
          if candidate:
            json_payload = candidate
            break
      else:
        candidate = getattr(block, "text", None)
        if candidate:
          json_payload = candidate
      if json_payload:
        break

  if not json_payload:
    raise RuntimeError("OpenAI response did not return JSON payload.")

  cleaned_payload = json_payload.strip()
  if cleaned_payload.startswith("```"):
    lines = cleaned_payload.splitlines()
    # Drop the opening ```json (or ```), and the closing ``` if present.
    if len(lines) >= 2:
      if lines[0].startswith("```"):
        lines = lines[1:]
      if lines and lines[-1].startswith("```"):
        lines = lines[:-1]
      cleaned_payload = "\n".join(lines).strip()

  if DEBUG:
    debug_log(f"OpenAI payload for '{story.title}': {cleaned_payload}")

  data = json.loads(cleaned_payload)

  summary_field = data.get("summary", "")
  if isinstance(summary_field, dict):
    # Convert nested structures to bullet-style text.
    parts: List[str] = []

    def flatten(prefix: str, value: Any) -> None:
      if isinstance(value, dict):
        parts.append(f"{prefix}:")
        for key, child in value.items():
          flatten(f"  {key}", child)
      elif isinstance(value, list):
        parts.append(f"{prefix}:")
        for item in value:
          flatten("  -", item)
      else:
        parts.append(f"{prefix}: {value}")

    for key, value in summary_field.items():
      flatten(key, value)
    summary_text = "\n".join(parts)
  else:
    summary_text = str(summary_field).strip()

  sentiment_label = data.get("sentiment_label", "neutral")
  sentiment_score = int(data.get("sentiment_score", 0))
  community_impact = str(data.get("community_impact", "")).strip() or "Impact unclear based on automatically extracted text."
  priority = data.get("priority", "medium")
  suggested_action = data.get("suggested_action", None) or None

  return StorySummary(
    summary=summary_text or story.excerpt,
    sentiment_label=sentiment_label,
    sentiment_score=sentiment_score,
    community_impact=community_impact,
    priority=priority,
    suggested_action=suggested_action,
  )


def safe_summarize(client: OpenAI, story: Story) -> StorySummary:
  try:
    return summarize_story(client, story)
  except Exception as error:
    if DEBUG:
      print(f"[debug] Exception while summarizing '{story.title}': {error}", file=sys.stderr)
      traceback.print_exc()
    fallback_summary = StorySummary(
      summary=" ".join(story.excerpt.split()[:80]) or story.title,
      sentiment_label="neutral",
      sentiment_score=0,
      community_impact="Impact unclear based on automatically extracted text.",
      priority="medium",
      suggested_action=None,
    )
    print(f"[warn] Failed to summarize {story.title}: {error}", file=sys.stderr)
    return fallback_summary


def compute_sentiment(items: List[Dict[str, Any]]) -> Tuple[int, str, str]:
  if not items:
    return 0, "Even Keel", "No new stories were summarized today."

  avg_score = sum(item["sentiment_score"] for item in items) / len(items)
  avg_score = round(avg_score)

  positive = sum(1 for item in items if item["sentiment"] == "positive")
  negative = sum(1 for item in items if item["sentiment"] == "negative")
  neutral = len(items) - positive - negative

  if avg_score >= 40:
    label = "Bright Skies"
  elif avg_score >= 10:
    label = "Tailwind"
  elif avg_score > -10:
    label = "Even Keel"
  elif avg_score > -40:
    label = "Watchful"
  else:
    label = "Storm Warning"

  rationale = (
    f"Mix of {positive} positive, {neutral} neutral, and {negative} negative stories. "
    f"Average sentiment lands at {avg_score}."
  )

  return avg_score, label, rationale


def convert_sentiment_to_vibe(score: int, label: str, rationale: str) -> Dict[str, Any]:
  normalized = max(0, min(100, round((score + 100) / 2)))
  return {
    "score": normalized,
    "label": label,
    "rationale": rationale,
    "raw_score": score,
  }


def pick_call_to_action(items: List[Dict[str, Any]]) -> str:
  if not items:
    return "Check back tomorrow for the next Kirkwood Pulse."

  priority_order = {"high": 0, "medium": 1, "low": 2}
  sorted_items = sorted(items, key=lambda item: (priority_order.get(item["priority"], 2), -abs(item["sentiment_score"])))
  top = sorted_items[0]

  if top.get("suggested_action"):
    return top["suggested_action"]
  return f"Keep an eye on {top['title']} from {top['source']['name']}."


def write_latest_json(payload: Dict[str, Any]) -> None:
  LATEST_JSON_FILE.parent.mkdir(parents=True, exist_ok=True)
  with LATEST_JSON_FILE.open("w", encoding="utf-8") as handle:
    json.dump(payload, handle, indent=2, ensure_ascii=False)
    handle.write("\n")


def write_markdown(payload: Dict[str, Any], run_time: datetime) -> None:
  MARKDOWN_DIR.mkdir(parents=True, exist_ok=True)
  slug_date = run_time.strftime("%Y-%m-%d")
  filename = f"pulse-{slug_date}.mdx"
  file_path = MARKDOWN_DIR / filename

  vibe = payload["vibe"]
  sentiment = payload["sentiment"]

  lines = [
    "---",
    f'title: "Kirkwood Pulse • {run_time.strftime("%B %d, %Y")}"',
    f"slug: pulse-{slug_date}",
    f'date: "{run_time.isoformat()}"',
    "type: pulse",
    f'sourceUrl: "{DEFAULT_SOURCE_URL}"',
    "---",
    "",
    f"_Autogenerated on {run_time.strftime('%A, %B %d, %Y at %H:%M %Z')} • {payload['stories_featured']} stories from the last {payload['window_hours']} hours._",
    "",
    f"## {payload['headline']}",
    "",
    payload["overview"],
    "",
    "### Vibe-O-Meter",
    "",
    f"- Score (0-100): {vibe['score']}",
    f"- Sentiment (-100..100): {sentiment['score']}",
    f"- Mood: {vibe['label']}",
    f"- Why: {vibe['rationale']}",
    "",
    "### Stories worth a look",
    "",
  ]

  if not payload["items"]:
    lines.append("_No fresh stories surfaced in this window._")
  else:
    for item in payload["items"]:
      detail_parts = [
        item["ai_summary"],
        f"Impact: {item['community_impact']}",
        f"Sentiment: {item['sentiment']} ({item['sentiment_score']})",
        f"Priority: {item['priority']}",
      ]
      detail = " ".join(part for part in detail_parts if part)
      link_text = f" [Read more]({item['link']})" if item.get("link") else ""
      lines.append(f"- **{item['title']}** ({item['source']['name']}) — {detail}{link_text}")

  lines.extend(
    [
      "",
      payload["call_to_action"],
      "",
    ]
  )

  with file_path.open("w", encoding="utf-8") as handle:
    handle.write("\n".join(lines).strip() + "\n")


def update_state_with_stories(state: Dict[str, Any], stories: List[Story], run_time: datetime) -> Dict[str, Any]:
  seen = state.setdefault("seen", {})
  iso = run_time.isoformat()
  for story in stories:
    seen[story.id] = iso
  state["last_run"] = iso
  return state


def build_item_payload(story: Story, summary: StorySummary) -> Dict[str, Any]:
  return {
    "id": story.id,
    "source": {"id": story.source_slug, "name": story.source_name},
    "title": story.title,
    "link": story.url,
    "published": story.published.isoformat(),
    "excerpt": story.excerpt,
    "tags": story.tags,
    "ai_summary": summary.summary,
    "sentiment": summary.sentiment_label,
    "sentiment_score": summary.sentiment_score,
    "community_impact": summary.community_impact,
    "priority": summary.priority,
    "suggested_action": summary.suggested_action,
  }


def aggregate_overview(items: List[Dict[str, Any]]) -> str:
  if not items:
    return "No new items were available within the configured window."
  top_items = items[: min(3, len(items))]
  sentences = [entry["ai_summary"] for entry in top_items]
  return " ".join(sentences)


def run(fetch_limit: Optional[int] = None) -> int:
  global DEBUG
  # DEBUG value will be set in main when args are parsed.
  openai_api_key = os.environ.get("OPENAI_API_KEY")
  if not openai_api_key:
    print("OPENAI_API_KEY is not set. Aborting.", file=sys.stderr)
    return 1

  window_hours, _, sources = load_sources_config()
  state = prune_state(load_state())
  cutoff = datetime.now(tz=UTC) - timedelta(hours=window_hours)

  stories, considered = collect_stories(sources, cutoff)
  seen = state.get("seen", {})
  new_stories = select_new_stories(stories, seen)
  if fetch_limit is not None:
    new_stories = new_stories[:fetch_limit]

  debug_log(
    f"Fresh stories selected: {len(new_stories)} (limit={fetch_limit or MAX_FEATURED_STORIES}).",
  )

  client = OpenAI()
  enriched_items: List[Dict[str, Any]] = []
  for story in new_stories:
    debug_log(f"Summarizing story: {story.title} ({story.source_name})")
    summary = safe_summarize(client, story)
    enriched_items.append(build_item_payload(story, summary))

  sentiment_score, sentiment_label, sentiment_rationale = compute_sentiment(enriched_items)
  vibe = convert_sentiment_to_vibe(sentiment_score, sentiment_label, sentiment_rationale)
  call_to_action = pick_call_to_action(enriched_items)
  generated_at = datetime.now(tz=UTC)

  payload = {
    "generated_at": generated_at.isoformat(),
    "window_hours": window_hours,
    "stories_considered": considered,
    "stories_featured": len(enriched_items),
    "headline": f"Kirkwood Pulse • {generated_at.strftime('%B %d, %Y')}",
    "overview": aggregate_overview(enriched_items),
    "items": enriched_items,
    "vibe": vibe,
    "sentiment": {
      "score": sentiment_score,
      "label": sentiment_label,
      "rationale": sentiment_rationale,
    },
    "call_to_action": call_to_action,
  }

  write_latest_json(payload)
  write_markdown(payload, generated_at)
  update_state_with_stories(state, new_stories, generated_at)
  save_state(state)

  debug_log(f"Wrote latest.json with {len(enriched_items)} items and sentiment {sentiment_score}.")

  print(
    f"Generated pulse with {len(enriched_items)} stories (considered {considered}) "
    f"and sentiment {sentiment_score}.",
  )

  return 0


def parse_args(argv: List[str]) -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Generate the Kirkwood Pulse daily digest.")
  parser.add_argument("--limit", type=int, default=None, help="Limit the number of stories summarized.")
  parser.add_argument(
    "--debug",
    action="store_true",
    help="Print detailed progress information while fetching and summarizing stories.",
  )
  return parser.parse_args(argv)


def main(argv: List[str]) -> int:
  args = parse_args(argv)
  global DEBUG
  DEBUG = args.debug
  if DEBUG:
    debug_log("Debug logging enabled.")
  return run(fetch_limit=args.limit)


if __name__ == "__main__":
  sys.exit(main(sys.argv[1:]))
