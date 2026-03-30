"""Render the digest into an HTML page matching the Densanon site theme."""

import html
from datetime import datetime, timezone


def render_html(digest_data, config, date_str=None):
    """Generate the full digest HTML page from digest data and config."""
    if date_str is None:
        date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

    title = config["digest_title"]
    description = config["page_description"]
    h1_prefix = config["h1_prefix"]
    footer_sources = config["footer_sources"]

    highlights = html.escape(digest_data.get("highlights_intro", ""))
    sections_html = ""

    for section in digest_data.get("sections", []):
        section_name = html.escape(section["name"])
        articles_html = ""

        for article in section.get("articles", []):
            art_title = html.escape(article.get("title", "Untitled"))
            source = html.escape(article.get("source", "Unknown"))
            url = html.escape(article.get("url", "#"))
            takeaways = article.get("takeaways", [])

            takeaways_html = "\n".join(
                f'              <li>{html.escape(t)}</li>' for t in takeaways
            )

            articles_html += f"""
          <div class="digest-card">
            <div class="digest-card-header">
              <h3>{art_title}</h3>
              <span class="digest-source">{source}</span>
            </div>
            <ul class="digest-takeaways">
{takeaways_html}
            </ul>
            <a href="{url}" target="_blank" rel="noopener" class="card-link">Read full article</a>
          </div>"""

        sections_html += f"""
      <div class="digest-section">
        <h2 class="digest-section-title">{section_name}</h2>
        <div class="digest-grid">
{articles_html}
        </div>
      </div>"""

    no_articles_msg = ""
    if not digest_data.get("sections"):
        no_articles_msg = """
      <div class="digest-empty">
        <p>No new articles today. Check back tomorrow!</p>
      </div>"""

    page_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)} - {date_str} | Densanon</title>
  <meta name="description" content="{html.escape(description)}">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/digest.css">
</head>
<body>

  <div id="site-header"></div>

  <main>
    <section class="digest-hero">
      <div class="container">
        <div class="digest-date-badge">{date_str}</div>
        <h1>{html.escape(h1_prefix)} <span>Digest</span></h1>
        <p class="digest-intro">{highlights}</p>
      </div>
    </section>

    <div class="container digest-content">
{sections_html}{no_articles_msg}

      <div class="digest-footer-note">
        <p>Curated daily from {html.escape(footer_sources)}.
        Digested by Claude. Delivered by Densanon.</p>
      </div>
    </div>
  </main>

  <div id="site-footer"></div>

  <script src="js/layout.js"></script>
</body>
</html>"""

    return page_html
