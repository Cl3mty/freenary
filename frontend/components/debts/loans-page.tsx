"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentPng } from "recharts-to-png";
import FileSaver from "file-saver";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { AiOutlinePieChart } from "react-icons/ai";
import { HiDownload } from "react-icons/hi";
import { TbChartTreemap } from "react-icons/tb";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Loan = {
  id: string;
  name: string;
  capital: number;
  apport: number;
  taeg: number;
  termMonths: number;
  deferredMonths: number;
  insuranceMonthly: number;
  dossierFees: number;
  firstPaymentDate: string;
  createdAt: string;
};

type LoanScheduleRow = {
  monthIndex: number;
  date: string;
  mensualite: number;
  principalPart: number;
  interestPart: number;
  insurancePart: number;
  remainingCapital: number;
};

type LoanMetrics = {
  loan: Loan;
  schedule: LoanScheduleRow[];
  remainingCapital: number;
  paidInstallments: number;
  totalInstallments: number;
  progressPct: number;
  nextDate: string;
  nextMensualite: number;
  remainingInterests: number;
  remainingInsurance: number;
};

type LoansResponse = {
  loans: Loan[];
};

type DistributionItem = {
  name: string;
  size: number;
};

const chartColors = ["#dc2626", "#ea580c", "#2563eb", "#16a34a", "#7c3aed", "#0891b2", "#e11d48"];

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

function formatDateLabel(date: string) {
  if (!date) return "-";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(parsed);
}

