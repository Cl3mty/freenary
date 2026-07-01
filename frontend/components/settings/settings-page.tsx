"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsState = {
  email: string;
  currency: string;
  activeTabs: string[];
};

const ALL_TABS = [
  "Actions & Fonds",
  "Startups & PME",
  "Immobilier",
  "Crypto",
  "Métaux précieux",
  "Epargne",
  "Autres",
  "Emprunts",
  "Prêts immobiliers"
];

const DEFAULT_SETTINGS: SettingsState = {
  email: "baptiste@freenary.app",
  currency: "EUR",
  activeTabs: ALL_TABS,
};

export function SettingsPageContent() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedTabsCount = useMemo(() => settings.activeTabs.length, [settings.activeTabs.length]);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings", { method: "GET", cache: "no-store" });
        if (!response.ok) throw new Error("failed");

        const payload = (await response.json()) as {
          settings?: Partial<SettingsState>;
        };

        if (!active) return;

        setSettings({
          email: payload.settings?.email || DEFAULT_SETTINGS.email,
          currency: payload.settings?.currency || DEFAULT_SETTINGS.currency,
          activeTabs: Array.isArray(payload.settings?.activeTabs)
            ? payload.settings.activeTabs
            : DEFAULT_SETTINGS.activeTabs,
        });
      } catch {
        if (active) {
          setSettings(DEFAULT_SETTINGS);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function toggleTab(tab: string) {
    setSettings((prev) => {
      const alreadyActive = prev.activeTabs.includes(tab);
      const nextTabs = alreadyActive
        ? prev.activeTabs.filter((item) => item !== tab)
        : [...prev.activeTabs, tab];

      return { ...prev, activeTabs: nextTabs };
    });
  }

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password || passwordConfirm) {
      if (password !== passwordConfirm) {
        toast.error("Les mots de passe ne correspondent pas");
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) throw new Error("save-failed");

      window.dispatchEvent(new Event("settings-tabs-updated"));

      if (password) {
        toast.success("Mot de passe mis a jour");
      }
      toast.success("Reglages sauvegardes");
      setPassword("");
      setPasswordConfirm("");
    } catch {
      toast.error("Erreur lors de la sauvegarde des reglages");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] p-4 md:p-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Mon compte</h1>
            <p className="text-sm text-muted-foreground">
              Parametres de securite et choix des onglets visibles.
            </p>
          </div>
          <div className="rounded-xl border px-3 py-1.5 text-xs text-muted-foreground">
            {selectedTabsCount} onglets actifs
          </div>
        </div>

        <form onSubmit={handleSaveAccount} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={settings.email}
                onChange={(event) => setSettings((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="email@freenary.app"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Devise</label>
              <Input
                value={settings.currency}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
                }
                placeholder="EUR"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmer le mot de passe</label>
              <div className="relative">
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground"
                  aria-label={showPasswords ? "Masquer les mots de passe" : "Afficher les mots de passe"}
                >
                  {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="mb-3 text-sm font-medium">Mes onglets</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_TABS.map((tab) => {
                const isActive = settings.activeTabs.includes(tab);
                return (
                  <label
                    key={tab}
                    className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleTab(tab)}
                      className="size-4 accent-primary"
                    />
                    <span>{tab}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="size-4" />
            Enregistrer
          </Button>
        </form>
      </section>
    </div>
  );
}
