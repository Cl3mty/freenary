"use client";

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
import { TbChartTreemap } from "react-icons/tb";
import { HiDownload } from "react-icons/hi";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CryptoAsset = {
  id: string;
  name: string;
  symbol: string;
  quantity: number;
  unitPurchasePrice: number;
  currentUnitPrice: number;
};

type CryptoSource = {
  id: string;
  name: string;
  cashBalanceEur: number;
  assets: CryptoAsset[];
};

type HistoryPoint = {
  date: string;
  total: number;
};

type TransactionType = "BUY" | "SELL" | "SWAP" | "DEPOSIT" | "WITHDRAWAL";

type CryptoTransaction = {
  id: string;
  type: TransactionType;
  sourceId: string;
  date: string;
  assetSymbol?: string;
  assetName?: string;
  quantity?: number;
  unitPrice?: number;
  fromSymbol?: string;
  fromName?: string;
  fromQuantity?: number;
  toSymbol?: string;
  toName?: string;
  toQuantity?: number;
  toUnitPrice?: number;
  amountEur?: number;
  note?: string;
  createdAt: string;
};

type CryptoResponse = {
  sources: CryptoSource[];
  history: HistoryPoint[];
  transactions: CryptoTransaction[];
};

type DistributionItem = {
  name: string;
  size: number;
};

type TransactionDraft = {
  type: TransactionType;
  sourceId: string;
  date: string;
  assetSymbol: string;
  assetName: string;
  quantity: string;
  unitPrice: string;
  fromSymbol: string;
  fromName: string;
  fromQuantity: string;
  toSymbol: string;
  toName: string;
  toQuantity: string;
  toUnitPrice: string;
  amountEur: string;
  note: string;
};

const colors = ["#d97706", "#2563eb", "#dc2626", "#16a34a", "#7c3aed", "#0891b2", "#ea580c"];

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