function addMonths(isoDate: string, months: number): string {
  const start = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return isoDate;

  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();
  const end = new Date(Date.UTC(year, month + months, day));
  return end.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

function computeSchedule(loan: Loan): LoanScheduleRow[] {
  const principalBase = Math.max(loan.capital - loan.apport, 0);
  const financedPrincipal = principalBase + Math.max(loan.dossierFees, 0);
  const rateMonthly = loan.taeg / 100 / 12;

  let remaining = round2(financedPrincipal);
  const schedule: LoanScheduleRow[] = [];
  const annuity = round2(monthlyPayment(financedPrincipal, loan.taeg, loan.termMonths));

  for (let i = 0; i < loan.deferredMonths; i += 1) {
    const interest = round2(remaining * rateMonthly);
    const insurance = round2(loan.insuranceMonthly);
    const mensualite = round2(interest + insurance);

    schedule.push({
      monthIndex: i + 1,
      date: addMonths(loan.firstPaymentDate, i),
      mensualite,
      principalPart: 0,
      interestPart: interest,
      insurancePart: insurance,
      remainingCapital: round2(remaining),
    });
  }

  for (let i = 0; i < loan.termMonths; i += 1) {
    const globalIndex = loan.deferredMonths + i;
    const interest = round2(remaining * rateMonthly);
    let principalPart = round2(annuity - interest);

    if (i === loan.termMonths - 1 || principalPart > remaining) {
      principalPart = remaining;
    }

    const insurance = round2(loan.insuranceMonthly);
    const mensualite = round2(principalPart + interest + insurance);
    remaining = round2(Math.max(remaining - principalPart, 0));

    schedule.push({
      monthIndex: globalIndex + 1,
      date: addMonths(loan.firstPaymentDate, globalIndex),
      mensualite,
      principalPart,
      interestPart: interest,
      insurancePart: insurance,
      remainingCapital: remaining,
    });
  }

  return schedule;
}

function computeLoanMetrics(loan: Loan, nowIso: string): LoanMetrics {
  const schedule = computeSchedule(loan);
  const paidInstallments = schedule.filter((row) => row.date < nowIso).length;
  const nextRow = schedule.find((row) => row.date >= nowIso) || null;

  const principalBase = Math.max(loan.capital - loan.apport, 0) + Math.max(loan.dossierFees, 0);
  const remainingCapital =
    paidInstallments > 0 ? schedule[paidInstallments - 1].remainingCapital : round2(principalBase);

  const remainingRows = schedule.slice(paidInstallments);
  const remainingInterests = round2(remainingRows.reduce((sum, row) => sum + row.interestPart, 0));
  const remainingInsurance = round2(remainingRows.reduce((sum, row) => sum + row.insurancePart, 0));
  const totalInstallments = loan.termMonths + loan.deferredMonths;
  const progressPct = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

  return {
    loan,
    schedule,
    remainingCapital,
    paidInstallments,
    totalInstallments,
    progressPct,
    nextDate: nextRow?.date || "",
    nextMensualite: nextRow?.mensualite || 0,
    remainingInterests,
    remainingInsurance,
  };
}

function tooltipEuros(value: string | number | ReadonlyArray<string | number> | undefined) {
  if (Array.isArray(value)) {
    return euros(Number(value[0] ?? 0));
  }
  return euros(Number(value ?? 0));
}

export default function LoansPageContent() {
  const [getPngArea, { ref: refArea, isLoading: isLoadingArea }] = useCurrentPng();
  const [getPngDistribution, { ref: refDistribution, isLoading: isLoadingDistribution }] = useCurrentPng();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [isTreemap, setIsTreemap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [openById, setOpenById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function loadLoans() {
      try {
        const response = await fetch("/api/debts/loans", { method: "GET", cache: "no-store" });
        if (!response.ok) throw new Error("load-failed");

        const payload = (await response.json()) as LoansResponse;
        if (!active) return;

        const nextLoans = Array.isArray(payload.loans) ? payload.loans : [];
        setLoans(nextLoans);
        setOpenById((prev) => {
          const next: Record<string, boolean> = {};
          for (const loan of nextLoans) {
            next[loan.id] = prev[loan.id] || false;
          }
          return next;
        });
      } catch {
        if (!active) return;
        setLoans([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadLoans();

    return () => {
      active = false;
    };
  }, []);

  const nowIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const metrics = useMemo(() => loans.map((loan) => computeLoanMetrics(loan, nowIso)), [loans, nowIso]);

  const evolutionData = useMemo(() => {
    const map = new Map<string, number>();

    for (const metric of metrics) {
      for (const row of metric.schedule) {
        const monthKey = row.date.slice(0, 7);
        map.set(monthKey, (map.get(monthKey) || 0) + row.remainingCapital);
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, sumRemainingCapitalOwed]) => ({
        month,
        sumRemainingCapitalOwed: round2(sumRemainingCapitalOwed),
      }));
  }, [metrics]);

  const distributionData = useMemo<DistributionItem[]>(
    () =>
      metrics
        .filter((item) => item.remainingCapital > 0)
        .map((item) => ({ name: item.loan.name, size: item.remainingCapital })),
    [metrics]
  );

  const totals = useMemo(() => {
    const remaining = round2(metrics.reduce((sum, item) => sum + item.remainingCapital, 0));
    const nextMonthly = round2(metrics.reduce((sum, item) => sum + item.nextMensualite, 0));
    return {
      count: metrics.length,
      remaining,
      nextMonthly,
    };
  }, [metrics]);

  function toggleOpen(id: string) {
    setOpenById((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function deleteLoan(id: string) {
    try {
      const response = await fetch(`/api/debts/loans?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete-failed");

      const payload = (await response.json()) as LoansResponse;
      setLoans(Array.isArray(payload.loans) ? payload.loans : []);
      toast.success("Emprunt supprimé avec succès");
    } catch {
      toast.error("Impossible de supprimer l'emprunt");
    }
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
        `FREENARY-emprunts-evolution-${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.png`
      );
      toast.success("Image Evolution téléchargée avec succès");
    } catch {
      toast.error("Erreur lors du téléchargement de l'image Evolution");
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
        `FREENARY-emprunts-distribution-${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.png`
      );
      toast.success("Image Distribution téléchargée avec succès");
    } catch {
      toast.error("Erreur lors du téléchargement de l'image Distribution");
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
            <h1 className="text-xl font-semibold">Emprunts</h1>
            <p className="text-sm text-muted-foreground">Suivi du capital restant dû et des prochaines échéances.</p>
          </div>

          <Button asChild className="gap-2">
            <Link href="/debts/loans/add">
              <Plus className="size-4" />
              Ajouter un emprunt
            </Link>
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Nombre d'emprunts</p>
            <p className="text-lg font-semibold">{totals.count}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Capital restant du total</p>
            <p className="text-lg font-semibold">{euros(totals.remaining)}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Prochaine mensualité totale</p>
            <p className="text-lg font-semibold">{euros(totals.nextMonthly)}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="rounded-xl border bg-background p-4 xl:col-span-3" ref={refArea}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Evolution</h2>
                <p className="text-xs text-muted-foreground">Capital restant dû total</p>
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
                <AreaChart data={evolutionData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={compactEuros} width={80} />
                  <Tooltip formatter={tooltipEuros} />
                  <Area
                    type="monotone"
                    dataKey="sumRemainingCapitalOwed"
                    stroke="#dc2626"
                    fill="#dc2626"
                    fillOpacity={0.26}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4" ref={refDistribution}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Distribution</h2>
                <p className="text-xs text-muted-foreground">Capital restant du</p>
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
                  <Treemap data={distributionData} dataKey="size" nameKey="name" stroke="#0f172a" fill="#dc2626">
                    <Tooltip formatter={tooltipEuros} />
                  </Treemap>
                ) : (
                  <PieChart>
                    <Pie
                      data={distributionData}
                      dataKey="size"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={86}
                      paddingAngle={2}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={chartColors[index % chartColors.length]} />
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
          <div className="grid grid-cols-1 gap-4 border-b p-3 text-xs text-muted-foreground md:grid-cols-[minmax(220px,1.5fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(90px,0.8fr)_minmax(160px,1fr)_72px] md:text-sm">
            <div>Nom</div>
            <div className="md:text-right">Principal rembourse</div>
            <div className="md:text-right">Prochaine echeance</div>
            <div className="md:text-right">Prochaine mensualite</div>
            <div className="md:text-right">Avancement</div>
            <div className="md:text-right">TAEG</div>
            <div className="md:text-right">Capital restant du</div>
            <div className="md:text-center">Action</div>
          </div>

          {metrics.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun emprunt pour le moment.</p>
          ) : (
            <div className="divide-y">
              {metrics.map((item) => {
                const open = Boolean(openById[item.loan.id]);
                const principalRepaidPct = Math.max(0, Math.min(100, 100 - (item.remainingCapital / (item.loan.capital - item.loan.apport + item.loan.dossierFees || 1)) * 100));

                return (
                  <div key={item.loan.id} className="p-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1.5fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(90px,0.8fr)_minmax(160px,1fr)_72px] md:items-center">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-left"
                        onClick={() => toggleOpen(item.loan.id)}
                      >
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        <span className="font-medium">{item.loan.name}</span>
                      </button>

                      <span className="md:text-right">{Math.round(principalRepaidPct)}%</span>
                      <span className="md:text-right">{formatDateLabel(item.nextDate)}</span>
                      <span className="md:text-right">{euros(item.nextMensualite)}</span>
                      <span className="md:text-right">{item.paidInstallments}/{item.totalInstallments}</span>
                      <span className="md:text-right">{item.loan.taeg.toFixed(2)}%</span>
                      <span className="md:text-right">{euros(item.remainingCapital)}</span>

                      <div className="md:mx-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => void deleteLoan(item.loan.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {open ? (
                      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <p className="text-muted-foreground">Capital</p>
                          <p className="font-semibold">{euros(item.loan.capital)}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <p className="text-muted-foreground">Apport</p>
                          <p className="font-semibold">{euros(item.loan.apport)}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <p className="text-muted-foreground">Frais de dossier</p>
                          <p className="font-semibold">{euros(item.loan.dossierFees)}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <p className="text-muted-foreground">Echeances</p>
                          <p className="font-semibold">{item.loan.deferredMonths + item.loan.termMonths} mois</p>
                        </div>

                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <p className="text-muted-foreground">Date 1ere mensualite</p>
                          <p className="font-semibold">{formatDateLabel(item.loan.firstPaymentDate)}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <p className="text-muted-foreground">Echeances restantes</p>
                          <p className="font-semibold">{item.totalInstallments - item.paidInstallments}/{item.totalInstallments}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <p className="text-muted-foreground">Interets restants</p>
                          <p className="font-semibold">{euros(item.remainingInterests)}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <p className="text-muted-foreground">Assurance restante</p>
                          <p className="font-semibold">{euros(item.remainingInsurance)}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
