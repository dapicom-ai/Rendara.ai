"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { Loader2, Zap } from "lucide-react";

function formatDatasetName(modelId: string): string {
  return modelId
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const ExecuteQueryToolUI = makeAssistantToolUI({
  toolName: "execute_query",
  render: ({ args, result, status }) => {
    const a = args as { model_id?: string } | undefined;
    const r = result as { row_count?: number; execution_ms?: number; model_id?: string } | undefined;

    const modelId = r?.model_id ?? a?.model_id ?? "data_source";
    const datasetName = formatDatasetName(modelId);
    const isRunning = status.type === "running";
    const isComplete = status.type === "complete";

    if (isComplete && r) {
      return (
        <div className="flex items-center gap-2 my-1 text-xs text-muted-foreground">
          <Zap className="size-3 text-accent shrink-0" />
          <span>
            Pulled from <span className="text-white">{datasetName}</span>
            {r.row_count != null && <> · {r.row_count} records</>}
            {r.execution_ms != null && <> · {r.execution_ms}ms</>}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-card px-4 py-3 my-2">
        <Loader2 className="size-4 animate-spin text-accent shrink-0" />
        <span className="text-sm text-white">
          Pulling from <span className="font-medium">{datasetName}</span>…
        </span>
      </div>
    );
  },
});
