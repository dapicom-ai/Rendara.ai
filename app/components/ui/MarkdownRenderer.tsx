"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-invert prose-sm max-w-none",
        "prose-headings:text-white prose-p:text-[#8892A4]",
        "prose-strong:text-white prose-li:text-[#8892A4]",
        "prose-code:text-[#00D4FF] prose-code:bg-[#1A1D27]",
        "prose-a:text-[#00D4FF]",
        "prose-table:text-sm prose-th:text-[#8892A4] prose-td:text-white",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
