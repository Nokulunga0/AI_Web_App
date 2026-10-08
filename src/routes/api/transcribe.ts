import { createFileRoute } from "@tanstack/react-router";
import { transcribe } from "@/lib/transcribe.server";

const MAX_BYTES = 24 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const len = Number(request.headers.get("content-length") ?? 0);
        if (len > MAX_BYTES + 512 * 1024) return Response.json({ error: "Audio is too large." }, { status: 413 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Transcription is not configured." }, { status: 500 });
        let file: unknown;
        try {
          file = (await request.formData()).get("file");
        } catch {
          return Response.json({ error: "Could not read the uploaded audio." }, { status: 400 });
        }
        if (!(file instanceof File) || !file.size) return Response.json({ error: "No audio received." }, { status: 400 });
        try {
          const upstream = await transcribe(
            { baseURL: "https://ai.gateway.lovable.dev", apiKey, model: "openai/gpt-transcribe", maxFileBytes: MAX_BYTES, audioOnly: false },
            file,
            { signal: request.signal },
          );
          return new Response(upstream.body, {
            status: upstream.status,
            headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
          });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          return Response.json({ error: e instanceof Error ? e.message : "Transcription failed." }, { status: 400 });
        }
      },
    },
  },
});
