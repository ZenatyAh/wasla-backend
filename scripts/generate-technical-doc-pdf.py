#!/usr/bin/env python3
"""Generate a styled PDF from the Wasla technical implementation markdown document."""

from __future__ import annotations

import html
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "wasla-technical-implementation-document.md"
HTML_PATH = ROOT / "docs" / "wasla-technical-implementation-document.html"
PDF_PATH = ROOT / "docs" / "Wasla-Technical-Implementation-Document.pdf"


def escape(text: str) -> str:
    return html.escape(text, quote=False)


def render_inline(text: str) -> str:
    text = escape(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    return text


def render_codeblock(code: str, lang: str = "") -> str:
    cls = f' class="language-{lang}"' if lang else ""
    return f"<pre><code{cls}>{escape(code.rstrip())}</code></pre>"


def markdown_to_html(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    in_code = False
    code_lang = ""
    code_lines: list[str] = []
    in_table = False
    table_rows: list[str] = []

    def flush_table() -> None:
        nonlocal in_table, table_rows
        if not table_rows:
            return
        out.append('<table class="data-table">')
        for idx, row in enumerate(table_rows):
            cells = [c.strip() for c in row.strip("|").split("|")]
            tag = "th" if idx == 0 else "td"
            out.append("<tr>" + "".join(f"<{tag}>{render_inline(c)}</{tag}>" for c in cells) + "</tr>")
        out.append("</table>")
        table_rows = []
        in_table = False

    while i < len(lines):
        line = lines[i]

        if line.startswith("```"):
            if not in_code:
                flush_table()
                in_code = True
                code_lang = line[3:].strip()
                code_lines = []
            else:
                out.append(render_codeblock("\n".join(code_lines), code_lang))
                in_code = False
                code_lang = ""
                code_lines = []
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        if line.strip().startswith("|") and "|" in line.strip()[1:]:
            if not in_table:
                flush_table()
                in_table = True
            table_rows.append(line)
            i += 1
            continue
        elif in_table:
            flush_table()

        if line.startswith("# "):
            out.append(f"<h1>{render_inline(line[2:].strip())}</h1>")
        elif line.startswith("## "):
            out.append(f"<h2>{render_inline(line[3:].strip())}</h2>")
        elif line.startswith("### "):
            out.append(f"<h3>{render_inline(line[4:].strip())}</h3>")
        elif line.startswith("---"):
            out.append("<hr/>")
        elif line.strip().startswith("- "):
            out.append(f"<ul><li>{render_inline(line.strip()[2:])}</li></ul>")
        elif re.match(r"^\d+\.\s", line.strip()):
            out.append(f"<ol start=\"{line.strip().split('.')[0]}\"><li>{render_inline(re.sub(r'^\\d+\\.\\s*', '', line.strip()))}</li></ol>")
        elif line.strip() == "":
            out.append("")
        else:
            out.append(f"<p>{render_inline(line.strip())}</p>")
        i += 1

    if in_table:
        flush_table()

    return "\n".join(out)


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Wasla Technical Implementation Document</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" />
  <style>
    @page {
      size: A4;
      margin: 20mm 18mm 22mm 18mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1a1a1a;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    .cover {
      page-break-after: always;
      min-height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 2rem 0;
    }
    .cover h1 {
      font-size: 28pt;
      margin-bottom: 0.5rem;
      color: #0f172a;
      border: none;
    }
    .cover .subtitle {
      font-size: 13pt;
      color: #475569;
      margin-bottom: 2rem;
    }
    .cover .meta {
      font-size: 11pt;
      color: #334155;
      line-height: 1.8;
    }
    .toc {
      page-break-after: always;
      padding-top: 1rem;
    }
    .toc h2 {
      font-size: 18pt;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 0.4rem;
    }
    .toc ol {
      font-size: 11pt;
      line-height: 1.9;
    }
    h1 {
      font-size: 20pt;
      color: #0f172a;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 0.35rem;
      margin-top: 2rem;
      page-break-before: always;
    }
    h1:first-of-type { page-break-before: auto; }
    h2 {
      font-size: 13pt;
      color: #1e40af;
      margin-top: 1.4rem;
      border-left: 4px solid #2563eb;
      padding-left: 0.6rem;
    }
    h3 {
      font-size: 11pt;
      color: #334155;
      margin-top: 1rem;
    }
    p { margin: 0.45rem 0; }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 1.2rem 0;
    }
    code {
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: 9pt;
      background: #f1f5f9;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.8rem 1rem;
      overflow-x: auto;
      page-break-inside: avoid;
      margin: 0.7rem 0 1rem;
    }
    pre code {
      background: transparent;
      padding: 0;
      font-size: 8.5pt;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.8rem 0 1rem;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    table.data-table th,
    table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 0.45rem 0.55rem;
      text-align: left;
      vertical-align: top;
    }
    table.data-table th {
      background: #eff6ff;
      font-weight: 600;
    }
    ul, ol {
      margin: 0.35rem 0 0.6rem 1.2rem;
      padding: 0;
    }
    li { margin: 0.2rem 0; }
    .content { padding-top: 0.5rem; }
    .footer-note {
      margin-top: 2rem;
      font-size: 9pt;
      color: #64748b;
      font-style: italic;
    }
  </style>
</head>
<body>
  <section class="cover">
    <h1>Wasla Platform</h1>
    <div class="subtitle">Technical Implementation Document</div>
    <div class="meta">
      <strong>Graduation Project — Software Engineering</strong><br/>
      Backend Repository Analysis: wasla-backend<br/>
      Stack: Next.js · Express · PostgreSQL · Prisma · FastAPI · JWT · Socket.IO
    </div>
  </section>

  <section class="toc">
    <h2>Table of Contents</h2>
    <ol>
      <li>User Login</li>
      <li>User Registration</li>
      <li>Create Post</li>
      <li>View Home Feed</li>
      <li>View Post Details</li>
      <li>Apply to Post</li>
      <li>Contact Post Owner</li>
      <li>Create Service Contract</li>
      <li>Record Work Session</li>
      <li>Resolve Contract at Maximum End Date</li>
      <li>View Recommended Posts</li>
      <li>Appendix A — System Architecture Summary</li>
    </ol>
  </section>

  <section class="content">
    __BODY__
  </section>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
  <script>hljs.highlightAll();</script>
</body>
</html>
"""


def generate_pdf() -> None:
    md = MD_PATH.read_text(encoding="utf-8")
    body = markdown_to_html(md)
    html_doc = HTML_TEMPLATE.replace("__BODY__", body)
    HTML_PATH.write_text(html_doc, encoding="utf-8")

    chrome = "/usr/bin/google-chrome"
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=10000",
        f"--print-to-pdf={PDF_PATH}",
        HTML_PATH.as_uri(),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr or result.stdout, file=sys.stderr)
        raise SystemExit(result.returncode)

    print(f"HTML: {HTML_PATH}")
    print(f"PDF:  {PDF_PATH}")


if __name__ == "__main__":
    generate_pdf()
