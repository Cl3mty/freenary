"use client";

import { useState } from "react";

import IFI from "../../components/taxation/ifi";
import IR from "../../components/taxation/ir";

export default function TaxationPage() {
  const [taxationTab, setTaxationTab] = useState(0);

  return (
    <div className="p-4 md:p-6">
      <div className="h-full rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex flex-row justify-center pt-2">
          {taxationTab === 0 ? (
            <button
              onClick={() => setTaxationTab(0)}
              className="mx-5 border border-x-transparent border-y-transparent border-b-sidebar-primary text-foreground"
            >
              Impot sur le revenu
            </button>
          ) : (
            <button
              onClick={() => setTaxationTab(0)}
              className="mx-5 border border-x-transparent border-y-transparent text-muted-foreground"
            >
              Impot sur le revenu
            </button>
          )}

          {taxationTab === 1 ? (
            <button
              onClick={() => setTaxationTab(1)}
              className="mx-5 border border-x-transparent border-y-transparent border-b-sidebar-primary text-foreground"
            >
              Impot sur la fortune immobiliere
            </button>
          ) : (
            <button
              onClick={() => setTaxationTab(1)}
              className="mx-5 border border-x-transparent border-y-transparent text-muted-foreground"
            >
              Impot sur la fortune immobiliere
            </button>
          )}
        </div>

        <div className="mx-auto mt-2 h-px w-1/2 bg-sidebar-border" />

        <div className="mb-10 flex w-full flex-row justify-center">
          {taxationTab === 0 ? <IR /> : null}
          {taxationTab === 1 ? <IFI /> : null}
        </div>
      </div>
    </div>
  );
}
