import { CheckCircle2, Play, Square, Diamond } from "lucide-react";
import { FlowStep, NEON_GREEN } from "@/lib/masterPlaybookSOPs";

interface PlaybookFlowStepProps {
  step: FlowStep;
  isLast: boolean;
}

export function PlaybookFlowStep({ step, isLast }: PlaybookFlowStepProps) {
  const getStepStyle = (type: FlowStep['type']) => {
    switch (type) {
      case 'start':
        return { bg: `${NEON_GREEN}20`, border: NEON_GREEN, Icon: Play, iconColor: NEON_GREEN };
      case 'end':
        return { bg: `${NEON_GREEN}20`, border: NEON_GREEN, Icon: CheckCircle2, iconColor: NEON_GREEN };
      case 'decision':
        return { bg: '#F59E0B20', border: '#F59E0B', Icon: Diamond, iconColor: '#F59E0B' };
      default:
        return { bg: '#374151', border: '#4B5563', Icon: Square, iconColor: '#9CA3AF' };
    }
  };

  const style = getStepStyle(step.type);
  const Icon = style.Icon;

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <div
        className="w-full rounded-lg p-4 border-2 transition-all"
        style={{ backgroundColor: style.bg, borderColor: style.border }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon size={16} style={{ color: style.iconColor }} />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {step.owner}
          </span>
        </div>
        <p className="text-white font-medium">{step.label}</p>
        {step.note && <p className="text-sm text-gray-400 mt-1">{step.note}</p>}
      </div>

      {step.branches && step.branches.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-3 px-2">
          {step.branches.map((branch, idx) => (
            <span
              key={idx}
              className="text-xs px-3 py-1.5 rounded-full border"
              style={{
                backgroundColor: '#F59E0B10',
                borderColor: '#F59E0B50',
                color: '#F59E0B',
              }}
            >
              {branch}
            </span>
          ))}
        </div>
      )}

      {!isLast && (
        <div className="flex flex-col items-center my-2">
          <div className="w-0.5 h-6" style={{ backgroundColor: '#4B5563' }} />
          <div
            className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px]"
            style={{
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: '#4B5563',
            }}
          />
        </div>
      )}
    </div>
  );
}
