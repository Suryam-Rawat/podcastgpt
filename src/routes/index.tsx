import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/booth/studio";

type Search = { bot?: string; settings?: boolean };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const next: Search = {};
    if (typeof search.bot === "string" && search.bot) next.bot = search.bot;
    if (search.settings === true || search.settings === "1" || search.settings === "true") {
      next.settings = true;
    }
    return next;
  },
  component: Studio,
});
