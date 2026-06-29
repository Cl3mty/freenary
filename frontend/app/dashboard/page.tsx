"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentPng } from "recharts-to-png";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ResponsiveContainer,
  Treemap,
  PieChart,
  Pie,
  Cell,
  AreaChart as RechartsAreaChart,
} from "recharts";
import { Card, DonutChart, Title, AreaChart as TremorAreaChart } from "@tremor/react";
import axios from "axios";
import FileSaver from "file-saver";
import { AiOutlinePieChart, AiOutlineDownload } from "react-icons/ai";
import { TbChartTreemap } from "react-icons/tb";
import { HiDownload } from "react-icons/hi";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type ActiveItem = {
  nom: string;
  repartition: string;
  valeur: string;
  pmValue: string;
};

type PassiveItem = {
  nom: string;
  repartition: string;
  valeur: string;
};

type DistributionItem = {
  name: string;
  size: number;
};

type EvolutionPoint = {
  date: string;
  Running: number;
};

type DashboardApiPayload = {
  actives?: ActiveItem[];
  passives?: PassiveItem[];
  distribution?: DistributionItem[];
  evolution?: EvolutionPoint[];
};

const defaultActives: ActiveItem[] = [
  { nom: "Actions & Fonds", repartition: "46%", valeur: "143 000 EUR", pmValue: "+8 400 EUR" },
  { nom: "Startups & PME", repartition: "9%", valeur: "28 000 EUR", pmValue: "+1 260 EUR" },
  { nom: "Immobilier", repartition: "31%", valeur: "98 000 EUR", pmValue: "+2 150 EUR" },
  { nom: "Crypto", repartition: "9%", valeur: "29 000 EUR", pmValue: "-1 240 EUR" },
  { nom: "Epargne", repartition: "13%", valeur: "41 000 EUR", pmValue: "+310 EUR" },
];

const defaultPassives: PassiveItem[] = [
  { nom: "Pret immobilier", repartition: "73%", valeur: "83 400 EUR" },
  { nom: "Credit auto", repartition: "18%", valeur: "20 700 EUR" },
  { nom: "Dette familiale", repartition: "9%", valeur: "10 560 EUR" },
];

const defaultDistribution: DistributionItem[] = [
  { name: "Actions & Fonds", size: 143000 },
  { name: "Startups & PME", size: 28000 },
  { name: "Immobilier", size: 98000 },
  { name: "Crypto", size: 29000 },
  { name: "Metaux precieux", size: 12000 },
  { name: "Epargne", size: 41000 },
  { name: "Autres", size: 7000 },
];

const defaultEvolution: EvolutionPoint[] = [
  { date: "Jan 23", Running: 167000 },
  { date: "Fev 23", Running: 125000 },
  { date: "Mar 23", Running: 156000 },
  { date: "Avr 23", Running: 165000 },
  { date: "Mai 23", Running: 153000 },
  { date: "Juin 23", Running: 124000 },
];

const performanceRows = [
  { symbol: "BTC", name: "Bitcoin", value: "19 840 EUR", delta: "+6.3%", rank: "#1" },
  { symbol: "CW8", name: "ETF Monde", value: "34 500 EUR", delta: "+2.1%", rank: "#2" },
  { symbol: "ETH", name: "Ethereum", value: "6 940 EUR", delta: "-1.2%", rank: "#3" },
  { symbol: "AIR", name: "Airbus", value: "11 120 EUR", delta: "+0.8%", rank: "#4" },
  { symbol: "OR", name: "Lingot Or", value: "8 430 EUR", delta: "+1.7%", rank: "#5" },
];

const pieColors = ["#d97706", "#2563eb", "#dc2626", "#16a34a", "#7c3aed", "#0f766e", "#db2777"];

