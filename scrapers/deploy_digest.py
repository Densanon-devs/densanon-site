"""Render a digest from digest_content.json and write HTML to the site root.
Called by Claude Code after it generates the digest content.
Does NOT perform git operations — the caller handles commit/push."""

import json
import os
import sys
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from render import render_html


def load_config(digest_id):
    config_path = os.path.join(SCRIPT_DIR, digest_id, "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    if len(sys.argv) < 2:
        print("Usage: python deploy_digest.py <digest_id> [digest_content.json]")
        print("  e.g., python deploy_digest.py ai")
        print("  e.g., python deploy_digest.py ai ai/digest_content.json")
        sys.exit(1)

    digest_id = sys.argv[1]
    config = load_config(digest_id)

    # Default digest content path
    if len(sys.argv) >= 3:
        digest_path = sys.argv[2]
    else:
        digest_path = os.path.join(SCRIPT_DIR, digest_id, "digest_content.json")

    with open(digest_path, "r", encoding="utf-8") as f:
        digest_data = json.load(f)

    # Render HTML
    date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
    html_content = render_html(digest_data, config, date_str)

    # Write to site root (parent of scrapers/)
    site_root = os.path.dirname(SCRIPT_DIR)
    output_path = os.path.join(site_root, config["output_file"])
    print(f"Writing digest to {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"{config['digest_name']} digest rendered successfully.")


if __name__ == "__main__":
    main()
