"use client";

import { useEffect, useState } from "react";
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';
import { Plus, Trash2, Save, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StrategyNote = {
  id: string;
  title: string;
  markdown: string;
  html: string;
  fileName?: string;
  updatedAt: string;
};

type StrategyApiFileNote = {
  title: string;
  markdown: string;
  fileName: string;
};

const STORAGE_KEY = "freenary.strategy.notes.v1";
const md = new MarkdownIt({ html: true, breaks: true, linkify: true }).use(markdownItTaskLists, {
  enabled: true,
  label: true,
  labelAfter: true,
});

const NOTE_SEPARATOR = "\n\n---\n\n";
const DEFAULT_NOTES = [
  {
    title: "Portefeuille",
    markdown: "## Allocation actuelle\n\n- Actions: 60%\n- Obligations: 25%\n- Liquidites: 15%",
  },
  {
    title: "Objectifs",
    markdown: "## Objectifs financiers\n\n- Rendement cible annualise\n- Volatilite maximale\n- Horizon d'investissement",
  },
  {
    title: "These d'investissement",
    markdown: "## Convictions principales\n\nDecrivez ici vos hypotheses, vos catalyseurs et vos risques.",
  },
  {
    title: "Processus d'analyse de stock picking",
    markdown: "## Check-list d'analyse\n\n1. Qualite du business\n2. Qualite du management\n3. Valorisation\n4. Risques cles",
  },
];

const buildNote = (markdown: string, title = "Nouvelle note", fileName?: string): StrategyNote => ({
  id: crypto.randomUUID(),
  title,
  markdown,
  html: md.render(markdown),
  fileName,
  updatedAt: new Date().toISOString(),
});

const defaultNote = (): StrategyNote => buildNote("# Plan strategique\n\nCommencez ici...");

const buildDefaultNotes = (): StrategyNote[] =>
  DEFAULT_NOTES.map(note => buildNote(note.markdown, note.title));

const serializeNotes = (notes: StrategyNote[]) =>
  notes
    .map(note => `# ${note.title}\n\n${note.markdown}`)
    .join(NOTE_SEPARATOR);

const parseNotesFromMarkdown = (content: string): StrategyNote[] => {
  const sections = content
    .split(NOTE_SEPARATOR)
    .map(section => section.trim())
    .filter(Boolean);

  if (!sections.length) return [];

  return sections.map((section, index) => {
    const lines = section.split('\n');
    const firstLine = lines[0]?.trim() ?? "";
    const headingMatch = /^#\s+(.+)$/.exec(firstLine);
    const title = headingMatch?.[1]?.trim() || `Note ${index + 1}`;
    const markdownBody = headingMatch ? lines.slice(1).join('\n').trim() : section;
    const markdown = markdownBody || "(Note vide)";

    return buildNote(markdown, title);
  });
};

const getNotePreview = (markdown: string) =>
  markdown
    .replace(/^#+\s+/gm, "")
    .replace(/[\*`>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

function sortByUpdatedAt(notes: StrategyNote[]) {
  return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function StrategyNotesEditor() {
  const [notes, setNotes] = useState<StrategyNote[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Chargement
  useEffect(() => {
    const hydrateFromSources = async () => {
      try {
        const response = await fetch('/api/strategy', { method: 'GET', cache: 'no-store' });
        if (response.ok) {
          const data = await response.json() as { content?: string; files?: StrategyApiFileNote[] };
          const fileNotes = (data.files ?? []).filter(note => note.markdown?.trim());
          if (fileNotes.length) {
            const initial = fileNotes.map(note => buildNote(note.markdown, note.title, note.fileName));
            setNotes(initial);
            setSelectedId(initial[0].id);
            return;
          }

          const fileMarkdown = data.content?.trim();
          if (fileMarkdown) {
            const parsedFromFile = parseNotesFromMarkdown(fileMarkdown);
            const initial = parsedFromFile.length ? parsedFromFile : [buildNote(fileMarkdown, 'Strategie')];
            setNotes(initial);
            setSelectedId(initial[0].id);
            return;
          }
        }
      } catch {
        // Fallback sur localStorage si l'API n'est pas joignable.
      }

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = buildDefaultNotes();
        setNotes(initial);
        setSelectedId(initial[0].id);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as StrategyNote[];
        const hydrated = parsed.map(note => ({
          ...note,
          html: md.render(note.markdown ?? ''),
        }));
        const sorted = hydrated.length ? sortByUpdatedAt(hydrated) : buildDefaultNotes();
        setNotes(sorted);
        setSelectedId(sorted[0].id);
      } catch {
        const fallback = buildDefaultNotes();
        setNotes(fallback);
        setSelectedId(fallback[0].id);
      }
    };

    hydrateFromSources().finally(() => setIsHydrated(true));
  }, []);

  // Auto-save localStorage
  useEffect(() => {
    if (!isHydrated) return;
    setSaveState("saving");
    const timer = setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    }, 500);
    return () => clearTimeout(timer);
  }, [notes, isHydrated]);

  const selectedNote = notes.find(n => n.id === selectedId);

  const createNote = () => {
    const note = defaultNote();
    setNotes(prev => sortByUpdatedAt([note, ...prev]));
    setSelectedId(note.id);
  };

  const deleteSelectedNote = async () => {
    if (!selectedNote) return;

    const isConfirmed = window.confirm(`Supprimer la note "${selectedNote.title}" ?`);
    if (!isConfirmed) return;

    try {
      const deleteRes = await fetch('/api/strategy', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: selectedNote.fileName, title: selectedNote.title }),
      });

      if (!deleteRes.ok) {
        toast.error("Échec de la suppression", {
          description: "Impossible de supprimer le fichier markdown associé.",
        });
        return;
      }
    } catch {
      toast.error("Erreur de connexion", {
        description: "Le serveur de suppression est indisponible.",
      });
      return;
    }

    const next = notes.filter(n => n.id !== selectedNote.id);
    const resultingNotes = next.length === 0 ? [defaultNote()] : sortByUpdatedAt(next);
    setNotes(resultingNotes);
    setSelectedId(resultingNotes[0].id);

    try {
      await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: serializeNotes(resultingNotes),
          notes: resultingNotes.map(note => ({ title: note.title, markdown: note.markdown, fileName: note.fileName })),
        }),
      });
    } catch {
      // Le fichier individuel est deja supprime; on conserve l'action utilisateur.
    }

    toast.success("Note supprimée", {
      description: "Le fichier markdown associé a été supprimé.",
    });
  };

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const markdown = e.target.value;
    const html = md.render(markdown);

    setNotes(prev => sortByUpdatedAt(prev.map(note =>
      note.id === selectedId ? { ...note, markdown, html, updatedAt: new Date().toISOString() } : note
    )));
  };

  const updateTitle = (title: string) => {
    setNotes(prev => sortByUpdatedAt(prev.map(note =>
      note.id === selectedId ? { ...note, title, updatedAt: new Date().toISOString() } : note
    )));
  };

  // === Sauvegarde dans /data/strategy/strategy.md ===
  const saveToFile = async () => {
    if (!selectedNote) return;

    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: serializeNotes(notes),
          notes: notes.map(note => ({ title: note.title, markdown: note.markdown, fileName: note.fileName })),
        }),
      });

      if (res.ok) {
        toast.success("Stratégie sauvegardée", {
          description: "Le fichier strategy.md a été mis à jour.",
        });
      } else {
        toast.error("Échec de la sauvegarde", {
          description: "Impossible d'écrire dans strategy.md.",
        });
      }
    } catch {
      toast.error("Erreur de connexion", {
        description: "Le serveur de sauvegarde est indisponible.",
      });
    }
  };

  if (!isHydrated || !selectedNote) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] p-4 md:p-6">
      <section className="rounded-2xl bg-card shadow-sm border overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[calc(100vh-11rem)]">
          <aside className="border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between gap-2">
              <p className="font-semibold text-sm">Mes notes</p>
              <Button onClick={createNote} size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>

            <div className="p-2 overflow-auto flex-1">
              {notes.map(note => {
                const isSelected = note.id === selectedId;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full text-left rounded-xl p-3 mb-1.5 border transition-colors ${
                      isSelected
                        ? "bg-card border-primary/40 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-card/70"
                    }`}
                  >
                    <p className="font-medium text-sm truncate">{note.title || "Sans titre"}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {getNotePreview(note.markdown) || "Aucun contenu"}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="p-5 flex flex-col gap-5 min-w-0">
            <div className="flex justify-between items-center gap-3">
              <Input
                value={selectedNote.title}
                onChange={(e) => updateTitle(e.target.value)}
                className="text-xl font-semibold"
                placeholder="Titre de la note"
              />
              <div className="flex items-center gap-2">
                <Button onClick={deleteSelectedNote} variant="ghost" size="icon" aria-label="Supprimer la note">
                  <Trash2 className="size-4" />
                </Button>
                <Button onClick={saveToFile} variant="outline" className="gap-2">
                  <Download className="size-4" />
                  Sauvegarder
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 flex-1 min-h-0">
              <div className="border rounded-xl overflow-hidden flex flex-col bg-background min-h-[280px]">
                <div className="bg-muted px-4 py-3 font-medium border-b">Markdown</div>
                <textarea
                  className="flex-1 p-5 font-mono text-[15px] leading-relaxed resize-none focus:outline-none bg-transparent"
                  value={selectedNote.markdown}
                  onChange={handleMarkdownChange}
                />
              </div>

              <div className="border rounded-xl overflow-hidden flex flex-col bg-background min-h-[280px]">
                <div className="bg-muted px-4 py-3 font-medium border-b text-sm">Rendu</div>
                <div
                  className="flex-1 p-6 overflow-auto max-w-none text-card-foreground
                    [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:mb-4 [&_h1]:mt-2 [&_h1]:block [&_h1]:border-b [&_h1]:pb-2 [&_h1]:text-sidebar-primary
                    [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-4 [&_h2]:block [&_h2]:text-sidebar-primary/70
                    [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:block [&_h3]:text-sidebar-primary/50
                    [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:block [&_h4]:text-foreground/70
                    [&_h5]:text-base [&_h5]:font-semibold [&_h5]:mb-1 [&_h5]:mt-2 [&_h5]:block [&_h5]:text-foreground/50
                    [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:mb-1 [&_h6]:mt-2 [&_h6]:block [&_h6]:text-foreground/30
                    [&_p]:mb-4 [&_p]:leading-relaxed
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:block
                    [&_ul.contains-task-list]:list-none [&_ul.contains-task-list]:pl-0
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:block
                    [&_li]:mb-1
                    [&_li.task-list-item]:flex [&_li.task-list-item]:items-start [&_li.task-list-item]:gap-2
                    [&_input.task-list-item-checkbox]:mt-1 [&_input.task-list-item-checkbox]:size-4
                    [&_strong]:font-bold [&_strong]:text-foreground
                    [&_em]:italic
                    [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm
                    [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4"
                  dangerouslySetInnerHTML={{ __html: selectedNote.html }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}