function tooltipEuros(value: string | number | ReadonlyArray<string | number> | undefined) {
  if (Array.isArray(value)) {
    return euros(Number(value[0] ?? 0));
  }
  return euros(Number(value ?? 0));
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function computePortfolioTotal(sources: CryptoSource[]): number {
  let total = 0;
  for (const source of sources) {
    total += source.cashBalanceEur;
    for (const asset of source.assets) {
      total += asset.quantity * asset.currentUnitPrice;
    }
  }
  return Number(total.toFixed(2));
}

function updateMonthlyHistory(history: HistoryPoint[], date: string, total: number): HistoryPoint[] {
  const month = date.slice(0, 7);
  const next = [...history];
  const index = next.findIndex((point) => point.date === month);

  if (index >= 0) {
    next[index] = { ...next[index], total };
  } else {
    next.push({ date: month, total });
  }

  next.sort((a, b) => a.date.localeCompare(b.date));
  return next;
}

function ensureAsset(
  source: CryptoSource,
  symbol: string,
  name: string,
  currentUnitPrice: number
): CryptoAsset {
  const normalizedSymbol = normalizeSymbol(symbol);
  const existing = source.assets.find((asset) => normalizeSymbol(asset.symbol) === normalizedSymbol);
  if (existing) {
    if (name.trim().length > 0) {
      existing.name = name.trim();
    }
    if (currentUnitPrice > 0) {
      existing.currentUnitPrice = currentUnitPrice;
    }
    return existing;
  }

  const asset: CryptoAsset = {
    id: crypto.randomUUID(),
    name: name.trim() || normalizedSymbol,
    symbol: normalizedSymbol,
    quantity: 0,
    unitPurchasePrice: currentUnitPrice > 0 ? currentUnitPrice : 0,
    currentUnitPrice: currentUnitPrice > 0 ? currentUnitPrice : 0,
  };

  source.assets.push(asset);
  return asset;
}

export default function CryptoPageContent() {
  const [getPngArea, { ref: areaRef, isLoading: isLoadingArea }] = useCurrentPng();
  const [getPngDistribution, { ref: distributionRef, isLoading: isLoadingDistribution }] = useCurrentPng();

  const [sources, setSources] = useState<CryptoSource[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [openById, setOpenById] = useState<Record<string, boolean>>({});
  const [isTreemap, setIsTreemap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);

  const [draft, setDraft] = useState<TransactionDraft>({
    type: "BUY",
    sourceId: "",
    date: todayIsoDate(),
    assetSymbol: "",
    assetName: "",
    quantity: "",
    unitPrice: "",
    fromSymbol: "",
    fromName: "",
    fromQuantity: "",
    toSymbol: "",
    toName: "",
    toQuantity: "",
    toUnitPrice: "",
    amountEur: "",
    note: "",
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const response = await fetch("/api/portfolio/crypto", { method: "GET", cache: "no-store" });
        if (!response.ok) throw new Error("load-failed");

        const payload = (await response.json()) as CryptoResponse;
        if (!active) return;

        const nextSources = Array.isArray(payload.sources) ? payload.sources : [];
        const nextHistory = Array.isArray(payload.history) ? payload.history : [];
        const nextTransactions = Array.isArray(payload.transactions) ? payload.transactions : [];

        setSources(nextSources);
        setHistory(nextHistory);
        setTransactions(nextTransactions);
        setDraft((prev) => ({ ...prev, sourceId: nextSources[0]?.id || "" }));

        setOpenById((prev) => {
          const next: Record<string, boolean> = {};
          for (const source of nextSources) {
            next[source.id] = prev[source.id] ?? false;
          }
          return next;
        });
      } catch {
        if (!active) return;
        setSources([]);
        setHistory([]);
        setTransactions([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const flatAssets = useMemo(
    () =>
      sources.flatMap((source) =>
        source.assets.map((asset) => ({ ...asset, sourceName: source.name, sourceId: source.id }))
      ),
    [sources]
  );

  const distributionData = useMemo<DistributionItem[]>(() => {
    const map = new Map<string, number>();
    for (const asset of flatAssets) {
      const value = asset.quantity * asset.currentUnitPrice;
      map.set(asset.name, (map.get(asset.name) || 0) + value);
    }
    return Array.from(map.entries()).map(([name, size]) => ({ name, size: Number(size.toFixed(2)) }));
  }, [flatAssets]);

  const totalValue = useMemo(() => computePortfolioTotal(sources), [sources]);

  const totalPnl = useMemo(
    () =>
      flatAssets.reduce(
        (sum, asset) => sum + (asset.currentUnitPrice - asset.unitPurchasePrice) * asset.quantity,
        0
      ),
    [flatAssets]
  );

  function toggleOpen(sourceId: string) {
    setOpenById((prev) => ({ ...prev, [sourceId]: !prev[sourceId] }));
  }

  function updateDraft(patch: Partial<TransactionDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  async function savePayload(nextSources: CryptoSource[], nextHistory: HistoryPoint[], nextTransactions: CryptoTransaction[]) {
    const response = await fetch("/api/portfolio/crypto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: nextSources,
        history: nextHistory,
        transactions: nextTransactions,
      }),
    });

    if (!response.ok) {
      throw new Error("save-failed");
    }
  }

  async function addTransaction() {
    const sourceIndex = sources.findIndex((source) => source.id === draft.sourceId);
    if (sourceIndex === -1) {
      toast.error("Selectionne une source valide");
      return;
    }

    const txDate = draft.date || todayIsoDate();
    const txType = draft.type;
    const nextSources = structuredClone(sources) as CryptoSource[];
    const source = nextSources[sourceIndex];

    const transaction: CryptoTransaction = {
      id: crypto.randomUUID(),
      type: txType,
      sourceId: source.id,
      date: txDate,
      createdAt: new Date().toISOString(),
      note: draft.note.trim(),
    };

    if (txType === "BUY") {
      const symbol = normalizeSymbol(draft.assetSymbol);
      const name = draft.assetName.trim() || symbol;
      const quantity = numberInput(draft.quantity);
      const unitPrice = numberInput(draft.unitPrice);
      if (!symbol || quantity <= 0 || unitPrice <= 0) {
        toast.error("Renseigne symbole, quantite et prix d'achat valides");
        return;
      }

      const asset = ensureAsset(source, symbol, name, unitPrice);
      const previousQuantity = asset.quantity;
      asset.quantity = Number((asset.quantity + quantity).toFixed(8));
      asset.currentUnitPrice = unitPrice;
      asset.unitPurchasePrice =
        asset.quantity > 0
          ? Number(
              (
                (previousQuantity * asset.unitPurchasePrice + quantity * unitPrice) /
                (previousQuantity + quantity)
              ).toFixed(8)
            )
          : asset.unitPurchasePrice;

      source.cashBalanceEur = Number((source.cashBalanceEur - quantity * unitPrice).toFixed(2));
      transaction.assetSymbol = symbol;
      transaction.assetName = name;
      transaction.quantity = quantity;
      transaction.unitPrice = unitPrice;
    }

    if (txType === "SELL") {
      const symbol = normalizeSymbol(draft.assetSymbol);
      const quantity = numberInput(draft.quantity);
      const unitPrice = numberInput(draft.unitPrice);
      if (!symbol || quantity <= 0 || unitPrice <= 0) {
        toast.error("Renseigne symbole, quantite et prix de vente valides");
        return;
      }

      const asset = source.assets.find((item) => normalizeSymbol(item.symbol) === symbol);
      if (!asset || asset.quantity < quantity) {
        toast.error("Quantite insuffisante pour la vente");
        return;
      }

      asset.quantity = Number((asset.quantity - quantity).toFixed(8));
      asset.currentUnitPrice = unitPrice;
      if (asset.quantity <= 0.00000001) {
        source.assets = source.assets.filter((item) => item.id !== asset.id);
      }

      source.cashBalanceEur = Number((source.cashBalanceEur + quantity * unitPrice).toFixed(2));
      transaction.assetSymbol = symbol;
      transaction.assetName = asset.name;
      transaction.quantity = quantity;
      transaction.unitPrice = unitPrice;
    }

    if (txType === "SWAP") {
      const fromSymbol = normalizeSymbol(draft.fromSymbol);
      const toSymbol = normalizeSymbol(draft.toSymbol);
      const fromName = draft.fromName.trim() || fromSymbol;
      const toName = draft.toName.trim() || toSymbol;
      const fromQuantity = numberInput(draft.fromQuantity);
      const toQuantity = numberInput(draft.toQuantity);
      const toUnitPrice = numberInput(draft.toUnitPrice);

      if (!fromSymbol || !toSymbol || fromQuantity <= 0 || toQuantity <= 0) {
        toast.error("Renseigne les champs d'echange (from/to) correctement");
        return;
      }

      const fromAsset = source.assets.find((item) => normalizeSymbol(item.symbol) === fromSymbol);
      if (!fromAsset || fromAsset.quantity < fromQuantity) {
        toast.error("Quantite insuffisante pour l'actif source");
        return;
      }

      fromAsset.quantity = Number((fromAsset.quantity - fromQuantity).toFixed(8));
      if (fromAsset.quantity <= 0.00000001) {
        source.assets = source.assets.filter((item) => item.id !== fromAsset.id);
      }

      const inferredToPrice = toUnitPrice > 0 ? toUnitPrice : (fromQuantity * fromAsset.currentUnitPrice) / toQuantity;
      const toAsset = ensureAsset(source, toSymbol, toName, inferredToPrice);
      const previousToQuantity = toAsset.quantity;
      toAsset.quantity = Number((toAsset.quantity + toQuantity).toFixed(8));
      toAsset.currentUnitPrice = inferredToPrice;
      toAsset.unitPurchasePrice =
        toAsset.quantity > 0
          ? Number(
              (
                (previousToQuantity * toAsset.unitPurchasePrice + toQuantity * inferredToPrice) /
                (previousToQuantity + toQuantity)
              ).toFixed(8)
            )
          : toAsset.unitPurchasePrice;

      transaction.fromSymbol = fromSymbol;
      transaction.fromName = fromName;
      transaction.fromQuantity = fromQuantity;
      transaction.toSymbol = toSymbol;
      transaction.toName = toName;
      transaction.toQuantity = toQuantity;
      transaction.toUnitPrice = inferredToPrice;
    }

    if (txType === "DEPOSIT" || txType === "WITHDRAWAL") {
      const amountEur = numberInput(draft.amountEur);
      if (amountEur <= 0) {
        toast.error("Renseigne un montant EUR strictement positif");
        return;
      }

      if (txType === "WITHDRAWAL" && source.cashBalanceEur < amountEur) {
        toast.error("Solde EUR insuffisant pour le retrait");
        return;
      }

      source.cashBalanceEur = Number(
        (source.cashBalanceEur + (txType === "DEPOSIT" ? amountEur : -amountEur)).toFixed(2)
      );
      transaction.amountEur = amountEur;
    }

    const nextTransactions = [...transactions, transaction];
    const nextHistory = updateMonthlyHistory(history, txDate, computePortfolioTotal(nextSources));

    try {
      setIsSavingTransaction(true);
      await savePayload(nextSources, nextHistory, nextTransactions);
      setSources(nextSources);
      setTransactions(nextTransactions);
      setHistory(nextHistory);
      setDraft((prev) => ({
        ...prev,
        amountEur: "",
        quantity: "",
        unitPrice: "",
        fromQuantity: "",
        toQuantity: "",
        toUnitPrice: "",
        note: "",
      }));
      toast.success("Transaction ajoutee");
    } catch {
      toast.error("Impossible d'ajouter la transaction");
    } finally {
      setIsSavingTransaction(false);
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
        `FREENARY-crypto-evolution-${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.png`
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
        `FREENARY-crypto-distribution-${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.png`
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
        <div className="mb-5">
          <h1 className="text-xl font-semibold">Crypto</h1>
          <p className="text-sm text-muted-foreground">Suivi des cryptomonnaies possedees par source.</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Sources</p>
            <p className="text-lg font-semibold">{sources.length}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Valorisation totale</p>
            <p className="text-lg font-semibold">{euros(totalValue)}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">P/L total</p>
            <p className={`text-lg font-semibold ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
              {euros(totalPnl)}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border bg-background p-4">
          <p className="mb-3 text-sm font-semibold">Ajouter une transaction</p>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-6">
            <select
              value={draft.sourceId}
              onChange={(event) => updateDraft({ sourceId: event.target.value })}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>

            <select
              value={draft.type}
              onChange={(event) => updateDraft({ type: event.target.value as TransactionType })}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="BUY">Achat</option>
              <option value="SELL">Vente</option>
              <option value="SWAP">Echange crypto</option>
              <option value="DEPOSIT">Depot de fonds</option>
              <option value="WITHDRAWAL">Retrait de fonds</option>
            </select>

            <Input type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} />

            {draft.type === "BUY" || draft.type === "SELL" ? (
              <>
                <Input
                  placeholder="Symbole (BTC)"
                  value={draft.assetSymbol}
                  onChange={(event) => updateDraft({ assetSymbol: event.target.value })}
                />
                <Input
                  placeholder="Nom (Bitcoin)"
                  value={draft.assetName}
                  onChange={(event) => updateDraft({ assetName: event.target.value })}
                />
                <Input
                  type="number"
                  step="0.00000001"
                  placeholder="Quantite"
                  value={draft.quantity}
                  onChange={(event) => updateDraft({ quantity: event.target.value })}
                />
                <Input
                  type="number"
                  step="0.00000001"
                  placeholder="Prix unitaire EUR"
                  value={draft.unitPrice}
                  onChange={(event) => updateDraft({ unitPrice: event.target.value })}
                />
              </>
            ) : null}

            {draft.type === "SWAP" ? (
              <>
                <Input
                  placeholder="From symbol"
                  value={draft.fromSymbol}
                  onChange={(event) => updateDraft({ fromSymbol: event.target.value })}
                />
                <Input
                  placeholder="From quantite"
                  value={draft.fromQuantity}
                  onChange={(event) => updateDraft({ fromQuantity: event.target.value })}
                />
                <Input
                  placeholder="To symbol"
                  value={draft.toSymbol}
                  onChange={(event) => updateDraft({ toSymbol: event.target.value })}
                />
                <Input
                  placeholder="To nom"
                  value={draft.toName}
                  onChange={(event) => updateDraft({ toName: event.target.value })}
                />
                <Input
                  placeholder="To quantite"
                  value={draft.toQuantity}
                  onChange={(event) => updateDraft({ toQuantity: event.target.value })}
                />
                <Input
                  placeholder="To prix unitaire EUR (optionnel)"
                  value={draft.toUnitPrice}
                  onChange={(event) => updateDraft({ toUnitPrice: event.target.value })}
                />
              </>
            ) : null}

            {draft.type === "DEPOSIT" || draft.type === "WITHDRAWAL" ? (
              <Input
                type="number"
                step="0.01"
                placeholder="Montant EUR"
                value={draft.amountEur}
                onChange={(event) => updateDraft({ amountEur: event.target.value })}
              />
            ) : null}

            <Input
              placeholder="Note (optionnel)"
              value={draft.note}
              onChange={(event) => updateDraft({ note: event.target.value })}
            />

            <Button type="button" disabled={isSavingTransaction || sources.length === 0} onClick={() => void addTransaction()}>
              {isSavingTransaction ? "Ajout..." : "Ajouter transaction"}
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="rounded-xl border bg-background p-4 xl:col-span-3" ref={areaRef}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Evolution</h2>
                <p className="text-xs text-muted-foreground">Cryptomonnaies possedees</p>
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
                <AreaChart data={history} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={compactEuros} width={80} />
                  <Tooltip formatter={tooltipEuros} />
                  <Area type="monotone" dataKey="total" stroke="#0f766e" fill="#0f766e" fillOpacity={0.28} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4" ref={distributionRef}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Distribution</h2>
                <p className="text-xs text-muted-foreground">Cryptomonnaies possedees</p>
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
                  <Treemap data={distributionData} dataKey="size" nameKey="name" stroke="#0f172a" fill="#0f766e">
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
                        <Cell key={`${entry.name}-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={tooltipEuros} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border bg-background">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b p-3 text-sm text-muted-foreground">
            <div>Nom</div>
            <div className="text-right">Quantite</div>
            <div className="text-right">PRU</div>
            <div className="text-right">Valeur</div>
            <div className="text-right">P/L</div>
          </div>

          {sources.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun actif crypto enregistre.</p>
          ) : (
            <div className="divide-y">
              {sources.map((source) => (
                <div key={source.id} className="p-3">
                  <button
                    type="button"
                    className="mb-2 inline-flex items-center gap-2 text-left"
                    onClick={() => toggleOpen(source.id)}
                  >
                    {openById[source.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="font-medium">{source.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">Cash: {euros(source.cashBalanceEur)}</span>
                  </button>

                  {openById[source.id] ? (
                    <div className="space-y-1">
                      {source.assets.map((asset) => {
                        const value = asset.quantity * asset.currentUnitPrice;
                        const pnl = (asset.currentUnitPrice - asset.unitPurchasePrice) * asset.quantity;
                        return (
                          <div
                            key={asset.id}
                            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 rounded-md px-2 py-2 text-sm hover:bg-muted/60"
                          >
                            <div>
                              {asset.name} ({asset.symbol})
                            </div>
                            <div className="text-right">{asset.quantity}</div>
                            <div className="text-right">{euros(asset.unitPurchasePrice)}</div>
                            <div className="text-right">{euros(value)}</div>
                            <div className={`text-right ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {euros(pnl)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-background p-4">
          <p className="mb-2 text-sm font-semibold">Dernieres transactions</p>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune transaction pour le moment.</p>
          ) : (
            <div className="max-h-72 overflow-auto rounded-md border">
              {transactions
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
                .map((tx) => (
                  <div key={tx.id} className="grid grid-cols-[100px_110px_1fr] gap-3 border-b px-3 py-2 text-xs last:border-b-0">
                    <span>{tx.date}</span>
                    <span className="font-medium">{tx.type}</span>
                    <span className="text-muted-foreground">
                      {tx.type === "BUY" || tx.type === "SELL"
                        ? `${tx.assetSymbol} ${tx.quantity} @ ${tx.unitPrice} EUR`
                        : tx.type === "SWAP"
                          ? `${tx.fromSymbol} ${tx.fromQuantity} -> ${tx.toSymbol} ${tx.toQuantity}`
                          : `${tx.amountEur} EUR`}
                      {tx.note ? ` - ${tx.note}` : ""}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
