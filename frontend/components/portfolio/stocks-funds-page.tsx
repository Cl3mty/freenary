"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Support = {
  id: string;
  name: string;
  isin: string;
  quantity: number;
  pru: number;
};

type TransactionType = "BUY";

type Transaction = {
  id: string;
  type: TransactionType;
  isin: string;
  name: string;
  quantity: number;
  price: number;
  executedAt: string;
};

type Account = {
  id: string;
  name: string;
  supports: Support[];
  initialSupports: Support[];
  transactions: Transaction[];
};

type IsinSearchResult = {
  isin: string;
  name: string;
};

type TransactionDraft = {
  isinQuery: string;
  selected: IsinSearchResult | null;
  type: TransactionType;
  quantity: string;
  price: string;
};

type DropSide = "above" | "below";

const ACCOUNT_TYPES = ["PEA", "PEA-PME", "AV", "PER", "PEG", "PEE", "CTO", "Autre"];
const SHOW_TRANSACTION_PANEL = false;

function numberInput(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function euros(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function pct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function cloneSupports(supports: Support[]): Support[] {
  return supports.map((support) => ({ ...support }));
}

function createSupport(): Support {
  return {
    id: crypto.randomUUID(),
    name: "",
    isin: "",
    quantity: 0,
    pru: 0,
  };
}

function createAccount(name = "PEA"): Account {
  const supports = [createSupport()];
  return {
    id: crypto.randomUUID(),
    name,
    supports,
    initialSupports: cloneSupports(supports),
    transactions: [],
  };
}

function reorderAccounts(list: Account[], draggedId: string, targetId: string, side: DropSide): Account[] {
  if (draggedId === targetId) return list;

  const next = [...list];
  const draggedIndex = next.findIndex((account) => account.id === draggedId);
  const targetIndex = next.findIndex((account) => account.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) return list;

  const [dragged] = next.splice(draggedIndex, 1);
  const adjustedTargetIndex = next.findIndex((account) => account.id === targetId);
  const insertIndex = side === "below" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

  next.splice(insertIndex, 0, dragged);
  return next;
}

export default function StocksFundsPageContent() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, TransactionDraft>>({});
  const [isinResults, setIsinResults] = useState<Record<string, IsinSearchResult[]>>({});
  const [openDropdownFor, setOpenDropdownFor] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasLoadedRef = useRef(false);
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dragOverState, setDragOverState] = useState<{ targetId: string; side: DropSide } | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest("[data-isin-dropdown-root='true']")) {
        return;
      }

      setOpenDropdownFor(null);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAccounts() {
      try {
        const response = await fetch("/api/portfolio/stocks-funds", { method: "GET", cache: "no-store" });
        if (!response.ok) throw new Error("load-failed");

        const payload = (await response.json()) as { accounts?: Account[] };
        const loaded = Array.isArray(payload.accounts) ? payload.accounts : [];

        if (!active) return;

        if (loaded.length > 0) {
          const normalized = loaded.map((account) => {
            const supports = account.supports?.length ? account.supports : [createSupport()];
            const initialSupports = account.initialSupports?.length
              ? account.initialSupports
              : cloneSupports(supports);

            return {
              id: account.id || crypto.randomUUID(),
              name: account.name || "Compte",
              supports,
              initialSupports,
              transactions: Array.isArray(account.transactions) ? account.transactions : [],
            };
          });
          setAccounts(normalized);
        } else {
          setAccounts([createAccount("PEA")]);
        }
      } catch {
        if (active) {
          setAccounts([createAccount("PEA")]);
        }
      } finally {
        if (active) {
          hasLoadedRef.current = true;
          setIsHydrated(true);
        }
      }
    }

    void loadAccounts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !hasLoadedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/portfolio/stocks-funds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accounts }),
        });

        if (!response.ok) {
          throw new Error("save-failed");
        }
      } catch {
        toast.error("Erreur de sauvegarde des comptes Actions & Fonds");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [accounts, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;

    const isins = Array.from(
      new Set(
        accounts
          .flatMap((account) => account.supports)
          .map((support) => support.isin.trim().toUpperCase())
          .filter(Boolean)
      )
    );

    if (isins.length === 0) {
      setMarketPrices({});
      return;
    }

    let active = true;

    async function loadQuotes() {
      try {
        const response = await fetch(`/api/market/quotes?isins=${encodeURIComponent(isins.join(","))}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { quotes?: Record<string, number> };
        if (active) {
          setMarketPrices(payload.quotes || {});
        }
      } catch {
        // Keep previous quotes when backend is unavailable.
      }
    }

    void loadQuotes();

    return () => {
      active = false;
    };
  }, [accounts, isHydrated]);

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, TransactionDraft> = {};

      for (const account of accounts) {
        next[account.id] =
          prev[account.id] || {
            isinQuery: "",
            selected: null,
            type: "BUY",
            quantity: "",
            price: "",
          };
      }

      return next;
    });
  }, [accounts]);

  const totals = useMemo(() => {
    const flatSupports = accounts.flatMap((account) => account.supports);
    const cost = flatSupports.reduce((sum, support) => sum + support.quantity * support.pru, 0);
    const market = flatSupports.reduce((sum, support) => {
      const quote = marketPrices[support.isin.trim().toUpperCase()];
      const current = Number.isFinite(quote) ? quote : support.pru;
      return sum + support.quantity * current;
    }, 0);
    const pnlValue = market - cost;
    const pnlPct = cost > 0 ? (pnlValue / cost) * 100 : 0;

    return {
      accountsCount: accounts.length,
      supportsCount: flatSupports.length,
      cost,
      market,
      pnlValue,
      pnlPct,
    };
  }, [accounts, marketPrices]);

  function updateAccountName(accountId: string, name: string) {
    setAccounts((prev) =>
      prev.map((account) => (account.id === accountId ? { ...account, name } : account))
    );
  }

  function getDropSide(event: DragEvent<HTMLDivElement>): DropSide {
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    return event.clientY < midpoint ? "above" : "below";
  }

  function handleAccountDragStart(event: DragEvent<HTMLButtonElement>, accountId: string) {
    setDraggedAccountId(accountId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", accountId);
  }

  function handleAccountDragOver(event: DragEvent<HTMLDivElement>, targetId: string) {
    const sourceId = draggedAccountId || event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const side = getDropSide(event);
    setDragOverState({ targetId, side });
  }

  function handleAccountDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = draggedAccountId || event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) {
      setDragOverState(null);
      return;
    }

    const side = dragOverState?.targetId === targetId ? dragOverState.side : getDropSide(event);
    setAccounts((prev) => reorderAccounts(prev, sourceId, targetId, side));
    setDraggedAccountId(null);
    setDragOverState(null);
  }

  function handleAccountDragLeave(event: DragEvent<HTMLDivElement>, targetId: string) {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setDragOverState((prev) => (prev?.targetId === targetId ? null : prev));
  }

  function handleAccountDragEnd() {
    setDraggedAccountId(null);
    setDragOverState(null);
  }

  function addAccount() {
    setAccounts((prev) => [...prev, createAccount("")]);
  }

  function deleteAccount(accountId: string) {
    setAccounts((prev) => {
      const next = prev.filter((account) => account.id !== accountId);
      return next.length > 0 ? next : [createAccount("PEA")];
    });
  }

  function addSupport(accountId: string) {
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === accountId
          ? { ...account, supports: [...account.supports, createSupport()] }
          : account
      )
    );
  }

  function deleteSupport(accountId: string, supportId: string) {
    setAccounts((prev) =>
      prev.map((account) => {
        if (account.id !== accountId) return account;

        const nextSupports = account.supports.filter((support) => support.id !== supportId);
        return {
          ...account,
          supports: nextSupports.length ? nextSupports : [createSupport()],
        };
      })
    );
  }

  function updateSupport(
    accountId: string,
    supportId: string,
    patch: Partial<Pick<Support, "name" | "isin" | "quantity" | "pru">>
  ) {
    setAccounts((prev) =>
      prev.map((account) => {
        if (account.id !== accountId) return account;

        return {
          ...account,
          supports: account.supports.map((support) =>
            support.id === supportId ? { ...support, ...patch } : support
          ),
        };
      })
    );
  }

  function updateDraft(accountId: string, patch: Partial<TransactionDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {
          isinQuery: "",
          selected: null,
          type: "BUY",
          quantity: "",
          price: "",
        }),
        ...patch,
      },
    }));
  }

  async function searchIsin(accountId: string, query: string) {
    updateDraft(accountId, { isinQuery: query, selected: null });

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setIsinResults((prev) => ({ ...prev, [accountId]: [] }));
      setOpenDropdownFor((prev) => (prev === accountId ? null : prev));
      return;
    }

    try {
      const response = await fetch(`/api/portfolio/isin-search?q=${encodeURIComponent(trimmed)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("search-failed");

      const payload = (await response.json()) as { results?: IsinSearchResult[] };
      const results = payload.results || [];
      setIsinResults((prev) => ({ ...prev, [accountId]: results }));
      setOpenDropdownFor(results.length > 0 ? accountId : null);
    } catch {
      setIsinResults((prev) => ({ ...prev, [accountId]: [] }));
      setOpenDropdownFor((prev) => (prev === accountId ? null : prev));
    }
  }

  function applyTransaction(accountId: string) {
    const draft = drafts[accountId];
    const selectedSupport = draft?.selected;
    if (!selectedSupport) {
      toast.error("Selectionnez un support via la recherche ISIN");
      return;
    }

    const quantity = numberInput(draft.quantity);
    const price = numberInput(draft.price);

    if (quantity <= 0 || price <= 0) {
      toast.error("Quantite et prix doivent etre strictement positifs");
      return;
    }

    setAccounts((prev) =>
      prev.map((account) => {
        if (account.id !== accountId) return account;

        const existingIndex = account.supports.findIndex(
          (support) => support.isin.toUpperCase() === selectedSupport.isin.toUpperCase()
        );

        const nextSupports = [...account.supports];

        if (existingIndex === -1) {
          nextSupports.push({
            id: crypto.randomUUID(),
            name: selectedSupport.name,
            isin: selectedSupport.isin,
            quantity,
            pru: price,
          });

          return {
            ...account,
            supports: nextSupports,
            transactions: [
              ...account.transactions,
              {
                id: crypto.randomUUID(),
                type: "BUY",
                isin: selectedSupport.isin,
                name: selectedSupport.name,
                quantity,
                price,
                executedAt: new Date().toISOString(),
              },
            ],
          };
        }

        const existing = nextSupports[existingIndex];
        const nextQuantity = existing.quantity + quantity;
        const nextPru =
          nextQuantity > 0
            ? (existing.quantity * existing.pru + quantity * price) / nextQuantity
            : existing.pru;

        nextSupports[existingIndex] = {
          ...existing,
          quantity: nextQuantity,
          pru: nextPru,
        };

        return {
          ...account,
          supports: nextSupports,
          transactions: [
            ...account.transactions,
            {
              id: crypto.randomUUID(),
              type: "BUY",
              isin: selectedSupport.isin,
              name: selectedSupport.name,
              quantity,
              price,
              executedAt: new Date().toISOString(),
            },
          ],
        };
      })
    );

    setDrafts((prev) => ({
      ...prev,
      [accountId]: {
        isinQuery: "",
        selected: null,
        type: "BUY",
        quantity: "",
        price: "",
      },
    }));
    setIsinResults((prev) => ({ ...prev, [accountId]: [] }));
    setOpenDropdownFor((prev) => (prev === accountId ? null : prev));
    toast.success("Transaction ajoutee");
  }

  if (!isHydrated) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] p-4 md:p-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Actions & Fonds</h1>
            <p className="text-sm text-muted-foreground">
              Gestion multi-comptes (PEA, PEA-PME, AV, PER, PEG, PEE, CTO...) et supports.
            </p>
          </div>
          <Button type="button" onClick={addAccount} className="gap-2">
            <Plus className="size-4" />
            Ajouter un compte
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Nombre de comptes</p>
            <p className="text-lg font-semibold">{totals.accountsCount}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Nombre de supports</p>
            <p className="text-lg font-semibold">{totals.supportsCount}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Investi (PRU)</p>
            <p className="text-lg font-semibold">{euros(totals.cost)}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">Valorisation</p>
            <p className="text-lg font-semibold">{euros(totals.market)}</p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted-foreground">P/L global</p>
            <p className={`text-lg font-semibold ${totals.pnlValue >= 0 ? "text-green-600" : "text-red-600"}`}>
              {euros(totals.pnlValue)} ({pct(totals.pnlPct)})
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`rounded-xl border bg-background p-4 transition-colors ${
                dragOverState?.targetId === account.id && dragOverState.side === "above"
                  ? "border-t-4 border-t-primary"
                  : ""
              } ${
                dragOverState?.targetId === account.id && dragOverState.side === "below"
                  ? "border-b-4 border-b-primary"
                  : ""
              }`}
              onDragOver={(event) => handleAccountDragOver(event, account.id)}
              onDragLeave={(event) => handleAccountDragLeave(event, account.id)}
              onDrop={(event) => handleAccountDrop(event, account.id)}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => handleAccountDragStart(event, account.id)}
                  onDragEnd={handleAccountDragEnd}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted cursor-grab active:cursor-grabbing"
                  aria-label="Reordonner le compte"
                  title="Glisser-deposer pour reordonner"
                >
                  <GripVertical className="size-4" />
                </button>
                <Input
                  value={account.name}
                  onChange={(event) => updateAccountName(account.id, event.target.value)}
                  list={`account-types-${account.id}`}
                  className="max-w-xs"
                  placeholder="Type de compte"
                />
                <datalist id={`account-types-${account.id}`}>
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>

                <Button type="button" variant="outline" onClick={() => addSupport(account.id)} className="gap-1">
                  <Plus className="size-4" />
                  Ajouter support
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => deleteAccount(account.id)}
                  className="text-red-600"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {SHOW_TRANSACTION_PANEL ? (
                <div className="mb-4 rounded-xl border bg-card p-3">
                  <p className="mb-2 text-sm font-medium">Ajouter transaction</p>
                  <div className="grid grid-cols-1 gap-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                    <div className="relative" data-isin-dropdown-root="true">
                      <Input
                        placeholder="Rechercher un support (ISIN ou nom)"
                        value={drafts[account.id]?.isinQuery || ""}
                        onChange={(event) => void searchIsin(account.id, event.target.value)}
                        onFocus={() => {
                          if ((isinResults[account.id] || []).length > 0) {
                            setOpenDropdownFor(account.id);
                          }
                        }}
                      />
                      {openDropdownFor === account.id && (isinResults[account.id] || []).length > 0 ? (
                        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-sm">
                          {(isinResults[account.id] || []).map((result) => (
                            <button
                              key={result.isin}
                              type="button"
                              className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                updateDraft(account.id, {
                                  selected: result,
                                  isinQuery: `${result.isin} - ${result.name}`,
                                });
                                setIsinResults((prev) => ({ ...prev, [account.id]: [] }));
                                setOpenDropdownFor(null);
                              }}
                            >
                              <span className="font-medium">{result.isin}</span>
                              <span className="text-muted-foreground"> - {result.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <Input value="Achat" placeholder="Type" readOnly disabled />

                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Quantite"
                      value={drafts[account.id]?.quantity || ""}
                      onChange={(event) => updateDraft(account.id, { quantity: event.target.value })}
                    />

                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Prix exec."
                      value={drafts[account.id]?.price || ""}
                      onChange={(event) => updateDraft(account.id, { price: event.target.value })}
                    />

                    <Button type="button" onClick={() => applyTransaction(account.id)}>
                      Ajouter transaction
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2">Support</th>
                      <th className="px-2">ISIN</th>
                      <th className="px-2">Quantite</th>
                      <th className="px-2">PRU</th>
                      <th className="px-2">P/L (%)</th>
                      <th className="px-2">P/L (valeur)</th>
                      <th className="px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.supports.map((support) => {
                      const cost = support.quantity * support.pru;
                      const quote = marketPrices[support.isin.trim().toUpperCase()];
                      const current = Number.isFinite(quote) ? quote : support.pru;
                      const market = support.quantity * current;
                      const pnlValue = market - cost;
                      const pnlPct = cost > 0 ? (pnlValue / cost) * 100 : 0;

                      return (
                        <tr key={support.id} className="rounded-lg bg-card">
                          <td className="px-2 py-2">
                            <Input
                              value={support.name}
                              onChange={(event) =>
                                updateSupport(account.id, support.id, { name: event.target.value })
                              }
                              placeholder="Ex: CW8, AIR, MSCI World"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={support.isin}
                              onChange={(event) =>
                                updateSupport(account.id, support.id, { isin: event.target.value.toUpperCase() })
                              }
                              placeholder="FR0000120321"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              step="0.0001"
                              value={String(support.quantity)}
                              onChange={(event) =>
                                updateSupport(account.id, support.id, {
                                  quantity: numberInput(event.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              step="0.0001"
                              value={String(support.pru)}
                              onChange={(event) =>
                                updateSupport(account.id, support.id, {
                                  pru: numberInput(event.target.value),
                                })
                              }
                            />
                          </td>
                          <td className={`px-2 py-2 font-medium ${pnlPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {pct(pnlPct)}
                          </td>
                          <td className={`px-2 py-2 font-medium ${pnlValue >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {euros(pnlValue)}
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => deleteSupport(account.id, support.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
