import { CheckCircle2, Zap, Shield, AlertTriangle } from "lucide-react";
import { PlaybookFlowStep } from "./PlaybookFlowStep";
import { ViolationBadge } from "./ViolationBadge";
import type { MasterPlaybookContent } from "@/lib/sopMasterConstants";

interface PlaybookTabContentProps {
  playbook: MasterPlaybookContent;
  activeTab: "flow" | "criteria" | "rules" | "enforcement";
}

export function PlaybookTabContent({ playbook, activeTab }: PlaybookTabContentProps) {
  if (activeTab === "flow") {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Authoritative Process Flow
        </h3>
        <div className="flex flex-col items-center py-4 space-y-0">
          {playbook.flowSteps.map((step, i) => (
            <PlaybookFlowStep
              key={i}
              step={step}
              isLast={i === playbook.flowSteps.length - 1}
            />
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "criteria") {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {/* Entry Criteria */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Entry Criteria
          </h3>
          <ul className="space-y-2">
            {playbook.entryCriteria.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Exit Criteria */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Exit Criteria
          </h3>
          <ul className="space-y-2">
            {playbook.exitCriteria.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (activeTab === "rules") {
    return (
      <div className="space-y-6">
        {/* Governing Rules */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Governing Rules
          </h3>
          <ul className="space-y-3">
            {playbook.rules.map((rule, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border text-sm"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-foreground">{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Zero Tolerance */}
        {playbook.zeroTolerance.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Zero Tolerance
            </h3>
            <div className="space-y-2">
              {playbook.zeroTolerance.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <div className="flex items-center gap-3">
                    <ViolationBadge severity={item.severity} />
                    <span className="text-sm font-medium text-foreground">
                      {item.violation}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.consequence}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "enforcement") {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Zap className="h-5 w-5" />
          System Enforcement
        </h3>
        <ul className="space-y-2">
          {playbook.systemEnforcement.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm"
            >
              <Zap className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
