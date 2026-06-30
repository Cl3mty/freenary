"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

  const editorRef = useRef<HTMLDivElement>(null);

  // Chargement notes
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

  // Auto-save
  useEffect(() => {
    if (!isHydrated) return;
    setSaveState("saving");
    const timer = setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    }, 400);
    return () => clearTimeout(timer);
  }, [notes, isHydrated]);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const createNote = () => {
    const note = defaultNote();
    note.content = "<p></p>";
    setNotes(prev => sortByUpdatedAt([note, ...prev]));
    setSelectedId(note.id);
  };

  const deleteSelectedNote = () => {
    if (!selectedNote) return;
    const next = notes.filter(n => n.id !== selectedNote.id);
    if (next.length === 0) {
      const created = defaultNote();
      setNotes([created]);
      setSelectedId(created.id);
    } else {
      const sorted = sortByUpdatedAt(next);
      setNotes(sorted);
      setSelectedId(sorted[0].id);
    }
  };

  const updateSelectedNote = (patch: Partial<StrategyNote>) => {
    if (!selectedNote) return;
    setNotes(prev =>
      sortByUpdatedAt(prev.map(note =>
        note.id === selectedNote.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note
      ))
    );
  };

  // Commande robuste
  const execCommand = useCallback((command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Force focus + sélection
    editor.focus();

    setTimeout(() => {
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          document.execCommand(command, false, value || undefined);
          updateSelectedNote({ content: editor.innerHTML });
        }
      } catch (err) {
        console.error("execCommand error:", err);
      }
    }, 30);
  }, [selectedNote]);

  // Chargement contenu
  useEffect(() => {
    if (selectedNote && editorRef.current) {
      editorRef.current.innerHTML = selectedNote.content || "<p></p>";
    }
  }, [selectedNote]);

  if (!isHydrated || !selectedNote) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-4 p-4 md:grid-cols-[280px_1fr] md:p-6">
      <aside className="rounded-2xl bg-card p-4 shadow-sm">
        {/* ... sidebar identique ... */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Notes</h2>
          <Button size="icon-sm" variant="outline" onClick={createNote}>
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setSelectedId(note.id)}
              className={`w-full rounded-lg px-3 py-2 text-left transition ${
                note.id === selectedId ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"
              }`}
            >
              <p className="truncate font-medium">{note.title}</p>
              <p className="text-xs opacity-70">{new Date(note.updatedAt).toLocaleString("fr-FR")}</p>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl bg-card p-4 shadow-sm flex flex-col">
        <div className="mb-4 flex gap-2">
          <Input
            value={selectedNote.title}
            onChange={(e) => updateSelectedNote({ title: e.target.value })}
            placeholder="Titre de la note"
          />
          <Button variant="destructive" onClick={deleteSelectedNote}>
            <Trash2 className="size-4" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 mb-3 border-b pb-3">
          <Button onClick={() => execCommand("bold")} variant="outline" size="sm">Gras</Button>
          <Button onClick={() => execCommand("italic")} variant="outline" size="sm">Italique</Button>
          <Button onClick={() => execCommand("underline")} variant="outline" size="sm">Souligné</Button>
          
          <Button onClick={() => execCommand("formatBlock", "h1")} variant="outline" size="sm">H1</Button>
          <Button onClick={() => execCommand("formatBlock", "h2")} variant="outline" size="sm">H2</Button>
          <Button onClick={() => execCommand("formatBlock", "h3")} variant="outline" size="sm">H3</Button>

          <Button onClick={() => execCommand("insertUnorderedList")} variant="outline" size="sm">• Liste</Button>
          <Button onClick={() => execCommand("indent")} variant="outline" size="sm">→ Indent</Button>
          <Button onClick={() => execCommand("outdent")} variant="outline" size="sm">← Outdent</Button>

          <input
            type="color"
            onChange={(e) => execCommand("foreColor", e.target.value)}
            className="w-10 h-9 border rounded cursor-pointer"
          />
        </div>

        {/* Éditeur */}
        <div
          ref={editorRef}
          contentEditable
          dir="ltr"
          spellCheck={false}
          onInput={(e) => updateSelectedNote({ content: (e.target as HTMLDivElement).innerHTML })}
          className="min-h-[520px] p-5 border rounded-md bg-white dark:bg-zinc-950 text-base leading-relaxed focus:outline-none"
          style={{
            direction: 'ltr',
            textAlign: 'left',
            unicodeBidi: 'plaintext',
            whiteSpace: 'pre-wrap',
          }}
        />
      </section>
    </div>
  );
}