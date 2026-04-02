/**
 * Разрешает только безопасные теги для блока текста лекции.
 */

const ALLOWED_TAGS =
  /^(p|br|strong|b|em|i|u|s|ul|ol|li|h2|h3|h4|span|div|code)$/i;

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderInlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}

function markdownToHtml(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) out.push("</ul>");
    if (inOl) out.push("</ol>");
    inUl = false;
    inOl = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeLists();
      continue;
    }

    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${renderInlineMarkdown(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${renderInlineMarkdown(ol[1])}</li>`);
      continue;
    }

    closeLists();

    if (line.startsWith("### ")) {
      out.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h2>${renderInlineMarkdown(line.slice(2))}</h2>`);
      continue;
    }

    out.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  closeLists();
  return out.join("");
}

function looksLikeHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

export function normalizeLectureContentToHtml(content: string): string {
  if (!content?.trim()) return "";
  return looksLikeHtml(content) ? content : markdownToHtml(content);
}

export function sanitizeLectureHtml(html: string): string {
  if (!html?.trim()) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return node;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.test(tag)) {
      return document.createTextNode(el.textContent ?? "");
    }
    const clean = document.createElement(tag);
    Array.from(node.childNodes).forEach((child) => {
      const kept = walk(child);
      if (kept) clean.appendChild(kept);
    });
    return clean;
  };
  const body = doc.body;
  const fragment = document.createDocumentFragment();
  Array.from(body.childNodes).forEach((child) => {
    const kept = walk(child);
    if (kept) fragment.appendChild(kept);
  });
  const div = document.createElement("div");
  div.appendChild(fragment);
  return div.innerHTML;
}
