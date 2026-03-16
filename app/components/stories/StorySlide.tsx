import React from "react";
import { MarkdownRenderer } from "@/app/components/ui/MarkdownRenderer";
import { VizChartBlock } from "@/app/components/viz";
import { MermaidBlock } from "@/app/components/viz";
import type { VizSpec } from "@/types/viz";

type VisualizationBlock =
  | { type: "viz_chart"; spec: VizSpec }
  | { type: "mermaid"; definition: string };

interface StorySlideData {
  id?: string;
  title: string;
  content: string;
  visualizations?: VisualizationBlock[];
  notes?: string;
}

interface StorySlideProps {
  slide: StorySlideData;
  slideNumber: number;
  totalSlides: number;
  presentationMode?: boolean;
}

export function StorySlide({
  slide,
  slideNumber,
  totalSlides,
  presentationMode,
}: StorySlideProps) {
  return (
    <div
      className="w-full flex flex-col bg-[#0F1117] rounded-xl overflow-hidden"
      style={{ aspectRatio: "16 / 9" }}
    >
      {/* Slide content area */}
      <div className="flex flex-col flex-1 p-8 gap-6 overflow-hidden">
        {/* Title */}
        <h2 className="text-2xl font-bold text-white leading-tight">
          {slide.title}
        </h2>

        {/* Content - rendered as markdown */}
        <div className={`overflow-y-auto ${slide.visualizations?.length ? 'max-h-[40%] shrink-0' : 'flex-1'}`}>
          <MarkdownRenderer content={slide.content} />
        </div>

        {/* Visualizations — takes remaining space when present */}
        {slide.visualizations && slide.visualizations.length > 0 && (
          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
            {slide.visualizations.map((block, idx) => {
              if (block.type === "viz_chart") {
                return (
                  <VizChartBlock
                    key={idx}
                    blockId={`${slide.id ?? slideNumber}-viz-${idx}`}
                    spec={block.spec}
                    status="complete"
                    readOnly={true}
                    showPinButton={false}
                    allowExpand={true}
                  />
                );
              }
              if (block.type === "mermaid") {
                return (
                  <MermaidBlock
                    key={idx}
                    blockId={`${slide.id ?? slideNumber}-mmd-${idx}`}
                    definition={block.definition}
                    status="complete"
                    readOnly={true}
                    showPinButton={false}
                    allowExpand={true}
                    compact={true}
                  />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {/* Slide number footer (hidden in presentation mode) */}
      {!presentationMode && (
        <div className="px-8 py-3 border-t border-border flex justify-end">
          <span className="text-xs text-[#8892A4]">
            {slideNumber} / {totalSlides}
          </span>
        </div>
      )}

      {/* Speaker notes (only shown outside presentation mode) */}
      {!presentationMode && slide.notes && (
        <div className="px-8 py-3 border-t border-border bg-[#1A1D27]">
          <p className="text-xs text-[#8892A4]">
            <span className="font-medium text-[#00D4FF]">Notes: </span>
            {slide.notes}
          </p>
        </div>
      )}
    </div>
  );
}
