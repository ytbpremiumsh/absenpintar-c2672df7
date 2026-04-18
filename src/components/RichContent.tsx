import DOMPurify from "dompurify";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  html: string;
  className?: string;
}

export function RichContent({ html, className }: Props) {
  const clean = useMemo(() => DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
  }), [html]);
  return (
    <div
      className={cn("rich-content prose prose-sm dark:prose-invert max-w-none break-words", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
