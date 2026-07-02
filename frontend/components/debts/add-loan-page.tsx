"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoanDraft = {
  name: string;
  capital: string;
  apport: string;
  taeg: string;
  termMonths: string;
  deferredMonths: string;
  insuranceMonthly: string;
  dossierFees: string;
  firstPaymentDate: string;
};

function numberInput(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddLoanPageContent() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<LoanDraft>({
    name: "",
    capital: "",
    apport: "",
    taeg: "",
    termMonths: "",
    deferredMonths: "0",
    insuranceMonthly: "",
    dossierFees: "0",
    firstPaymentDate: todayIsoDate(),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      name: draft.name.trim(),
      capital: numberInput(draft.capital),
      apport: numberInput(draft.apport),
      taeg: numberInput(draft.taeg),
      termMonths: numberInput(draft.termMonths),
      deferredMonths: numberInput(draft.deferredMonths),
      insuranceMonthly: numberInput(draft.insuranceMonthly),
      dossierFees: numberInput(draft.dossierFees),
      firstPaymentDate: draft.firstPaymentDate,
    };

    if (
      !payload.name ||
      !Number.isFinite(payload.capital) ||
      payload.capital <= 0 ||
      !Number.isFinite(payload.apport) ||
      payload.apport < 0 ||
      !Number.isFinite(payload.taeg) ||
      payload.taeg < 0 ||
      !Number.isFinite(payload.termMonths) ||
      payload.termMonths <= 0 ||
      !Number.isFinite(payload.deferredMonths) ||
      payload.deferredMonths < 0 ||
      !Number.isFinite(payload.insuranceMonthly) ||
      payload.insuranceMonthly < 0 ||
      !Number.isFinite(payload.dossierFees) ||
      payload.dossierFees < 0 ||
      !payload.firstPaymentDate
    ) {
      toast.error("Merci de renseigner des valeurs valides");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/debts/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loan: payload }),
      });

      if (!response.ok) {
        throw new Error("save-failed");
      }

      toast.success("Emprunt ajouté avec succès");
      router.push("/debts/loans");
      router.refresh();
    } catch {
      toast.error("Impossible d'ajouter l'emprunt");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] p-4 md:p-6">
      <section className="mx-auto max-w-4xl rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Ajouter un emprunt (crédit à la consommation, prêt étudiant, ...)</h1>
            <p className="text-sm text-muted-foreground">Saisie locale avec calcul automatique de l'amortissement.</p>
          </div>

          <Button asChild variant="ghost" size="icon">
            <Link href="/debts/loans" aria-label="Fermer">
              <X className="size-4" />
            </Link>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Nom de l'emprunt</label>
            <Input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Crédit auto"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Date de première échéance</label>
            <Input
              type="date"
              value={draft.firstPaymentDate}
              onChange={(event) => setDraft((prev) => ({ ...prev, firstPaymentDate: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Capital (EUR)</label>
            <Input
              type="number"
              step="0.01"
              value={draft.capital}
              onChange={(event) => setDraft((prev) => ({ ...prev, capital: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Apport (EUR)</label>
            <Input
              type="number"
              step="0.01"
              value={draft.apport}
              onChange={(event) => setDraft((prev) => ({ ...prev, apport: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">TAEG (%)</label>
            <Input
              type="number"
              step="0.0001"
              value={draft.taeg}
              onChange={(event) => setDraft((prev) => ({ ...prev, taeg: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre d'échéances</label>
            <Input
              type="number"
              step="1"
              value={draft.termMonths}
              onChange={(event) => setDraft((prev) => ({ ...prev, termMonths: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Échéances différées</label>
            <Input
              type="number"
              step="1"
              value={draft.deferredMonths}
              onChange={(event) => setDraft((prev) => ({ ...prev, deferredMonths: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Assurance mensuelle (EUR)</label>
            <Input
              type="number"
              step="0.01"
              value={draft.insuranceMonthly}
              onChange={(event) => setDraft((prev) => ({ ...prev, insuranceMonthly: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Frais de dossier (EUR)</label>
            <Input
              type="number"
              step="0.01"
              value={draft.dossierFees}
              onChange={(event) => setDraft((prev) => ({ ...prev, dossierFees: event.target.value }))}
              required
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button asChild type="button" variant="outline">
              <Link href="/debts/loans">Annuler</Link>
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
