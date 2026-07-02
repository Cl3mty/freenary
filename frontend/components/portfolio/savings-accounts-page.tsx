"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentPng } from "recharts-to-png";
import FileSaver from "file-saver";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { HiDownload } from "react-icons/hi";
import { AiOutlinePieChart } from "react-icons/ai";
import { TbChartTreemap } from "react-icons/tb";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SavingsAccount = {
  id: string;
  bank: string;
  account: string;
  balance: number;
  transactions: SavingsTransaction[];
};

type SavingsTransaction = {
  id: string;
  type: "IN" | "OUT";
  amount: number;
  date: string;
  createdAt: string;
};

type SavingsResponse = {
  accounts: SavingsAccount[];
};

type DistributionItem = {
  name: string;
  size: number;
};

type TransactionDraft = {
  type: "IN" | "OUT";
  amount: string;
  date: string;
};

type EvolutionChartPoint = {
  date: string;
  total: number;
  [accountId: string]: string | number;
};

const pieColors = ["#d97706", "#2563eb", "#dc2626", "#16a34a", "#7c3aed", "#0891b2", "#ea580c"];

function euros(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function compactEuros(value: number) {
  if (value >= 1000000) return `${Math.round(value / 1000000)} MEUR`;
  if (value >= 1000) return `${Math.round(value / 1000)} kEUR`;
  return `${Math.round(value)} EUR`;
}

function numberInput(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(parsed);
}

function tooltipEuros(value: string | number | ReadonlyArray<string | number> | undefined) {
  if (Array.isArray(value)) {
    return euros(Number(value[0] ?? 0));
  }
  return euros(Number(value ?? 0));
}

export default function SavingsAccountsPageContent() {
  const [getPngArea, { ref: areaRef, isLoading: isLoadingArea }] = useCurrentPng();
  const [getPngDistribution, { ref: distributionRef, isLoading: isLoadingDistribution }] = useCurrentPng();

  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [transactionDrafts, setTransactionDrafts] = useState<Record<string, TransactionDraft>>({});
  const [isTreemap, setIsTreemap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const pendingSaveToastRef = useRef<"account" | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const response = await fetch("/api/portfolio/savings-accounts", { method: "GET", cache: "no-store" });
        if (!response.ok) throw new Error("load-failed");

        const payload = (await response.json()) as SavingsResponse;

        if (!active) return;
        setAccounts(
          Array.isArray(payload.accounts)
            ? payload.accounts.map((account) => ({
                ...account,
                transactions: Array.isArray(account.transactions) ? account.transactions : [],
              }))
            : []
        );
      } catch {
        if (!active) return;
        setAccounts([]);
      } finally {
        if (active) {
          setIsHydrated(true);
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setTransactionDrafts((prev) => {
      const next: Record<string, TransactionDraft> = {};

      for (const account of accounts) {
        next[account.id] =
          prev[account.id] || {
            type: "IN",
            amount: "",
            date: todayIsoDate(),
          };
      }

      return next;
    });
  }, [accounts]);

  useEffect(() => {
    if (!isHydrated) return;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/portfolio/savings-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accounts }),
        });

        if (!response.ok) {
          throw new Error("save-failed");
        }

        if (pendingSaveToastRef.current === "account") {
          toast.success("Compte enregistre");
          setSaveStatus("saved");
          if (saveStatusTimerRef.current) {
            clearTimeout(saveStatusTimerRef.current);
          }
          saveStatusTimerRef.current = setTimeout(() => {
            setSaveStatus("idle");
          }, 2000);
          pendingSaveToastRef.current = null;
        }
      } catch {
        toast.error("Erreur de sauvegarde des comptes d'epargne");
        setSaveStatus("idle");
        pendingSaveToastRef.current = null;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [accounts, isHydrated]);

  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, []);

  const distribution = useMemo<DistributionItem[]>(() => {
    const map = new Map<string, number>();
    for (const account of accounts) {
      const key = account.account || "Compte";
      map.set(key, (map.get(key) || 0) + account.balance);
    }

    return Array.from(map.entries()).map(([name, size]) => ({ name, size }));
  }, [accounts]);

  const totalSavings = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts]
  );

  const evolution = useMemo<EvolutionChartPoint[]>(() => {
    if (accounts.length === 0) return [];

    const dates = new Set<string>();
    for (const account of accounts) {
      for (const tx of account.transactions || []) {
        if (tx.date) {
          dates.add(tx.date.slice(0, 10));
        }
      }
    }

    dates.add(todayIsoDate());
    const sortedDates = Array.from(dates).sort((a, b) => a.localeCompare(b));

    const points = sortedDates.map((date) => ({
      date,
      total: 0,
    })) as EvolutionChartPoint[];

    for (const account of accounts) {
      const txByDate = new Map<string, number>();
      let netImpact = 0;

      for (const tx of account.transactions || []) {
        const key = tx.date.slice(0, 10);
        const signedAmount = tx.type === "OUT" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
        txByDate.set(key, (txByDate.get(key) || 0) + signedAmount);
        netImpact += signedAmount;
      }

      const baseValue = account.balance - netImpact;
      let running = baseValue;

      for (const point of points) {
        running += txByDate.get(point.date) || 0;
        const safeValue = Number(running.toFixed(2));
        point[account.id] = safeValue;
        point.total = Number((point.total + safeValue).toFixed(2));
      }
    }

    return points.map((point) => ({
      ...point,
      date: formatDateLabel(point.date),
    }));
  }, [accounts]);

  const areaKeys = useMemo(
    () => accounts.map((account, index) => ({
      key: account.id,
      label: `${account.account} - ${account.bank}`,
      color: pieColors[index % pieColors.length],
    })),
    [accounts]
  );

  function updateBalance(accountId: string, value: string) {
    const nextValue = numberInput(value);
    pendingSaveToastRef.current = "account";
    setSaveStatus("saving");
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === accountId
          ? {
              ...account,
              balance: nextValue,
            }
          : account
      )
    );
  }

  function updateDraft(accountId: string, patch: Partial<TransactionDraft>) {
    setTransactionDrafts((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {
          type: "IN",
          amount: "",
          date: todayIsoDate(),
        }),
        ...patch,
      },
    }));
  }

  function deleteAccount(accountId: string) {
    pendingSaveToastRef.current = "account";
    setSaveStatus("saving");

    setAccounts((prev) => prev.filter((account) => account.id !== accountId));
    setTransactionDrafts((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });

    toast.success("Compte supprime");
  }

  function addTransaction(accountId: string) {
    const draft = transactionDrafts[accountId];
    const amount = numberInput(draft?.amount || "0");
    const date = draft?.date || "";
    const type = draft?.type || "IN";

    if (!date || amount <= 0) {
      toast.error("Renseigne une date et un montant strictement positif");
      return;
    }

    setAccounts((prev) =>
      prev.map((account) => {
        if (account.id !== accountId) return account;

        const signedAmount = type === "OUT" ? -amount : amount;
        const nextBalance = Number((account.balance + signedAmount).toFixed(2));

        if (nextBalance < 0) {
          toast.error("Le solde ne peut pas devenir negatif");
          return account;
        }

        return {
          ...account,
          balance: nextBalance,
          transactions: [
            ...account.transactions,
            {
              id: crypto.randomUUID(),
              type,
              amount,
              date,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      })
    );

    setTransactionDrafts((prev) => ({
      ...prev,
      [accountId]: {
        type: "IN",
        amount: "",
        date,
      },
    }));

    toast.success("Transaction ajoutee");
  }

  const handleDownloadArea = useCallback(async () => {
    try {
      const png = await getPngArea();
      if (!png) {
        toast.error("Impossible de generer l'image du graphe Evolution");
        return;
      }

      FileSaver.saveAs(
        png,
        `FREENARY-epargne-evolution-${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.png`
      );
      toast.success("Image Evolution telechargee");
    } catch {
      toast.error("Erreur lors du telechargement de l'image Evolution");
    }
  }, [getPngArea]);

  const handleDownloadDistribution = useCallback(async () => {
    try {
      const png = await getPngDistribution();
      if (!png) {
        toast.error("Impossible de generer l'image du graphe Distribution");
        return;
      }

      FileSaver.saveAs(
        png,
        `FREENARY-epargne-distribution-${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.png`
      );
      toast.success("Image Distribution telechargee");
    } catch {
      toast.error("Erreur lors du telechargement de l'image Distribution");
    }
  }, [getPngDistribution]);

  if (isLoading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] p-4 md:p-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Epargne</h1>
            <p className="text-sm text-muted-foreground">Comptes d'epargne et distribution du capital.</p>
            {saveStatus === "saving" ? (
              <p className="mt-1 text-xs text-amber-600">Enregistrement...</p>
            ) : null}
            {saveStatus === "saved" ? (
              <p className="mt-1 text-xs text-green-600">Enregistre</p>
            ) : null}
          </div>

          <Button asChild className="gap-2">
            <Link href="/portfolio/savings-accounts/add">
              <Plus className="size-4" />
              Ajouter un compte
            </Link>
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Nombre de comptes</p>
            <p className="text-lg font-semibold">{accounts.length}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Capital total epargne</p>
            <p className="text-lg font-semibold">{euros(totalSavings)}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Ticket moyen</p>
            <p className="text-lg font-semibold">
              {accounts.length > 0 ? euros(totalSavings / accounts.length) : euros(0)}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="rounded-xl border bg-background p-4 xl:col-span-3" ref={areaRef}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Evolution</h2>
                <p className="text-xs text-muted-foreground">Capital epargne</p>
              </div>

              <button
                type="button"
                onClick={handleDownloadArea}
                disabled={isLoadingArea}
                className="inline-flex items-center rounded-md border px-2 py-1 text-sm hover:bg-muted disabled:opacity-60"
              >
                <HiDownload className="size-4" />
              </button>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={compactEuros} width={72} />
                  <Tooltip formatter={tooltipEuros} />
                  <Legend />
                  {areaKeys.map((series) => (
                    <Area
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stackId="savings"
                      stroke={series.color}
                      fill={series.color}
                      fillOpacity={0.28}
                    />
                  ))}
                  <Line type="monotone" dataKey="total" name="Total" stroke="#111827" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4" ref={distributionRef}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Distribution</h2>
                <p className="text-xs text-muted-foreground">Capital epargne</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTreemap((prev) => !prev)}
                  className="inline-flex items-center rounded-md border px-2 py-1 text-sm hover:bg-muted"
                  title={isTreemap ? "Afficher en camembert" : "Afficher en treemap"}
                >
                  {isTreemap ? <AiOutlinePieChart className="size-4" /> : <TbChartTreemap className="size-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadDistribution}
                  disabled={isLoadingDistribution}
                  className="inline-flex items-center rounded-md border px-2 py-1 text-sm hover:bg-muted disabled:opacity-60"
                >
                  <HiDownload className="size-4" />
                </button>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {isTreemap ? (
                  <Treemap data={distribution} dataKey="size" nameKey="name" stroke="#0f172a" fill="#16a34a">
                    <Tooltip formatter={tooltipEuros} />
                  </Treemap>
                ) : (
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="size"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={86}
                      paddingAngle={2}
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={tooltipEuros} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b p-3 text-sm text-muted-foreground">
            <div>Nom</div>
            <div className="text-right">Valeur editable</div>
            <div>Valeur</div>
            <div>Action</div>
          </div>

          {accounts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun compte d'epargne pour le moment.</p>
          ) : (
            <div className="divide-y">
              {accounts.map((item) => (
                <div key={item.id} className="space-y-3 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto_auto] md:items-center">
                    <div className="font-medium">{item.account} - {item.bank}</div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={String(item.balance)}
                      onChange={(event) => updateBalance(item.id, event.target.value)}
                    />
                    <div className="md:text-right">{euros(item.balance)}</div>
                    <div className="md:text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => deleteAccount(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-3">
                    <p className="mb-2 text-sm font-medium">Ajouter une transaction</p>
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-[140px_180px_180px_auto]">
                      <select
                        value={transactionDrafts[item.id]?.type || "IN"}
                        onChange={(event) =>
                          updateDraft(item.id, { type: event.target.value as "IN" | "OUT" })
                        }
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="IN">Virement entrant</option>
                        <option value="OUT">Virement sortant</option>
                      </select>

                      <Input
                        type="date"
                        value={transactionDrafts[item.id]?.date || todayIsoDate()}
                        onChange={(event) => updateDraft(item.id, { date: event.target.value })}
                      />

                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Montant"
                        value={transactionDrafts[item.id]?.amount || ""}
                        onChange={(event) => updateDraft(item.id, { amount: event.target.value })}
                      />

                      <Button type="button" onClick={() => addTransaction(item.id)}>
                        Ajouter
                      </Button>
                    </div>

                    {item.transactions.length > 0 ? (
                      <div className="mt-3 max-h-36 overflow-auto rounded-md border">
                        {item.transactions
                          .slice()
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((tx) => (
                            <div key={tx.id} className="grid grid-cols-[1fr_auto_auto] gap-2 border-b px-3 py-2 text-xs last:border-b-0">
                              <span>{formatDateLabel(tx.date)}</span>
                              <span className={tx.type === "IN" ? "text-green-600" : "text-red-600"}>
                                {tx.type === "IN" ? "Entrant" : "Sortant"}
                              </span>
                              <span className="font-medium">{euros(tx.amount)}</span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Aucune transaction pour ce compte.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
