"""Deduplication: track seen articles and filter to new ones only."""

import json
import os
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, urlunparse


def normalize_url(url):
    """Normalize a URL for dedup comparison."""
    parsed = urlparse(url.strip().rstrip("/"))
    # Remove fragments and query params for matching
    normalized = urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        parsed.path.rstrip("/"),
        "", "", ""
    ))
    return normalized


def load_seen(db_path):
    """Load the seen articles database."""
    if not os.path.exists(db_path):
        return {}
    with open(db_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_seen(db_path, seen_db):
    """Save the seen articles database."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(seen_db, f, indent=2, ensure_ascii=False)


def prune_old(seen_db, days=90):
    """Remove entries older than N days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pruned = {
        url: data for url, data in seen_db.items()
        if data.get("first_seen", "") > cutoff
    }
    removed = len(seen_db) - len(pruned)
    if removed > 0:
        print(f"  Pruned {removed} old entries from seen database")
    return pruned


def filter_new(articles, seen_db):
    """Filter articles to only those not yet seen (also drops repeats within this
    batch). Does not modify seen_db; call mark_seen on the articles actually kept."""
    new_articles = []
    batch = set()
    for article in articles:
        norm_url = normalize_url(article["url"])
        if norm_url not in seen_db and norm_url not in batch:
            batch.add(norm_url)
            new_articles.append(article)

    print(f"  {len(new_articles)} new articles (out of {len(articles)} total)")
    return new_articles


def mark_seen(articles, seen_db):
    """Record articles as seen. Only articles that reached the pending file should
    be marked, so ones cut by the pool cap can show up in a later digest."""
    now = datetime.now(timezone.utc).isoformat()
    for article in articles:
        seen_db[normalize_url(article["url"])] = {
            "title": article["title"],
            "source": article["source_name"],
            "first_seen": now,
            "category": article["category"]
        }
    return seen_db


def cap_round_robin(articles, limit):
    """Take up to `limit` articles, one per source in turn, so the sources listed
    last in the config are not cut every day by a first-N cap."""
    by_source = {}
    for article in articles:
        by_source.setdefault(article["source_name"], []).append(article)
    queues = list(by_source.values())
    picked = []
    while len(picked) < limit and queues:
        for q in queues:
            if q and len(picked) < limit:
                picked.append(q.pop(0))
        queues = [q for q in queues if q]
    # Keep the original fetch order in the output
    order = {id(a): i for i, a in enumerate(articles)}
    return sorted(picked, key=lambda a: order[id(a)])
