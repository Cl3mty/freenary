"use client";

import { useMemo, useState } from "react";
import { BarChart, Legend, Title } from "@tremor/react";

type IRChartRow = {
  pourcentage: string;
  montant: number;
  montantMax: number;
  impot: number;
};

const limits = [11294, 28797, 82341, 177106];
const rates = [0, 11, 30, 41, 45];

function formatEuros(value: number) {
  return Math.round(value).toLocaleString("fr-FR");
}

function dataFormatter(number: number) {
  if (number > 1_000_000) return `${Math.round(number / 1_000_000)} M€`;
  if (number > 1_000) return `${Math.round(number / 1_000)} k€`;
  return `${Math.round(number)} €`;
}

export default function IR() {
  const [netImposable, setNetImposable] = useState(150000);
  const [nbrParts, setNbrParts] = useState(1);

  const result = useMemo(() => {
    const quotientFamilial = Math.round(netImposable / Math.max(1, nbrParts));

    const montant1 = Math.max(0, Math.min(quotientFamilial, limits[0]));
    const montant2 = Math.max(0, Math.min(quotientFamilial - limits[0], limits[1] - limits[0]));
    const montant3 = Math.max(0, Math.min(quotientFamilial - limits[1], limits[2] - limits[1]));
    const montant4 = Math.max(0, Math.min(quotientFamilial - limits[2], limits[3] - limits[2]));
    const montant5 = Math.max(0, quotientFamilial - limits[3]);

    const montants = [montant1, montant2, montant3, montant4, montant5];
    const maxIndex = montants.map((v, i) => ({ v, i })).filter((x) => x.v > 0).at(-1)?.i ?? 0;
    const tauxMarginaleImposition = rates[maxIndex];

    const impot1 = (montant1 * rates[0]) / 100;
    const impot2 = (montant2 * rates[1]) / 100;
    const impot3 = (montant3 * rates[2]) / 100;
    const impot4 = (montant4 * rates[3]) / 100;
    const impot5 = (montant5 * rates[4]) / 100;

    const impotRevenuTotal = (impot1 + impot2 + impot3 + impot4 + impot5) * Math.max(1, nbrParts);

    const chartData: IRChartRow[] = [
      { pourcentage: `${rates[0]}%`, montant: montant1, montantMax: 11294, impot: impot1 },
      { pourcentage: `${rates[1]}%`, montant: montant2, montantMax: 17503, impot: impot2 },
      { pourcentage: `${rates[2]}%`, montant: montant3, montantMax: 53544, impot: impot3 },
      { pourcentage: `${rates[3]}%`, montant: montant4, montantMax: 94765, impot: impot4 },
      { pourcentage: `${rates[4]}%`, montant: montant5, montantMax: 120000, impot: impot5 },
    ];

    return { quotientFamilial, tauxMarginaleImposition, impotRevenuTotal, chartData };
  }, [netImposable, nbrParts]);

  return (
    <div className="h-full w-full p-5">
      <div className="flex h-full w-full flex-col rounded-2xl bg-card md:flex-row">
        <div className="w-full border-b border-sidebar-border p-6 md:w-1/4 md:border-r md:border-b-0 md:pt-10">
          <div className="space-y-6">
            <label className="block text-sm text-foreground">
              Revenu net imposable
              <input
                value={netImposable}
                onChange={(event) => setNetImposable(Number(event.target.value) || 0)}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Nombre de parts
              <input
                value={nbrParts}
                onChange={(event) => setNbrParts(Math.max(1, Number(event.target.value) || 1))}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
          </div>
        </div>

        <div className="w-full p-6 md:w-3/4 md:p-10">
          <Title className="text-center text-xl text-foreground">
            Cette annee, vous avez un net imposable de <span className="text-sidebar-primary">{formatEuros(netImposable)}€</span>,
            induisant un impot sur le revenu total de <span className="text-sidebar-primary">{formatEuros(result.impotRevenuTotal)}€</span>,
            soit l'equivalent de <span className="text-sidebar-primary">{formatEuros(result.impotRevenuTotal / 12)}€/mois</span>
          </Title>

          <BarChart
            className="mt-10 h-96"
            data={result.chartData}
            index="pourcentage"
            categories={["montant", "montantMax", "impot"]}
            colors={["amber", "violet", "red"]}
            valueFormatter={dataFormatter}
            startEndOnly={false}
            showAnimation
            showTooltip
            showLegend={false}
            showGridLines
            autoMinValue
            showYAxis
          />

          <Legend
            className="mt-2 flex flex-row justify-evenly"
            categories={["montant", "montantMax", "impot"]}
            colors={["amber", "violet", "red"]}
          />

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Quotient familial</div>
              <div className="text-sidebar-primary">{formatEuros(result.quotientFamilial)}€</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Taux Marginal d'Imposition</div>
              <div className="text-sidebar-primary">{result.tauxMarginaleImposition}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Impot sur le revenu (total & mensualise)</div>
              <div className="text-sidebar-primary">
                <div>{formatEuros(result.impotRevenuTotal)}€</div>
                <div>{formatEuros(result.impotRevenuTotal / 12)}€/mois</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
