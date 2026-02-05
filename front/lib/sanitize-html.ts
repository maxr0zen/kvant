/**
 * Разрешает только безопасные теги для блока текста лекции.
 */

const ALLOWED_TAGS =
  /^(p|br|strong|b|em|i|u|s|ul|ol|li|h2|h3|h4|span|div)$/i;

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
