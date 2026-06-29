"use client";

import { useState } from "react";

import FixedReturnSimulation from "../../components/simulation/fixed-return-simulation";
import MonteCarloSimulation from "../../components/simulation/monte-carlo-simulation";

export default function SimulationPage() {
  const [simulationTab, setSimulationTab] = useState(0);

  return (
    <div className="p-4 md:p-6">
      <div className="h-full rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex flex-row justify-center pt-2">
          {simulationTab === 0 ? (
            <button
              onClick={() => setSimulationTab(0)}
              className="mx-5 border border-x-transparent border-y-transparent border-b-sidebar-primary text-foreground"
            >
              Rendement constant
            </button>
          ) : (
            <button
              onClick={() => setSimulationTab(0)}
              className="mx-5 border border-x-transparent border-y-transparent text-muted-foreground"
            >
              Rendement constant
            </button>
          )}

          {simulationTab === 1 ? (
            <button
              onClick={() => setSimulationTab(1)}
              className="mx-5 border border-x-transparent border-y-transparent border-b-sidebar-primary text-foreground"
            >
              Monte Carlo
            </button>
          ) : (
            <button
              onClick={() => setSimulationTab(1)}
              className="mx-5 border border-x-transparent border-y-transparent text-muted-foreground"
            >
              Monte Carlo
            </button>
          )}
        </div>

        <div className="mx-auto mt-2 h-px w-1/2 bg-sidebar-border" />

        <div className="mb-10 flex w-full flex-row justify-center">
          {simulationTab === 0 ? <FixedReturnSimulation /> : null}
          {simulationTab === 1 ? <MonteCarloSimulation /> : null}
        </div>
      </div>
    </div>
  );
}
