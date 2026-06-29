"use client";

import { useMemo, useState } from "react";
import { BarChart, Legend, Title } from "@tremor/react";

type IFIChartRow = {
  pourcentage: string;
  montant: number;
  montantMax: number;
  impot: number;
};

const limits = [800000, 1300000, 2570000, 5000000, 10000000];
const rates = [0, 0.5, 0.7, 1, 1.25, 1.5];

function formatEuros(value: number) {
  return Math.round(value).toLocaleString("fr-FR");
}

function dataFormatter(number: number) {
  if (number > 1_000_000) return `${Math.round(number / 1_000_000)} M€`;
  if (number > 1_000) return `${Math.round(number / 1_000)} k€`;
  return `${Math.round(number)} €`;
}

export default function IFI() {
  const [immobilierNet, setImmobilierNet] = useState(20000000);

  const result = useMemo(() => {
    const montant1 = Math.max(0, Math.min(immobilierNet, limits[0]));
    const montant2 = Math.max(0, Math.min(immobilierNet - limits[0], limits[1] - limits[0]));
    const montant3 = Math.max(0, Math.min(immobilierNet - limits[1], limits[2] - limits[1]));
    const montant4 = Math.max(0, Math.min(immobilierNet - limits[2], limits[3] - limits[2]));
    const montant5 = Math.max(0, Math.min(immobilierNet - limits[3], limits[4] - limits[3]));
    const montant6 = Math.max(0, immobilierNet - limits[4]);

    const montants = [montant1, montant2, montant3, montant4, montant5, montant6];
    const maxIndex = montants.map((v, i) => ({ v, i })).filter((x) => x.v > 0).at(-1)?.i ?? 0;
    const tauxMax = immobilierNet > 1300000 ? rates[maxIndex] : 0;

    const impot1 = immobilierNet > 1300000 ? (montant1 * rates[0]) / 100 : 0;
    const impot2 = immobilierNet > 1300000 ? (montant2 * rates[1]) / 100 : 0;
    const impot3 = immobilierNet > 1300000 ? (montant3 * rates[2]) / 100 : 0;
    const impot4 = immobilierNet > 1300000 ? (montant4 * rates[3]) / 100 : 0;
    const impot5 = immobilierNet > 1300000 ? (montant5 * rates[4]) / 100 : 0;
    const impot6 = immobilierNet > 1300000 ? (montant6 * rates[5]) / 100 : 0;

    const impotFortuneImmobiliereTotal = impot1 + impot2 + impot3 + impot4 + impot5 + impot6;

    const chartData: IFIChartRow[] = [
      { pourcentage: `${rates[0]}%`, montant: montant1, montantMax: 800000, impot: impot1 },
      { pourcentage: `${rates[1]}%`, montant: montant2, montantMax: 500000, impot: impot2 },
      { pourcentage: `${rates[2]}%`, montant: montant3, montantMax: 1270000, impot: impot3 },
      { pourcentage: `${rates[3]}%`, montant: montant4, montantMax: 2430000, impot: impot4 },
      { pourcentage: `${rates[4]}%`, montant: montant5, montantMax: 5000000, impot: impot5 },
      { pourcentage: `${rates[5]}%`, montant: montant6, montantMax: 1200000, impot: impot6 },
    ];

    return {
      tauxMax,
      impotFortuneImmobiliereTotal,
      chartData,
    };
  }, [immobilierNet]);

  return (
    <div className="h-full w-full p-5">
      <div className="flex h-full w-full flex-col rounded-2xl bg-card md:flex-row">
        <div className="w-full border-b border-sidebar-border p-6 md:w-1/4 md:border-r md:border-b-0 md:pt-10">
          <label className="block text-sm text-foreground">
            Patrimoine immobilier net
            <input
              value={immobilierNet}
              onChange={(event) => setImmobilierNet(Number(event.target.value) || 0)}
              className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
            />
          </label>
        </div>

        <div className="w-full p-6 md:w-3/4 md:p-10">
          <Title className="text-center text-xl text-foreground">
            Cette annee, vous avez un patrimoine immobilier net de <span className="text-sidebar-primary">{formatEuros(immobilierNet)}€</span>,
            induisant un impot sur la fortune immobiliere total de <span className="text-sidebar-primary">{formatEuros(result.impotFortuneImmobiliereTotal)}€</span>,
            soit l'equivalent de <span className="text-sidebar-primary">{formatEuros(result.impotFortuneImmobiliereTotal / 12)}€/mois</span>
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

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Taux maximal d'imposition</div>
              <div className="text-sidebar-primary">{result.tauxMax}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">IFI (total & mensualise)</div>
              <div className="text-sidebar-primary">
                <div>{formatEuros(result.impotFortuneImmobiliereTotal)}€</div>
                <div>{formatEuros(result.impotFortuneImmobiliereTotal / 12)}€/mois</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