export default function DashboardPage() {
  const [getPngArea, { ref: refArea, isLoading: isLoadingArea }] = useCurrentPng();
  const [getPngPieTreeMap, { ref: refPieTreeMap, isLoading: isLoadingPieTreeMap }] = useCurrentPng();

  const [visibleActives, setVisibleActives] = useState<ActiveItem[]>(defaultActives);
  const [visiblePassives, setVisiblePassives] = useState<PassiveItem[]>(defaultPassives);
  const [isChecked, setIsChecked] = useState(false);
  const [dataDistribution, setDataDistribution] = useState<DistributionItem[]>(defaultDistribution);
  const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>(defaultEvolution);

  useEffect(() => {
    let isMounted = true;

    // Keep fallback data while preparing backend endpoints.
    axios
      .get("/api/dashboard")
      .then((response: { data: DashboardApiPayload }) => {
        if (!isMounted) return;
        const data = response.data;

        if (data.actives?.length) setVisibleActives(data.actives);
        if (data.passives?.length) setVisiblePassives(data.passives);
        if (data.distribution?.length) setDataDistribution(data.distribution);
        if (data.evolution?.length) setEvolutionData(data.evolution);
      })
      .catch(() => {
        // Intentionally silent: dashboard keeps local mock data.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownloadArea = useCallback(async () => {
    const png = await getPngArea();
    if (png) {
      FileSaver.saveAs(
        png,
        `FREENARY-evolution-${new Date().toLocaleDateString("en-GB").replaceAll("/", "-")}.png`
      );
    }
  }, [getPngArea]);

  const handleDownloadPieTreeMap = useCallback(async () => {
    const png = await getPngPieTreeMap();
    if (png) {
      FileSaver.saveAs(
        png,
        `FREENARY-distribution-${new Date().toLocaleDateString("en-GB").replaceAll("/", "-")}.png`
      );
    }
  }, [getPngPieTreeMap]);

  const toggleSwitch = () => {
    setIsChecked((prev) => !prev);
  };

  const valueFormatter = (number: number) => `${new Intl.NumberFormat("fr-FR").format(number)} EUR`;

  const dataFormatter = (number: number) => {
    if (number > 1000000) return `${Math.round(number / 1000000)} M EUR`;
    if (number > 1000) return `${Math.round(number / 1000)} kEUR`;
    return `${number} EUR`;
  };

  return (
    <div className="flex min-h-full flex-col gap-5 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <Card className="xl:col-span-3 rounded-2xl border-0 bg-card p-5 shadow-sm" ref={refArea}>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Title className="text-foreground">Evolution</Title>
              <p className="text-sm text-muted-foreground">Tout</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadArea}
              disabled={isLoadingArea}
              className="inline-flex items-center gap-1 rounded-md border border-sidebar-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-60"
            >
              <HiDownload className="size-4" />
              <AiOutlineDownload className="size-4" />
            </button>
          </div>

          <div className="h-[340px]">
            <TremorAreaChart
              className="h-full"
              data={evolutionData}
              index="date"
              categories={["Running"]}
              colors={["amber"]}
              showLegend={false}
              yAxisWidth={42}
              valueFormatter={dataFormatter}
            />
          </div>
        </Card>

        <Card className="rounded-2xl border-0 bg-card p-5 shadow-sm" ref={refPieTreeMap}>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Title className="text-foreground">Distribution</Title>
              <p className="text-sm text-muted-foreground">Tout</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isChecked}
                  onChange={toggleSwitch}
                />
                <div className="flex h-7 w-14 items-center rounded-full border border-sidebar-border bg-sidebar-accent px-1">
                  <TbChartTreemap
                    className={`size-5 rounded-full p-0.5 transition-colors ${isChecked ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-muted-foreground"}`}
                  />
                  <AiOutlinePieChart
                    className={`ml-auto size-5 rounded-full p-0.5 transition-colors ${!isChecked ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-muted-foreground"}`}
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={handleDownloadPieTreeMap}
                disabled={isLoadingPieTreeMap}
                className="inline-flex items-center justify-center rounded-md border border-sidebar-border px-2 py-2 text-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-60"
              >
                <HiDownload className="size-4" />
              </button>
            </div>
          </div>

          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              {isChecked ? (
                <Treemap
                  data={dataDistribution}
                  dataKey="size"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  stroke="var(--color-sidebar-border)"
                  fill="var(--color-sidebar-primary)"
                >
                  <Tooltip />
                </Treemap>
              ) : (
                <div className="flex h-full flex-col">
                  <PieChart>
                    <Pie
                      data={dataDistribution}
                      dataKey="size"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {dataDistribution.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => valueFormatter(Number(val))} />
                  </PieChart>
                </div>
              )}
            </ResponsiveContainer>
          </div>
          
        </Card>
      </div>

      <Card className="rounded-2xl border-0 bg-card p-5 shadow-sm">
        <Accordion type="single" collapsible defaultValue="actifs" className="w-full">
          <AccordionItem value="actifs">
            <AccordionTrigger className="justify-start items-center text-xl font-semibold text-foreground hover:no-underline [&>[data-slot=accordion-trigger-icon]]:order-first [&>[data-slot=accordion-trigger-icon]]:ml-0 [&>[data-slot=accordion-trigger-icon]]:mr-2">
              Actifs
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-sidebar-border text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Nom</th>
                      <th className="px-3 py-2 font-medium">Repartition</th>
                      <th className="px-3 py-2 font-medium">Valeur</th>
                      <th className="px-3 py-2 font-medium">+/- Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleActives.map((active) => (
                      <tr key={active.nom} className="border-b border-sidebar-border/60">
                        <td className="px-3 py-3 text-foreground">{active.nom}</td>
                        <td className="px-3 py-3 text-muted-foreground">{active.repartition}</td>
                        <td className="px-3 py-3 font-medium text-foreground">{active.valeur}</td>
                        <td
                          className={`px-3 py-3 font-medium ${
                            active.pmValue.startsWith("+")
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {active.pmValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card className="rounded-2xl border-0 bg-card p-5 shadow-sm">
        <Accordion type="single" collapsible defaultValue="passifs" className="w-full">
          <AccordionItem value="passifs">
            <AccordionTrigger className="justify-start items-center text-xl font-semibold text-foreground hover:no-underline [&>[data-slot=accordion-trigger-icon]]:order-first [&>[data-slot=accordion-trigger-icon]]:ml-0 [&>[data-slot=accordion-trigger-icon]]:mr-2">
              Passifs
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-sidebar-border text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Nom</th>
                      <th className="px-3 py-2 font-medium">Repartition</th>
                      <th className="px-3 py-2 font-medium">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePassives.map((passive) => (
                      <tr key={passive.nom} className="border-b border-sidebar-border/60">
                        <td className="px-3 py-3 text-foreground">{passive.nom}</td>
                        <td className="px-3 py-3 text-muted-foreground">{passive.repartition}</td>
                        <td className="px-3 py-3 font-medium text-foreground">{passive.valeur}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-foreground">Ma performance</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {performanceRows.map((row, idx) => (
            <Card
              key={`${row.symbol}-${idx}`}
              className="min-w-64 rounded-2xl border-0 bg-card p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{row.name}</p>
                  <p className="text-lg font-semibold text-foreground">{row.symbol}</p>
                </div>
                <span className="rounded-md bg-sidebar-accent px-2 py-1 text-xs text-sidebar-foreground">
                  {row.rank}
                </span>
              </div>

              <div className="mb-2 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsAreaChart
                    data={evolutionData.map((point, index) => ({
                      date: point.date,
                      value: point.Running * (0.9 + (idx + index) / 20),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-sidebar-border)" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip formatter={(val) => valueFormatter(Number(val))} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-sidebar-primary)"
                      fill="var(--color-sidebar-primary)"
                      fillOpacity={0.2}
                    />
                  </RechartsAreaChart>
                </ResponsiveContainer>
              </div>

              <p className="text-sm font-semibold text-foreground">{row.value}</p>
              <p
                className={`text-sm ${
                  row.delta.startsWith("+")
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {row.delta}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
