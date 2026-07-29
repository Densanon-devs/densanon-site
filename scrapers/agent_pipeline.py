"""Curate daily digests via the Claude Agent SDK.

Replaces the interactive curation step of the /digest pipeline so that the
work runs headless and bills against the monthly Agent SDK credit
(effective 2026-06-15) instead of the interactive subscription bucket.

Auth prereq (one-time):
    pip install claude-agent-sdk
    claude setup-token              # browser flow, returns sk-ant-oat01-...
    setx CLAUDE_CODE_OAUTH_TOKEN sk-ant-oat01-...      (PowerShell / Windows)
    Remove-Item Env:ANTHROPIC_API_KEY  -ErrorAction Ignore

The unset is critical — ANTHROPIC_API_KEY silently outranks the OAuth token
and would re-route requests to pay-as-you-go API billing.

Pipeline position:
    fetch_all.py            -> writes scrapers/<id>/pending_digest.json
    agent_pipeline.py       -> writes scrapers/<id>/digest_content.json   (this file)
    deploy_digest.py <id>   -> renders HTML + promotes seen DB

Usage:
    python scrapers/agent_pipeline.py
    python scrapers/agent_pipeline.py --digest ai
    python scrapers/agent_pipeline.py --dry-run
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

# Force UTF-8 on Windows or the SDK's stdout writes can crash cp1252 consoles
# mid-response and surface as iter=0/calls=0 "exceptions."
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

CURATION_SYSTEM_PROMPT = """You are the editor of a daily digest. \
You receive a pool of fetched articles plus a list of allowed section names. \
Pick the 8-10 strongest articles, group them under the allowed sections, \
write 2-4 sharp takeaways per article, and write one intro paragraph for the \
whole digest.

Hard constraints:
- Output a single JSON object and nothing else (no prose, no code fences).
- Use ONLY URLs and titles from the provided article pool — never invent.
- Section names must match the allowed list exactly.
- Articles in the same section share a category; do not duplicate articles.
- Skip articles that are sales/deals, off-topic, or too thin to summarize.

Output schema:
{
  "highlights_intro": "<one paragraph, 2-3 sentences>",
  "sections": [
    {
      "name": "<one of the allowed section names>",
      "articles": [
        {
          "title": "<exact title from pool>",
          "source": "<source_name from pool>",
          "url": "<exact url from pool>",
          "takeaways": ["<takeaway>", "<takeaway>", "..."]
        }
      ]
    }
  ]
}"""


def load_config(digest_id):
    config_path = os.path.join(SCRIPT_DIR, digest_id, "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_pending(digest_id):
    pending_path = os.path.join(SCRIPT_DIR, digest_id, "pending_digest.json")
    with open(pending_path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_digest_ids():
    return sorted(
        entry for entry in os.listdir(SCRIPT_DIR)
        if os.path.isfile(os.path.join(SCRIPT_DIR, entry, "config.json"))
    )


def build_user_prompt(digest_id, config, pending):
    articles = pending.get("articles", [])
    allowed_sections = list(config.get("categories", {}).values())
    digest_name = config.get("digest_name", digest_id.upper())

    pool_lines = []
    for art in articles:
        pool_lines.append(json.dumps({
            "title": art.get("title", ""),
            "source": art.get("source_name", ""),
            "url": art.get("url", ""),
            "category": art.get("category", ""),
            "summary": art.get("summary", ""),
        }, ensure_ascii=False))

    return (
        f"Digest: {digest_name}\n"
        f"Allowed section names (use exactly these strings): "
        f"{json.dumps(allowed_sections, ensure_ascii=False)}\n"
        f"Article pool ({len(articles)} articles, one JSON per line):\n"
        + "\n".join(pool_lines)
    )


def extract_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.lstrip().startswith(("json", "JSON")):
            text = text.split("\n", 1)[1] if "\n" in text else ""
        text = text.rsplit("```", 1)[0]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model response")
    return json.loads(text[start:end + 1])


def validate_digest(content, config):
    allowed = set(config.get("categories", {}).values())
    if not isinstance(content, dict):
        raise ValueError("Top-level JSON is not an object")
    if "highlights_intro" not in content or "sections" not in content:
        raise ValueError("Missing required keys highlights_intro/sections")
    for section in content["sections"]:
        if section.get("name") not in allowed:
            raise ValueError(f"Section name {section.get('name')!r} not in allowed set {allowed}")
        for art in section.get("articles", []):
            for key in ("title", "source", "url", "takeaways"):
                if key not in art:
                    raise ValueError(f"Article missing key {key}: {art!r}")
            if not isinstance(art["takeaways"], list) or not art["takeaways"]:
                raise ValueError(f"Takeaways must be a non-empty list: {art!r}")


async def curate_one(digest_id, dry_run=False):
    config = load_config(digest_id)
    pending = load_pending(digest_id)
    articles = pending.get("articles", [])

    if not articles:
        return digest_id, "skipped (0 articles)"

    user_prompt = build_user_prompt(digest_id, config, pending)

    if dry_run:
        preview = user_prompt[:400] + ("..." if len(user_prompt) > 400 else "")
        return digest_id, f"DRY RUN — prompt {len(user_prompt)} chars, preview: {preview}"

    from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock

    options = ClaudeAgentOptions(
        system_prompt=CURATION_SYSTEM_PROMPT,
        max_turns=1,
        allowed_tools=[],
    )

    chunks = []
    async for message in query(prompt=user_prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    chunks.append(block.text)
    raw = "".join(chunks)

    try:
        content = extract_json(raw)
        validate_digest(content, config)
    except (ValueError, json.JSONDecodeError) as exc:
        debug_path = os.path.join(SCRIPT_DIR, digest_id, "digest_content.raw.txt")
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(raw)
        return digest_id, f"FAILED parse/validate: {exc} (raw saved to {debug_path})"

    out_path = os.path.join(SCRIPT_DIR, digest_id, "digest_content.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2, ensure_ascii=False)

    section_count = len(content["sections"])
    article_count = sum(len(s.get("articles", [])) for s in content["sections"])
    return digest_id, f"ok ({section_count} sections, {article_count} articles) -> {out_path}"


async def run(digest_ids, dry_run):
    results = await asyncio.gather(
        *(curate_one(d, dry_run=dry_run) for d in digest_ids),
        return_exceptions=True,
    )
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--digest", help="Curate a single digest id (default: all)")
    parser.add_argument("--dry-run", action="store_true", help="Build prompts but don't call the SDK")
    args = parser.parse_args()

    digest_ids = [args.digest] if args.digest else find_digest_ids()
    if not digest_ids:
        print("No digest configs found.", file=sys.stderr)
        sys.exit(1)

    print(f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}] "
          f"Curating {len(digest_ids)} digest(s): {', '.join(digest_ids)}")
    if args.dry_run:
        print("(dry-run mode — no SDK calls)")

    results = asyncio.run(run(digest_ids, args.dry_run))

    print()
    print("=" * 60)
    failed = 0
    for entry in results:
        if isinstance(entry, Exception):
            failed += 1
            print(f"  EXCEPTION: {entry!r}")
            continue
        digest_id, status = entry
        marker = "FAIL" if status.startswith("FAILED") else "OK"
        if status.startswith("FAILED"):
            failed += 1
        print(f"  [{marker}] {digest_id}: {status}")
    print("=" * 60)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
