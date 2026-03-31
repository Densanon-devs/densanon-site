"""Fetch + dedup for a single digest. Saves pending_digest.json for Claude Code to process."""

import json
import os
import sys
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from sources import fetch_all
from dedup import load_seen, save_seen, prune_old, filter_new


def load_config(digest_id):
    config_path = os.path.join(SCRIPT_DIR, digest_id, "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    if len(sys.argv) < 2:
        print("Usage: python run_digest.py <digest_id>  (e.g., ai, robotics, computation, gamedev)")
        sys.exit(1)

    digest_id = sys.argv[1]
    config = load_config(digest_id)
    digest_name = config.get("digest_name", digest_id.upper())

    print("=" * 60)
    print(f"{digest_name.upper()} DIGEST FETCHER - {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)

    # Step 1: Fetch from all sources
    print("\n[1/3] Fetching articles from all sources...")
    all_articles = fetch_all(config)

    # Step 2: Dedup
    print("\n[2/3] Deduplicating...")
    seen_db_path = os.path.join(SCRIPT_DIR, config["seen_db_path"])
    seen_db = load_seen(seen_db_path)
    seen_db = prune_old(seen_db)
    new_articles, seen_db = filter_new(all_articles, seen_db)

    # Step 3: Save pending digest for Claude Code to process
    print("\n[3/3] Saving pending digest...")
    pending_path = os.path.join(SCRIPT_DIR, digest_id, "pending_digest.json")

    # Cap articles and trim summaries to keep pending file manageable for the remote agent
    max_pending = config.get("max_pending_articles", 20)
    trimmed = new_articles[:max_pending]
    for art in trimmed:
        if art.get("summary") and len(art["summary"]) > 300:
            art["summary"] = art["summary"][:300] + "..."

    pending_data = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "article_count": len(trimmed),
        "total_new": len(new_articles),
        "articles": trimmed
    }
    with open(pending_path, "w", encoding="utf-8") as f:
        json.dump(pending_data, f, indent=2, ensure_ascii=False)

    # Save seen database
    save_seen(seen_db_path, seen_db)
    print(f"Seen database updated ({len(seen_db)} total entries)")

    print(f"\nPending digest saved: {len(new_articles)} new articles")
    print(f"File: {pending_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
