"use client";

import { useState, useTransition } from "react";
import { updateNotes } from "@/app/backlog/actions";
import { NOTES_MAX_LENGTH } from "@/lib/backlog";

type Status =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function NotesEditor({
  itemId,
  initialNotes,
}: {
  itemId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const dirty = notes.trim() !== savedNotes.trim();
  const tooLong = notes.trim().length > NOTES_MAX_LENGTH;

  function save() {
    startTransition(async () => {
      const result = await updateNotes(itemId, notes);
      if (result.ok) {
        setSavedNotes(notes);
        setStatus({ kind: "saved" });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="notes" className="sr-only">
        Meu comentário
      </label>
      <textarea
        id="notes"
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setStatus({ kind: "idle" });
        }}
        rows={6}
        placeholder="Como foi jogar? O que marcou? Com quem você jogou?"
        className="w-full rounded-lg border border-zinc-300 bg-transparent p-3 text-base leading-relaxed outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
      />
      <div className="flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={`text-xs ${
            status.kind === "error" || tooLong
              ? "text-red-600 dark:text-red-400"
              : "text-zinc-500"
          }`}
        >
          {status.kind === "error"
            ? status.message
            : status.kind === "saved" && !dirty
              ? "Salvo ✓"
              : `${notes.trim().length}/${NOTES_MAX_LENGTH}${dirty ? " · alterações não salvas" : ""}`}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending || tooLong}
          className="h-10 shrink-0 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
