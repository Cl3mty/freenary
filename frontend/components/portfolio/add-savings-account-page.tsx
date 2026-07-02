"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SavingsAccountDraft = {
  bank: string;
  account: string;
  balance: string;
};

function numberInput(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function AddSavingsAccountPageContent() {
  const router = useRouter();
  const [draft, setDraft] = useState<SavingsAccountDraft>({
    bank: "",
    account: "",
    balance: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const balance = numberInput(draft.balance);
    if (!draft.bank.trim() || !draft.account.trim() || !Number.isFinite(balance) || balance < 0) {
      toast.error("Merci de renseigner banque, compte et montant valide");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/portfolio/savings-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: {
            bank: draft.bank.trim(),
            account: draft.account.trim(),
            balance,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("save-failed");
      }

      toast.success("Compte d'epargne ajoute");
      router.push("/portfolio/savings-accounts");
      router.refresh();
    } catch {
      toast.error("Impossible d'ajouter le compte d'epargne");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] p-4 md:p-6">
      <section className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Ajouter un compte d'epargne</h1>
            <p className="text-sm text-muted-foreground">Creation locale, sans API externe.</p>
          </div>

          <Button asChild variant="ghost" size="icon">
            <Link href="/portfolio/savings-accounts" aria-label="Fermer">
              <X className="size-4" />
            </Link>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Banque</label>
            <Input
              value={draft.bank}
              onChange={(event) => setDraft((prev) => ({ ...prev, bank: event.target.value }))}
              placeholder="Banque Populaire"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nom du compte</label>
            <Input
              value={draft.account}
              onChange={(event) => setDraft((prev) => ({ ...prev, account: event.target.value }))}
              placeholder="Livret A"
              required
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Montant (EUR)</label>
            <Input
              value={draft.balance}
              onChange={(event) => setDraft((prev) => ({ ...prev, balance: event.target.value }))}
              placeholder="1000"
              inputMode="decimal"
              required
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button asChild type="button" variant="outline">
              <Link href="/portfolio/savings-accounts">Annuler</Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Sauvegarde..." : "Valider"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
