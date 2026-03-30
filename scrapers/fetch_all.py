"""Fetch + dedup all digests in one run."""

import os
import sys
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def find_digest_ids():
    """Find all subdirectories containing a config.json."""
    digest_ids = []
    for entry in sorted(os.listdir(SCRIPT_DIR)):
        config_path = os.path.join(SCRIPT_DIR, entry, "config.json")
        if os.path.isfile(config_path):
            digest_ids.append(entry)
    return digest_ids


def main():
    digest_ids = find_digest_ids()
    if not digest_ids:
        print("No digest configs found!")
        sys.exit(1)

    print(f"Found {len(digest_ids)} digests: {', '.join(digest_ids)}")
    print()

    failed = []
    for digest_id in digest_ids:
        print(f"{'=' * 60}")
        print(f"Running fetch for: {digest_id}")
        print(f"{'=' * 60}")
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "run_digest.py"), digest_id],
            cwd=SCRIPT_DIR
        )
        if result.returncode != 0:
            failed.append(digest_id)
        print()

    if failed:
        print(f"FAILED: {', '.join(failed)}")
        sys.exit(1)
    else:
        print(f"All {len(digest_ids)} digests fetched successfully.")


if __name__ == "__main__":
    main()
