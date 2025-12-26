#!/usr/bin/env python3
"""
generate_summary.py

Quick script to fetch a given URL, extract meaningful text using BeautifulSoup,
and produce a short extractive summary. Optionally uses Playwright to render JS-heavy
pages if run with --js or --playwright and Playwright is installed.

Usage:
  python generate_summary.py https://example.com
  python generate_summary.py https://example.com --js

Requirements:
  pip install requests beautifulsoup4
  (optional) pip install playwright && playwright install

This script is designed to be resilient and avoid heavy external NLP libraries.
It uses a lightweight frequency-based scoring to pick the most representative
sentences.
"""

import argparse
import re
import sys
from typing import Optional, List, Tuple

# Lightweight third-party imports
import requests
from bs4 import BeautifulSoup

DEFAULT_HEADERS = {
    "User-Agent": "Chrome/120.0.0.0 Safari/537.36 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
}

# Small stop-word list to ignore very common words when scoring sentences
STOPWORDS = set(
    """
    a about above after again against all am an and any are aren't as at be because been before being below
    between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each
    few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself
    him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most
    mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't
    she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then
    there there's these they they'd they'll they're they've this those through to too under until up very was
    wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why
    why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves
    """.split()
)

SENTENCE_REGEX = re.compile(r"[^.!?\n][^.!?]+[.!?]", re.M)


def normalize_url(url: str) -> str:
    url = url.strip()
    if not re.match(r"^https?://", url, re.I):
        return "https://" + url
    return url


def fetch_static(url: str, timeout=10) -> Optional[str]:
    try:
        r = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
        if r.status_code >= 400:
            return None
        return r.text
    except Exception:
        return None


def fetch_with_playwright(url: str, timeout=30) -> Optional[str]:
    """Try to use Playwright if available to render JS pages; returns page HTML or None.

    If Playwright is not installed or fails to initialize, this function returns None and
    prints helpful install instructions so the user can enable JS rendering.
    """
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        print("Playwright (Python) is not available in this environment.")
        print("To enable JS rendering, run: \n  pip install playwright\n  python -m playwright install")
        # Include the original error when available for debugging
        print('Import error:', str(e))
        return None

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, timeout=timeout * 1000)
            html = page.content()
            browser.close()
            return html
    except Exception as e:
        print('Playwright rendering failed:', str(e))
        return None


def extract_text(html: str) -> Tuple[str, List[str]]:
    """Return a large concatenated text and list of paragraphs (filtered by length)."""
    soup = BeautifulSoup(html, "html.parser")

    # Meta tags first
    metas = []
    for name in ["og:description", "description", "twitter:description"]:
        tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
        if tag and tag.get("content"):
            metas.append(tag["content"].strip())

    # Article / main
    article = soup.find("article")
    if article:
        paras = [p.get_text(strip=True) for p in article.find_all("p") if len(p.get_text(strip=True)) > 50]
        text = "\n\n".join(paras)
        if text:
            return ("\n\n".join([*metas, text]).strip(), paras)

    # Otherwise collect meaningful <p> tags across the page
    paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    paragraphs = [p for p in paragraphs if len(p) >= 40]
    if paragraphs:
        return ("\n\n".join([*metas, *paragraphs]).strip(), paragraphs)

    # Try headings + first text chunk
    h1 = (soup.find("h1") or soup.find("h2") or soup.find("h3"))
    h1_text = h1.get_text(strip=True) if h1 else ""
    body_text = soup.get_text(separator=" ", strip=True)
    body_text = re.sub(r"\s+", " ", body_text)
    fallback = (h1_text + ". " + body_text) if h1_text else body_text
    fallback = fallback.strip()

    if len(fallback) > 0:
        # break into paragraphs heuristically
        parts = re.split(r"\n\s*\n|\r\n\r\n", fallback)
        parts = [p.strip() for p in parts if len(p.strip()) >= 40]
        return (fallback[:5000], parts[:10])

    return ("", [])


def sentences_from_text(text: str) -> List[str]:
    if not text:
        return []
    # Use regex to retrieve sentences; fallback to splitting on dot
    sents = SENTENCE_REGEX.findall(text)
    if not sents:
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    return [s.strip() for s in sents if len(s.strip()) > 20]


def summarize_text(text: str, paragraphs: List[str], max_sentences: int = 3) -> Optional[str]:
    """Extractive summarizer by word-frequency scoring."""
    # Prepare sentences
    sentences = sentences_from_text(text)
    if not sentences and paragraphs:
        sentences = []
        for p in paragraphs:
            sentences.extend(sentences_from_text(p))

    if not sentences:
        return None

    # Tokenize and compute word frequencies
    freq = {}
    for word in re.findall(r"\w+", text.lower()):
        if word in STOPWORDS or len(word) < 3:
            continue
        freq[word] = freq.get(word, 0) + 1

    if not freq:
        # fallback: pick first sentences
        chosen = sentences[:max_sentences]
        return " ".join(chosen)[:600]

    # Score sentences
    sentence_scores = []
    for s in sentences:
        words = re.findall(r"\w+", s.lower())
        score = sum(freq.get(w, 0) for w in words)
        normalized = score / max(1, len(words))
        sentence_scores.append((s, normalized))

    # pick top N sentences keeping original order
    top = sorted(sentence_scores, key=lambda x: x[1], reverse=True)[: max_sentences * 2]
    # Preserve original order
    top_sents = [s for s, _ in top]
    ordered = [s for s in sentences if s in top_sents][:max_sentences]
    summary = " ".join(ordered)

    if len(summary) < 80 and len(sentences) > 0:
        # If too short, extend with following sentences
        more = [s for s in sentences if s not in ordered]
        ordered += more[: max(0, max_sentences - len(ordered))]
        summary = " ".join(ordered)

    return summary.strip()[:800]


def generate_summary_for_url(url: str, use_js: bool = False) -> Tuple[Optional[str], str]:
    url = normalize_url(url)

    # 1) Try static fetch
    html = fetch_static(url)
    reason = "static"
    if html:
        text, paras = extract_text(html)
        summary = summarize_text(text, paras)
        if summary and len(summary) >= 60:
            return (summary, reason)

    # 2) If static didn't produce, try JS render if requested and available
    if use_js:
        try:
            html = fetch_with_playwright(url)
            reason = "playwright"
            if html:
                text, paras = extract_text(html)
                summary = summarize_text(text, paras)
                if summary:
                    return (summary, reason)
        except Exception:
            pass

    # 3) Fall back: try shorter results from static if available
    if html:
        text, paras = extract_text(html)
        if text:
            summary = summarize_text(text, paras)
            if summary:
                return (summary, reason)

    return (None, reason)


def main():
    parser = argparse.ArgumentParser(description="Fetch a URL and generate a short summary (extractive).")
    parser.add_argument("url", help="URL to summarize")
    parser.add_argument("--js", action="store_true", help="Try JS rendering using Playwright if static fetch fails")
    args = parser.parse_args()

    url = args.url
    summary, reason = generate_summary_for_url(url, use_js=args.js)

    if summary:
        print(summary)
        sys.exit(0)
    else:
        print(f"No useful summary found (method tried: {reason}). Consider using --js or a headless browser for JS-heavy sites.")
        sys.exit(2)


if __name__ == "__main__":
    main()
