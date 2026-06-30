"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Title } from "@tremor/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SankeyChart from "./sankey-chart";

type Item = {
  id: string;
  name: string;
  amount: number;
};

type Category = {
  name: string;
  items: Item[];
};

type BudgetData = {
  revenues: Item[];
  expenses: { categories: Category[] };
  investments: { categories: Category[] };
};

const EMPTY_BUDGET_DATA: BudgetData = {
  revenues: [],
  expenses: { categories: [] },
  investments: { categories: [] },
};

function formatEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function BudgetEditor() {
  const [budgetData, setBudgetData] = useState<BudgetData>(EMPTY_BUDGET_DATA);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load budget on mount
  useEffect(() => {
    let isActive = true;

    async function loadBudget() {
      try {
        const response = await fetch("/api/budget", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load");
        const payload = (await response.json()) as { latest?: BudgetData };
        if (isActive) setBudgetData(payload.latest ?? EMPTY_BUDGET_DATA);
      } catch {
        if (isActive) setBudgetData(EMPTY_BUDGET_DATA);
      } finally {
        if (isActive) setMounted(true);
      }
    }

    void loadBudget();
    return () => {
      isActive = false;
    };
  }, []);

  // Persist budget - only when user clicks save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetData),
      });
      if (!response.ok) throw new Error("Save failed");
      toast.success("Budget sauvegardé");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  }, [budgetData]);

  // Calculate totals
  const totals = useMemo(() => {
    const revenues = budgetData.revenues.reduce((sum, item) => sum + item.amount, 0);
    const expenses = budgetData.expenses.categories.reduce(
      (sum, cat) => sum + cat.items.reduce((s, item) => s + item.amount, 0),
      0
    );
    const investments = budgetData.investments.categories.reduce(
      (sum, cat) => sum + cat.items.reduce((s, item) => s + item.amount, 0),
      0
    );
    return { revenues, expenses, investments, balance: revenues - expenses - investments };
  }, [budgetData]);

  // Sankey data
  const sankeyData = useMemo(() => {
    const baseNodes = [
      { name: "revenus", value: totals.revenues },
      { name: "disponible", value: totals.revenues },
      { name: "dépenses", value: totals.expenses },
      { name: "investissements", value: totals.investments },
    ];

    const links: Array<{ source: number; target: number; value: number }> = [
      { source: 0, target: 1, value: totals.revenues },
      { source: 1, target: 2, value: totals.expenses },
      { source: 1, target: 3, value: totals.investments },
    ];

    let nodeIndex = baseNodes.length;
    const allNodes = [...baseNodes];

    // Expenses
    budgetData.expenses.categories.forEach((category) => {
      const sum = category.items.reduce((s, item) => s + item.amount, 0);
      if (sum > 0) {
        allNodes.push({ name: category.name || "Sans catégorie", value: sum });
        links.push({ source: 2, target: nodeIndex, value: sum });
        const catIdx = nodeIndex;
        nodeIndex += 1;

        category.items.forEach((item) => {
          if (item.amount > 0) {
            allNodes.push({ name: item.name || "Dépense", value: item.amount });
            links.push({ source: catIdx, target: nodeIndex, value: item.amount });
            nodeIndex += 1;
          }
        });
      }
    });

    // Investments
    budgetData.investments.categories.forEach((category) => {
      const sum = category.items.reduce((s, item) => s + item.amount, 0);
      if (sum > 0) {
        allNodes.push({ name: category.name || "Sans catégorie", value: sum });
        links.push({ source: 3, target: nodeIndex, value: sum });
        const catIdx = nodeIndex;
        nodeIndex += 1;

        category.items.forEach((item) => {
          if (item.amount > 0) {
            allNodes.push({ name: item.name || "Investissement", value: item.amount });
            links.push({ source: catIdx, target: nodeIndex, value: item.amount });
            nodeIndex += 1;
          }
        });
      }
    });

    return { nodes: allNodes, links };
  }, [totals, budgetData.expenses.categories, budgetData.investments.categories]);

  if (!mounted) return null;

  return (
    <div className="h-full w-full p-5">
      <div className="flex h-full w-full flex-col gap-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border-0 bg-card p-4 shadow-sm">
            <div className="text-sm text-muted-foreground">Revenus</div>
            <div className="text-2xl font-bold text-green-500">{formatEuros(totals.revenues)}€</div>
          </div>
          <div className="rounded-2xl border-0 bg-card p-4 shadow-sm">
            <div className="text-sm text-muted-foreground">Dépenses</div>
            <div className="text-2xl font-bold text-red-500">{formatEuros(totals.expenses)}€</div>
          </div>
          <div className="rounded-2xl border-0 bg-card p-4 shadow-sm">
            <div className="text-sm text-muted-foreground">Investissements</div>
            <div className="text-2xl font-bold text-sidebar-primary">{formatEuros(totals.investments)}€</div>
          </div>
          <div className="rounded-2xl border-0 bg-card p-4 shadow-sm">
            <div className="text-sm text-muted-foreground">Solde</div>
            <div className={`text-2xl font-bold ${totals.balance >= 0 ? "text-white" : "text-red-500"}`}>
              {formatEuros(totals.balance)}€
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Revenues */}
            <div className="rounded-2xl border-0 bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Title className="text-foreground">Revenus</Title>
                <div className="font-bold text-green-500">{formatEuros(totals.revenues)}€</div>
              </div>

              <div className="space-y-3">
                {budgetData.revenues.map((revenue) => (
                  <div key={revenue.id} className="flex gap-3">
                    <Input
                      placeholder="Nom du revenu"
                      value={revenue.name}
                      onChange={(e) => {
                        setBudgetData((prev) => ({
                          ...prev,
                          revenues: prev.revenues.map((r) =>
                            r.id === revenue.id ? { ...r, name: e.target.value } : r
                          ),
                        }));
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Montant"
                      value={revenue.amount}
                      onChange={(e) => {
                        setBudgetData((prev) => ({
                          ...prev,
                          revenues: prev.revenues.map((r) =>
                            r.id === revenue.id ? { ...r, amount: Number(e.target.value) || 0 } : r
                          ),
                        }));
                      }}
                      className="w-24"
                    />
                    <button
                      onClick={() => {
                        setBudgetData((prev) => ({
                          ...prev,
                          revenues: prev.revenues.filter((r) => r.id !== revenue.id),
                        }));
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  setBudgetData((prev) => ({
                    ...prev,
                    revenues: [...prev.revenues, { id: generateId("revenue"), name: "", amount: 0 }],
                  }));
                }}
                variant="outline"
                className="mt-4 w-full"
              >
                <Plus size={20} className="mr-2" />
                Ajouter une source de revenu
              </Button>
            </div>

            {/* Expenses */}
            <div className="rounded-2xl border-0 bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Title className="text-foreground">Dépenses</Title>
                <div className="font-bold text-red-500">{formatEuros(totals.expenses)}€</div>
              </div>

              <div className="space-y-4">
                {budgetData.expenses.categories.map((category, catIdx) => (
                  <div key={`expense-cat-${catIdx}`} className="rounded-lg border border-sidebar-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Input
                        placeholder="Catégorie"
                        value={category.name}
                        onChange={(e) => {
                          setBudgetData((prev) => {
                            const updated = { ...prev, expenses: { ...prev.expenses, categories: [...prev.expenses.categories] } };
                            updated.expenses.categories[catIdx] = { ...category, name: e.target.value };
                            return updated;
                          });
                        }}
                        className="flex-1"
                      />
                      <div className="ml-4 font-bold">
                        {formatEuros(category.items.reduce((s, it) => s + it.amount, 0))}€
                      </div>
                    </div>

                    <div className="ml-4 space-y-2">
                      {category.items.map((item, itemIdx) => (
                        <div key={item.id} className="flex gap-2">
                          <Input
                            placeholder="Nom"
                            value={item.name}
                            onChange={(e) => {
                              setBudgetData((prev) => {
                                const updated = { ...prev, expenses: { ...prev.expenses, categories: [...prev.expenses.categories] } };
                                updated.expenses.categories[catIdx] = { ...category, items: [...category.items] };
                                updated.expenses.categories[catIdx].items[itemIdx] = { ...item, name: e.target.value };
                                return updated;
                              });
                            }}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Montant"
                            value={item.amount}
                            onChange={(e) => {
                              setBudgetData((prev) => {
                                const updated = { ...prev, expenses: { ...prev.expenses, categories: [...prev.expenses.categories] } };
                                updated.expenses.categories[catIdx] = { ...category, items: [...category.items] };
                                updated.expenses.categories[catIdx].items[itemIdx] = { ...item, amount: Number(e.target.value) || 0 };
                                return updated;
                              });
                            }}
                            className="w-24"
                          />
                          <button
                            onClick={() => {
                              setBudgetData((prev) => {
                                const updated = { ...prev, expenses: { ...prev.expenses, categories: [...prev.expenses.categories] } };
                                updated.expenses.categories[catIdx] = { ...category, items: category.items.filter((_, i) => i !== itemIdx) };
                                return updated;
                              });
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => {
                        setBudgetData((prev) => {
                          const updated = { ...prev, expenses: { ...prev.expenses, categories: [...prev.expenses.categories] } };
                          updated.expenses.categories[catIdx] = {
                            ...category,
                            items: [...category.items, { id: generateId("expense"), name: "", amount: 0 }],
                          };
                          return updated;
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                    >
                      <Plus size={16} className="mr-2" />
                      Ajouter une dépense
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  setBudgetData((prev) => ({
                    ...prev,
                    expenses: {
                      categories: [...prev.expenses.categories, { name: "", items: [] }],
                    },
                  }));
                }}
                variant="outline"
                className="mt-4 w-full border-dashed"
              >
                <Plus size={20} className="mr-2" />
                Ajouter une catégorie
              </Button>
            </div>
          </div>

          {/* Investments */}
          <div>
            <div className="rounded-2xl border-0 bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Title className="text-foreground">Investissements</Title>
                <div className="font-bold text-sidebar-primary">{formatEuros(totals.investments)}€</div>
              </div>

              <div className="space-y-4">
                {budgetData.investments.categories.map((category, catIdx) => (
                  <div key={`invest-cat-${catIdx}`} className="rounded-lg border border-sidebar-border p-3">
                    <Input
                      placeholder="Catégorie"
                      value={category.name}
                      onChange={(e) => {
                        setBudgetData((prev) => {
                          const updated = { ...prev, investments: { ...prev.investments, categories: [...prev.investments.categories] } };
                          updated.investments.categories[catIdx] = { ...category, name: e.target.value };
                          return updated;
                        });
                      }}
                      className="mb-3 text-sm"
                    />

                    <div className="ml-2 space-y-2">
                      {category.items.map((item, itemIdx) => (
                        <div key={item.id} className="flex gap-2 text-sm">
                          <Input
                            placeholder="Nom"
                            value={item.name}
                            onChange={(e) => {
                              setBudgetData((prev) => {
                                const updated = { ...prev, investments: { ...prev.investments, categories: [...prev.investments.categories] } };
                                updated.investments.categories[catIdx] = { ...category, items: [...category.items] };
                                updated.investments.categories[catIdx].items[itemIdx] = { ...item, name: e.target.value };
                                return updated;
                              });
                            }}
                            className="flex-1 text-xs"
                          />
                          <Input
                            type="number"
                            placeholder="Montant"
                            value={item.amount}
                            onChange={(e) => {
                              setBudgetData((prev) => {
                                const updated = { ...prev, investments: { ...prev.investments, categories: [...prev.investments.categories] } };
                                updated.investments.categories[catIdx] = { ...category, items: [...category.items] };
                                updated.investments.categories[catIdx].items[itemIdx] = { ...item, amount: Number(e.target.value) || 0 };
                                return updated;
                              });
                            }}
                            className="w-20 text-xs"
                          />
                          <button
                            onClick={() => {
                              setBudgetData((prev) => {
                                const updated = { ...prev, investments: { ...prev.investments, categories: [...prev.investments.categories] } };
                                updated.investments.categories[catIdx] = { ...category, items: category.items.filter((_, i) => i !== itemIdx) };
                                return updated;
                              });
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => {
                        setBudgetData((prev) => {
                          const updated = { ...prev, investments: { ...prev.investments, categories: [...prev.investments.categories] } };
                          updated.investments.categories[catIdx] = {
                            ...category,
                            items: [...category.items, { id: generateId("investment"), name: "", amount: 0 }],
                          };
                          return updated;
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                    >
                      <Plus size={14} className="mr-1" />
                      Ajouter
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  setBudgetData((prev) => ({
                    ...prev,
                    investments: {
                      categories: [...prev.investments.categories, { name: "", items: [] }],
                    },
                  }));
                }}
                variant="outline"
                className="mt-4 w-full border-dashed text-xs"
              >
                <Plus size={16} className="mr-2" />
                Ajouter catégorie
              </Button>
            </div>
          </div>
        </div>

        {/* Sankey + Save */}
        <div className="rounded-2xl border-0 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Title className="text-foreground">Flux budgétaire</Title>
            <Button onClick={handleSave} disabled={isSaving} size="sm" variant="outline">
              <Save size={16} className={isSaving ? "animate-pulse" : ""} />
            </Button>
          </div>
          {(() => {
            const nodeColors: string[] = ["#22c55e", "#f5f5f5", "#ef4444", "#eab308"];
            const linkColors: string[] = ["#22c55e", "#ef4444", "#eab308"];

            budgetData.expenses.categories.forEach((cat) => {
              const sum = cat.items.reduce((s, it) => s + it.amount, 0);
              if (sum > 0) {
                nodeColors.push("#dc2626");
                linkColors.push("#dc2626");
                cat.items.forEach((it) => {
                  if (it.amount > 0) {
                    nodeColors.push("#991b1b");
                    linkColors.push("#991b1b");
                  }
                });
              }
            });

            budgetData.investments.categories.forEach((cat) => {
              const sum = cat.items.reduce((s, it) => s + it.amount, 0);
              if (sum > 0) {
                nodeColors.push("#ca8a04");
                linkColors.push("#ca8a04");
                cat.items.forEach((it) => {
                  if (it.amount > 0) {
                    nodeColors.push("#713f12");
                    linkColors.push("#713f12");
                  }
                });
              }
            });

            return <SankeyChart data={sankeyData} nodeColors={nodeColors} linkColors={linkColors} />;
          })()}
        </div>
      </div>
    </div>
  );
}
