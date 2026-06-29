"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Title } from "@tremor/react";
import SankeyChart from "./sankey-chart";

interface Item {
  id: string;
  name: string;
  amount: number;
}

interface Category {
  name: string;
  items: Item[];
}

interface RevenuSource extends Item {}

interface BudgetData {
  revenues: RevenuSource[];
  expenses: {
    categories: Category[];
  };
  investments: {
    categories: Category[];
  };
}

function formatEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Math.round(value)
  );
}

export default function BudgetEditor() {
  const [budgetData, setBudgetData] = useState<BudgetData>({
    revenues: [],
    expenses: { categories: [] },
    investments: { categories: [] },
  });

  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("freenary.budget.v1");
    if (saved) {
      try {
        setBudgetData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load budget data:", e);
      }
    }
    setMounted(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("freenary.budget.v1", JSON.stringify(budgetData));
    }
  }, [budgetData, mounted]);

  const totals = useMemo(() => {
    let totalRevenues = 0;
    let totalExpenses = 0;
    let totalInvestments = 0;

    budgetData.revenues.forEach((r) => {
      totalRevenues += r.amount;
    });

    budgetData.expenses.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        totalExpenses += item.amount;
      });
    });

    budgetData.investments.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        totalInvestments += item.amount;
      });
    });

    return {
      revenues: totalRevenues,
      expenses: totalExpenses,
      investments: totalInvestments,
      balance: totalRevenues - totalExpenses - totalInvestments,
    };
  }, [budgetData]);

  const sankeyData = useMemo(() => {
    const flowToExpenses = totals.expenses;
    const flowToInvestments = totals.investments;
    const flowToBalance = Math.max(totals.balance, 0);
    const flowToDeficit = Math.max(-totals.balance, 0);

    const expenseCategoryNodes = budgetData.expenses.categories
      .map((category) => {
        const categoryTotal = category.items.reduce((sum, item) => sum + item.amount, 0);
        return {
          name: category.name?.trim() ? category.name.trim() : "Sans catégorie",
          value: categoryTotal,
        };
      })
      .filter((node) => node.value > 0);

    const investmentCategoryNodes = budgetData.investments.categories
      .map((category) => {
        const categoryTotal = category.items.reduce((sum, item) => sum + item.amount, 0);
        return {
          name: category.name?.trim() ? category.name.trim() : "Sans catégorie",
          value: categoryTotal,
        };
      })
      .filter((node) => node.value > 0);

    const baseNodes = [
      { name: "Revenus", value: totals.revenues },
      { name: "Disponible", value: totals.revenues },
      { name: "Dépenses", value: flowToExpenses },
      { name: "Investissements", value: flowToInvestments },
    ];

    const expenseCatNodes = expenseCategoryNodes.map((node) => ({
      name: `Dép: ${node.name}`,
      value: node.value,
    }));

    const categoryNodes = investmentCategoryNodes.map((node) => ({
      name: `Invest: ${node.name}`,
      value: node.value,
    }));

    const expenseCatLinks = expenseCatNodes.map((node, index) => ({
      source: 2,
      target: baseNodes.length + index,
      value: node.value,
    }));

    const categoryLinks = categoryNodes.map((node, index) => ({
      source: 3,
      target: baseNodes.length + expenseCatNodes.length + index,
      value: node.value,
    }));

    return {
      nodes: [...baseNodes, ...expenseCatNodes, ...categoryNodes],
      links: [
        { source: 0, target: 1, value: totals.revenues },
        { source: 1, target: 2, value: flowToExpenses },
        { source: 1, target: 3, value: flowToInvestments },
        ...expenseCatLinks,
        ...categoryLinks,
      ],
    };
  }, [totals.revenues, totals.expenses, totals.investments, totals.balance, budgetData.expenses.categories, budgetData.investments.categories]);

  // Revenue handlers
  const handleAddRevenue = () => {
    setBudgetData({
      ...budgetData,
      revenues: [
        ...budgetData.revenues,
        {
          id: `revenue_${Date.now()}`,
          name: "",
          amount: 0,
        },
      ],
    });
  };

  const handleUpdateRevenue = (
    id: string,
    name?: string,
    amount?: number
  ) => {
    setBudgetData({
      ...budgetData,
      revenues: budgetData.revenues.map((r) =>
        r.id === id
          ? { ...r, ...(name !== undefined && { name }), ...(amount !== undefined && { amount }) }
          : r
      ),
    });
  };

  const handleDeleteRevenue = (id: string) => {
    setBudgetData({
      ...budgetData,
      revenues: budgetData.revenues.filter((r) => r.id !== id),
    });
  };

  // Expense handlers
  const handleAddExpenseCategory = () => {
    setBudgetData({
      ...budgetData,
      expenses: {
        categories: [
          ...budgetData.expenses.categories,
          { name: "", items: [] },
        ],
      },
    });
  };

  const handleUpdateExpenseCategoryName = (index: number, name: string) => {
    const updated = { ...budgetData };
    updated.expenses.categories[index].name = name;
    setBudgetData(updated);
  };

  const handleAddExpense = (categoryIndex: number) => {
    const updated = { ...budgetData };
    updated.expenses.categories[categoryIndex].items.push({
      id: `expense_${Date.now()}`,
      name: "",
      amount: 0,
    });
    setBudgetData(updated);
  };

  const handleUpdateExpense = (
    categoryIndex: number,
    itemIndex: number,
    name?: string,
    amount?: number
  ) => {
    const updated = { ...budgetData };
    const item = updated.expenses.categories[categoryIndex].items[itemIndex];
    if (name !== undefined) item.name = name;
    if (amount !== undefined) item.amount = amount;
    setBudgetData(updated);
  };

  const handleDeleteExpense = (categoryIndex: number, itemIndex: number) => {
    const updated = { ...budgetData };
    updated.expenses.categories[categoryIndex].items.splice(itemIndex, 1);
    setBudgetData(updated);
  };

  // Investment handlers
  const handleAddInvestmentCategory = () => {
    setBudgetData({
      ...budgetData,
      investments: {
        categories: [
          ...budgetData.investments.categories,
          { name: "", items: [] },
        ],
      },
    });
  };

  const handleUpdateInvestmentCategoryName = (index: number, name: string) => {
    const updated = { ...budgetData };
    updated.investments.categories[index].name = name;
    setBudgetData(updated);
  };

  const handleAddInvestment = (categoryIndex: number) => {
    const updated = { ...budgetData };
    updated.investments.categories[categoryIndex].items.push({
      id: `investment_${Date.now()}`,
      name: "",
      amount: 0,
    });
    setBudgetData(updated);
  };

  const handleUpdateInvestment = (
    categoryIndex: number,
    itemIndex: number,
    name?: string,
    amount?: number
  ) => {
    const updated = { ...budgetData };
    const item = updated.investments.categories[categoryIndex].items[itemIndex];
    if (name !== undefined) item.name = name;
    if (amount !== undefined) item.amount = amount;
    setBudgetData(updated);
  };

  const handleDeleteInvestment = (categoryIndex: number, itemIndex: number) => {
    const updated = { ...budgetData };
    updated.investments.categories[categoryIndex].items.splice(itemIndex, 1);
    setBudgetData(updated);
  };

  // Calculate category sums
  const getCategorySum = (category: Category) => {
    return category.items.reduce((sum, item) => sum + item.amount, 0);
  };

  if (!mounted) return null;

  return (
    <div className="h-full w-full p-5">
      <div className="flex h-full w-full flex-col gap-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="border-0 bg-card p-4 shadow-sm rounded-2xl">
            <div className="text-sm text-muted-foreground">Revenus</div>
            <div className="text-2xl font-bold text-sidebar-primary">
              {formatEuros(totals.revenues)}€
            </div>
          </div>
          <div className="border-0 bg-card p-4 shadow-sm rounded-2xl">
            <div className="text-sm text-muted-foreground">Dépenses</div>
            <div className="text-2xl font-bold text-red-500">
              {formatEuros(totals.expenses)}€
            </div>
          </div>
          <div className="border-0 bg-card p-4 shadow-sm rounded-2xl">
            <div className="text-sm text-muted-foreground">Investissements</div>
            <div className="text-2xl font-bold text-amber-500">
              {formatEuros(totals.investments)}€
            </div>
          </div>
          <div className="border-0 bg-card p-4 shadow-sm rounded-2xl">
            <div className="text-sm text-muted-foreground">Solde</div>
            <div
              className={`text-2xl font-bold ${
                totals.balance >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {formatEuros(totals.balance)}€
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Revenues & Expenses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenues */}
            <div className="border-0 bg-card p-6 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <Title className="text-foreground">Revenus</Title>
                <div className="text-sidebar-primary font-bold">
                  {formatEuros(totals.revenues)}€
                </div>
              </div>

              <div className="space-y-3">
                {budgetData.revenues.map((revenue, idx) => (
                  <div key={revenue.id} className="flex gap-3">
                    <Input
                      placeholder="Nom du revenu"
                      value={revenue.name}
                      onChange={(e) =>
                        handleUpdateRevenue(revenue.id, e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Montant"
                      value={revenue.amount}
                      onChange={(e) =>
                        handleUpdateRevenue(
                          revenue.id,
                          undefined,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-24"
                    />
                    <button
                      onClick={() => handleDeleteRevenue(revenue.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleAddRevenue}
                variant="outline"
                className="mt-4 w-full"
              >
                <Plus size={20} className="mr-2" />
                Ajouter une source de revenu
              </Button>
            </div>

            {/* Expenses */}
            <div className="border-0 bg-card p-6 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <Title className="text-foreground">Dépenses</Title>
                <div className="text-red-500 font-bold">
                  {formatEuros(totals.expenses)}€
                </div>
              </div>

              <div className="space-y-4">
                {budgetData.expenses.categories.map((category, catIdx) => (
                  <div
                    key={catIdx}
                    className="border border-sidebar-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Input
                        placeholder="Nom de la catégorie"
                        value={category.name}
                        onChange={(e) =>
                          handleUpdateExpenseCategoryName(catIdx, e.target.value)
                        }
                        className="flex-1"
                      />
                      <div className="text-foreground font-bold ml-4">
                        {formatEuros(getCategorySum(category))}€
                      </div>
                    </div>

                    <div className="space-y-2 ml-4">
                      {category.items.map((item, itemIdx) => (
                        <div key={item.id} className="flex gap-2">
                          <Input
                            placeholder="Nom"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateExpense(
                                catIdx,
                                itemIdx,
                                e.target.value
                              )
                            }
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Montant"
                            value={item.amount}
                            onChange={(e) =>
                              handleUpdateExpense(
                                catIdx,
                                itemIdx,
                                undefined,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24"
                          />
                          <button
                            onClick={() => handleDeleteExpense(catIdx, itemIdx)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => handleAddExpense(catIdx)}
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
                onClick={handleAddExpenseCategory}
                variant="outline"
                className="mt-4 w-full border-dashed"
              >
                <Plus size={20} className="mr-2" />
                Ajouter une catégorie
              </Button>
            </div>
          </div>

          {/* Right Column: Investments */}
          <div>
            <div className="border-0 bg-card p-6 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <Title className="text-foreground">Investissements</Title>
                <div className="text-amber-500 font-bold">
                  {formatEuros(totals.investments)}€
                </div>
              </div>

              <div className="space-y-4">
                {budgetData.investments.categories.map((category, catIdx) => (
                  <div
                    key={catIdx}
                    className="border border-sidebar-border rounded-lg p-3"
                  >
                    <Input
                      placeholder="Catégorie"
                      value={category.name}
                      onChange={(e) =>
                        handleUpdateInvestmentCategoryName(catIdx, e.target.value)
                      }
                      className="mb-3 text-sm"
                    />

                    <div className="space-y-2 ml-2">
                      {category.items.map((item, itemIdx) => (
                        <div key={item.id} className="flex gap-2 text-sm">
                          <Input
                            placeholder="Nom"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateInvestment(
                                catIdx,
                                itemIdx,
                                e.target.value
                              )
                            }
                            className="flex-1 text-xs"
                          />
                          <Input
                            type="number"
                            placeholder="Montant"
                            value={item.amount}
                            onChange={(e) =>
                              handleUpdateInvestment(
                                catIdx,
                                itemIdx,
                                undefined,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 text-xs"
                          />
                          <button
                            onClick={() =>
                              handleDeleteInvestment(catIdx, itemIdx)
                            }
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => handleAddInvestment(catIdx)}
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
                onClick={handleAddInvestmentCategory}
                variant="outline"
                className="mt-4 w-full border-dashed text-xs"
              >
                <Plus size={16} className="mr-2" />
                Ajouter catégorie
              </Button>
            </div>
          </div>
        </div>

        {/* Sankey Chart */}
        <div className="border-0 bg-card p-6 shadow-sm rounded-2xl">
          <Title className="mb-4 text-foreground">Flux Budgétaire</Title>
          <SankeyChart
            data={sankeyData}
            nodeColors={["#a78bfa", "#6f50e5", "#d6475d", "#fbbf24", "#3c898e", "#ef4444"]}
            linkColors={["#6f50e5", "#d6475d", "#fbbf24", "#3c898e", "#ef4444"]}
          />
        </div>
      </div>
    </div>
  );
}
