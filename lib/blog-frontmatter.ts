import { isIntent, isLevel, isTemplate, isTopic } from './blog-standard';
import { markdownLinks, mediaImageId } from './journal-markdown';

/** The fields of the head block of a pasted post (admin spec, section 5). Everything is a string; unknown values stay empty. */
export type PostFields = {
  h1: string; seoTitle: string; meta: string; slug: string; keyword: string; variations: string;
  intent: string; template: string; level: string; topic: string; author: string; date: string; coverAlt: string;
};

export type ParsedPaste = {
  fields: Partial<PostFields>;
  body: string;
  hadHead: boolean;
  /** Keys of the head block that are not part of the format; they are ignored. */
  unknownKeys: string[];
  /** Fields that had a value the form does not accept (for example template: Z); they are left empty. */
  invalid: string[];
  /** https:// pictures in the body: the editor offers to copy them into the photo library. */
  externalImages: string[];
};

const KEYS: Record<string, keyof PostFields> = {
  h1: 'h1', seo_title: 'seoTitle', meta: 'meta', slug: 'slug', keyword: 'keyword', variations: 'variations', intent: 'intent',
  template: 'template', level: 'level', topic: 'topic', author: 'author', date: 'date', cover_alt: 'coverAlt',
};

const unquote = (value: string) => value.trim().replace(/^(["'“”‘’])(.*)\1$/, '$2').trim();

/**
 * Reads a whole post pasted from the Google Doc: a head block between two "---" lines (key: value), then the Markdown.
 * Without a head block everything is the body. Fields not in the block are simply not set, so the form keeps what it had.
 */
export function parsePastedPost(input: string): ParsedPaste {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const first = lines.findIndex(line => line.trim() !== '');
  const result: ParsedPaste = { fields: {}, body: text.trim(), hadHead: false, unknownKeys: [], invalid: [], externalImages: [] };
  if (first >= 0 && /^---\s*$/.test(lines[first])) {
    const end = lines.findIndex((line, index) => index > first && /^---\s*$/.test(line));
    if (end > first) {
      result.hadHead = true;
      for (const line of lines.slice(first + 1, end)) {
        const colon = line.indexOf(':');
        if (colon < 1) continue;
        const rawKey = line.slice(0, colon).trim().toLowerCase().replace(/[\s-]+/g, '_');
        const key = KEYS[rawKey];
        if (!key) { if (rawKey) result.unknownKeys.push(rawKey); continue; }
        let value = unquote(line.slice(colon + 1));
        if (!value) continue;
        if (key === 'template' || key === 'level') value = value.toUpperCase();
        if (key === 'intent' || key === 'topic') value = value.toLowerCase();
        const accepted = key === 'template' ? isTemplate(value) : key === 'level' ? isLevel(value) : key === 'intent' ? isIntent(value) : key === 'topic' ? isTopic(value)
          : key === 'date' ? /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) : true;
        if (accepted) result.fields[key] = value; else result.invalid.push(key);
      }
      result.body = lines.slice(end + 1).join('\n').trim();
    }
  }
  result.externalImages = [...new Set(markdownLinks(result.body).filter(link => link.image && /^https:\/\//i.test(link.url) && !mediaImageId(link.url)).map(link => link.url))];
  return result;
}
