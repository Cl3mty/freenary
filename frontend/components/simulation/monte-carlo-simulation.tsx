"use client";

import { useMemo, useState } from "react";
import { AreaChart, Legend, Title } from "@tremor/react";

type MonteCarloChartRow = {
  annee: string;
  "patrimoine initial": number;
  versements: number;
  "intérets cumulés median": number;
};

function formatEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function dataFormatter(number: number) {
  if (number > 1_000_000) return `${Math.round(number / 1_000_000)} M€`;
  if (number > 1_000) return `${Math.round(number / 1_000)} k€`;
  return `${Math.round(number)} €`;
}

function normalRandom() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[index];
}

export default function MonteCarloSimulation() {
  const [patrimoineInitial, setPatrimoineInitial] = useState(10000);
  const [investissementsAnnuels, setInvestissementsAnnuels] = useState(3600);
  const [nbrAnneesEpargne, setNbrAnneesEpargne] = useState(20);
  const [rendement, setRendement] = useState(8);
  const [volatilite, setVolatilite] = useState(10);
  const [imposition, setImposition] = useState(17.2);
  const [retrait, setRetrait] = useState(4);
  const [inflation, setInflation] = useState(3);
  const [nombreSimulations, setNombreSimulations] = useState(1000);

  const result = useMemo(() => {
    const perYearCaps: number[][] = Array.from({ length: nbrAnneesEpargne + 1 }, () => []);

    for (let run = 0; run < nombreSimulations; run += 1) {
      let capital = patrimoineInitial;
      perYearCaps[0].push(capital);

      for (let year = 1; year <= nbrAnneesEpargne; year += 1) {
        const annualShock = normalRandom();
        const annualReturn = rendement / 100 + (volatilite / 100) * annualShock;
        capital = (capital + investissementsAnnuels) * (1 + annualReturn);
        perYearCaps[year].push(capital);
      }
    }

    const chartData: MonteCarloChartRow[] = perYearCaps.map((values, year) => {
      const capitalMedian = percentile(values, 50);
      const versementsCumules = investissementsAnnuels * year;
      const interetsCumules = Math.max(capitalMedian - patrimoineInitial - versementsCumules, 0);

      return {
        annee: String(year),
        "patrimoine initial": patrimoineInitial,
        versements: versementsCumules,
        "intérets cumulés median": interetsCumules,
      };
    });

    const last = chartData[chartData.length - 1];
    const capitalFinalMedian =
      (last?.["patrimoine initial"] ?? patrimoineInitial) +
      (last?.versements ?? 0) +
      (last?.["intérets cumulés median"] ?? 0);

    const versementsCumules = investissementsAnnuels * nbrAnneesEpargne;
    const interetsCumules = Math.max(capitalFinalMedian - patrimoineInitial - versementsCumules, 0);
    const plusValueMediane = interetsCumules;
    const valeurNette = capitalFinalMedian - plusValueMediane * (imposition / 100);
    const revenuPassifMensuel =
      (valeurNette * (retrait / 100)) / 12 / Math.pow(1 + inflation / 100, nbrAnneesEpargne);

    return {
      chartData,
      capitalFinalMedian,
      versementsCumules,
      interetsCumules,
      plusValueMediane,
      valeurNette,
      revenuPassifMensuel,
    };
  }, [
    patrimoineInitial,
    investissementsAnnuels,
    nbrAnneesEpargne,
    rendement,
    volatilite,
    imposition,
    retrait,
    inflation,
    nombreSimulations,
  ]);

  return (
    <div className="h-full w-full p-5">
      <div className="flex h-full w-full flex-col rounded-2xl bg-card md:flex-row">
        <div className="w-full border-b border-sidebar-border p-6 md:w-1/4 md:border-r md:border-b-0 md:pt-10">
          <div className="space-y-4">
            <label className="block text-sm text-foreground">
              Patrimoine initial
              <input
                value={patrimoineInitial}
                onChange={(event) => setPatrimoineInitial(Number(event.target.value) || 0)}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Investissements annuels
              <input
                value={investissementsAnnuels}
                onChange={(event) => setInvestissementsAnnuels(Number(event.target.value) || 0)}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Nombre d'annees d'epargne
              <input
                value={nbrAnneesEpargne}
                onChange={(event) => setNbrAnneesEpargne(Math.max(1, Number(event.target.value) || 1))}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Rendement (%)
              <input
                value={rendement}
                onChange={(event) => setRendement(Number(event.target.value) || 0)}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Volatilite (%)
              <input
                value={volatilite}
                onChange={(event) => setVolatilite(Math.max(0, Number(event.target.value) || 0))}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Taux d'imposition (%)
              <input
                value={imposition}
                onChange={(event) => setImposition(Number(event.target.value) || 0)}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Taux de retrait (%)
              <input
                value={retrait}
                onChange={(event) => setRetrait(Number(event.target.value) || 0)}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Taux d'inflation (%)
              <input
                value={inflation}
                onChange={(event) => setInflation(Number(event.target.value) || 0)}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
            <label className="block text-sm text-foreground">
              Nombre de simulations
              <input
                value={nombreSimulations}
                onChange={(event) => setNombreSimulations(Math.max(100, Number(event.target.value) || 100))}
                className="mt-2 w-full border border-x-transparent border-t-transparent border-b-sidebar-border bg-transparent p-2.5 text-sm text-foreground outline-none focus:border-b-sidebar-primary"
              />
            </label>
          </div>
      </div>

        <div className="w-full p-6 md:w-3/4 md:p-10">
          <Title className="text-center text-xl text-foreground">
            Au bout de <span className="text-sidebar-primary">{nbrAnneesEpargne} ans</span>, vous pouvez
            generer un revenu passif de <span className="text-sidebar-primary">{formatEuros(result.revenuPassifMensuel)}€/mois</span>
            {" "}
            pour un capital final de <span className="text-sidebar-primary">{formatEuros(result.capitalFinalMedian)}€</span>
          </Title>

          <AreaChart
            className="mt-10 h-96"
            data={result.chartData}
            index="annee"
            categories={["patrimoine initial", "versements", "intérets cumulés median"]}
            colors={["red", "violet", "amber"]}
            valueFormatter={dataFormatter}
            startEndOnly
            showAnimation
            showTooltip
            showLegend={false}
            showGridLines
            showGradient={false}
            autoMinValue
            showYAxis
            stack
          />

          <Legend
            className="mt-2 flex flex-row justify-evenly"
            categories={["patrimoine initial", "versements", "intérets cumulés median"]}
            colors={["red", "violet", "amber"]}
          />

          <Title className="mt-10 text-center text-xl text-foreground">
            Celui-ci se compose de <span className="text-sidebar-primary">{formatEuros(patrimoineInitial)}€</span>
            {" "}
            de patrimoine initial, de <span className="text-sidebar-primary">{formatEuros(result.versementsCumules)}€</span>
            {" "}
            de versements et de <span className="text-sidebar-primary">{formatEuros(result.interetsCumules)}€</span>
            {" "}
            d'interets percus, apres <span className="text-sidebar-primary">{nbrAnneesEpargne} annees</span>.
          </Title>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Valeur future mediane</div>
              <div className="text-sidebar-primary">{formatEuros(result.capitalFinalMedian)}€</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Dont plus-value mediane</div>
              <div className="text-sidebar-primary">{formatEuros(result.plusValueMediane)}€</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Valeur nette</div>
              <div className="text-sidebar-primary">{formatEuros(result.valeurNette)}€</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Revenu mensuel</div>
              <div className="text-sidebar-primary">{formatEuros(result.revenuPassifMensuel)}€</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
