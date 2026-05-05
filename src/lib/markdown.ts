import { Marked } from "marked";

const marked = new Marked({
  gfm: true,
  breaks: true,
  async: false,
});

export function renderMarkdown(input: string): string {
  if (!input) return "";
  return marked.parse(input) as string;
}
