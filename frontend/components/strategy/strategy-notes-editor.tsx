"use client";

import { useEffect, useMemo, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StrategyNote = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

const STORAGE_KEY = "freenary.strategy.notes.v1";

const defaultNote = (): StrategyNote => ({
  id: crypto.randomUUID(),
  title: "Nouvelle note",
  content: "<h2>Plan stratégique</h2><p>Commencez votre prise de note ici...</p>",
  updatedAt: new Date().toISOString(),
});

function sortByUpdatedAt(notes: StrategyNote[]) {
  return [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function StrategyNotesEditor() {
  const [notes, setNotes] = useState<StrategyNote[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const initial = [defaultNote()];
      setNotes(initial);
      setSelectedId(initial[0].id);
      setIsHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StrategyNote[];
      const safe = parsed.length ? sortByUpdatedAt(parsed) : [defaultNote()];
      setNotes(safe);
      setSelectedId(safe[0].id);
    } catch {
      const fallback = [defaultNote()];
      setNotes(fallback);
      setSelectedId(fallback[0].id);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    setSaveState("saving");
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [notes, isHydrated]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const createNote = () => {
    const note: StrategyNote = {
      id: crypto.randomUUID(),
      title: "Nouvelle note",
      content: "<p></p>",
      updatedAt: new Date().toISOString(),
    };

    setNotes((prev) => sortByUpdatedAt([note, ...prev]));
    setSelectedId(note.id);
  };

  const deleteSelectedNote = () => {
    if (!selectedNote) return;

    const next = notes.filter((note) => note.id !== selectedNote.id);
    if (!next.length) {
      const created = defaultNote();
      setNotes([created]);
      setSelectedId(created.id);
      return;
    }

    const sorted = sortByUpdatedAt(next);
    setNotes(sorted);
    setSelectedId(sorted[0].id);
  };

  const updateSelectedNote = (patch: Partial<StrategyNote>) => {
    if (!selectedNote) return;

    setNotes((prev) =>
      sortByUpdatedAt(
        prev.map((note) =>
          note.id === selectedNote.id
            ? {
                ...note,
                ...patch,
                updatedAt: new Date().toISOString(),
              }
            : note
        )
      )
    );
  };

  if (!isHydrated || !selectedNote) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement des notes...</div>;
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-4 p-4 md:grid-cols-[280px_1fr] md:p-6">
      <aside className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Notes</h2>
          <Button size="icon-sm" variant="outline" onClick={createNote} aria-label="Nouvelle note">
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setSelectedId(note.id)}
              className={`w-full rounded-lg px-3 py-2 text-left transition ${
                note.id === selectedId
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent text-foreground hover:bg-sidebar-accent/80"
              }`}
            >
              <p className="truncate text-sm font-medium">{note.title || "Sans titre"}</p>
              <p className="mt-1 truncate text-xs opacity-80">
                {new Date(note.updatedAt).toLocaleString("fr-FR")}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            value={selectedNote.title}
            onChange={(event) => updateSelectedNote({ title: event.target.value })}
            placeholder="Titre de la note"
            className="max-w-xl"
          />

          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-sidebar-accent px-2 py-1 text-xs text-muted-foreground">
              <Save className="size-3.5" />
              {saveState === "saving" ? "Sauvegarde..." : saveState === "saved" ? "Sauvegardee" : "Auto-save"}
            </span>

            <Button variant="destructive" size="sm" onClick={deleteSelectedNote}>
              <Trash2 className="size-4" />
              Supprimer
            </Button>
          </div>
        </div>

        <Editor
          apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY ?? "no-api-key"}
          value={selectedNote.content}
          onEditorChange={(content) => updateSelectedNote({ content })}
          init={{
            height: 560,
            menubar: true,
            plugins: [
              "advlist",
              "autolink",
              "lists",
              "link",
              "image",
              "charmap",
              "preview",
              "searchreplace",
              "visualblocks",
              "code",
              "fullscreen",
              "insertdatetime",
              "media",
              "table",
              "wordcount",
              "help",
            ],
            toolbar:
              "undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table media | removeformat code fullscreen | help",
            content_style:
              "body { font-family: var(--font-sans), sans-serif; font-size: 14px; padding: 12px; }",
            skin: "oxide",
            branding: false,
            statusbar: true,
          }}
        />
      </section>
    </div>
  );
}
