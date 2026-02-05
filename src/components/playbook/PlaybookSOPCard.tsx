import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Lock,
  Unlock,
  Zap,
  FileText,
  AlertTriangle,
  DollarSign,
  ClipboardCheck,
  Shield,
  Users,
  UserPlus,
  MessageSquare,
  Database,
  Calendar,
  Truck,
  ArrowLeft,
} from "lucide-react";
import { MasterSOP, NEON_GREEN } from "@/lib/masterPlaybookSOPs";
import { PlaybookFlowStep } from "./PlaybookFlowStep";
import { ViolationBadge } from "./ViolationBadge";

const iconMap: Record<string, React.ElementType> = {
  DollarSign,
  ClipboardCheck,
  FileText,
  Shield,
  Users,
  UserPlus,
  MessageSquare,
  Database,
  Calendar,
  Truck,
};

interface PlaybookSOPCardProps {
  sop: MasterSOP;
  isExpanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  isAcknowledged: boolean;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
}

export function PlaybookSOPCard({
  sop,
  isExpanded,
  onToggle,
  onClose,
  isAcknowledged,
  onAcknowledge,
  isAcknowledging,
}: PlaybookSOPCardProps) {
  const IconComponent = iconMap[sop.icon] || FileText;
  const [activeTab, setActiveTab] = useState<'flow' | 'criteria' | 'rules' | 'enforcement'>('flow');

  return (
    <div
      className="rounded-xl border-2 overflow-hidden transition-all duration-300"
      style={{
        borderColor: isAcknowledged ? NEON_GREEN : '#374151',
        backgroundColor: isAcknowledged ? `${NEON_GREEN}08` : '#1F2937',
      }}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: isAcknowledged ? `${NEON_GREEN}20` : '#374151',
            }}
          >
            <IconComponent
              size={24}
              style={{ color: isAcknowledged ? NEON_GREEN : '#9CA3AF' }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${NEON_GREEN}20`,
                  color: NEON_GREEN,
                }}
              >
                SOP {sop.number}
              </span>
              <span className="text-xs text-gray-500">{sop.phase}</span>
              {isAcknowledged && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                  style={{
                    backgroundColor: `${NEON_GREEN}20`,
                    color: NEON_GREEN,
                  }}
                >
                  <CheckCircle2 size={12} />
                  Acknowledged
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mt-1">{sop.title}</h3>
            {!isExpanded && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{sop.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform"
            style={{
              backgroundColor: isExpanded ? `${NEON_GREEN}20` : '#374151',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <ChevronDown
              size={20}
              style={{ color: isExpanded ? NEON_GREEN : '#9CA3AF' }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isExpanded ? '2000px' : '0',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="border-t border-gray-800">
          {/* Close Button Bar */}
          <div className="flex justify-between items-center px-4 py-2 bg-gray-800/30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={14} />
              Close
            </button>
            {!isAcknowledged && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge();
                }}
                disabled={isAcknowledging}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: NEON_GREEN }}
              >
                {isAcknowledging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Acknowledge SOP {sop.number}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-800 overflow-x-auto">
            {(['flow', 'criteria', 'rules', 'enforcement'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-semibold capitalize whitespace-nowrap transition-all ${
                  activeTab === tab ? 'border-b-2' : 'text-gray-500 hover:text-gray-300'
                }`}
                style={{
                  color: activeTab === tab ? NEON_GREEN : undefined,
                  borderColor: activeTab === tab ? NEON_GREEN : 'transparent',
                  backgroundColor: activeTab === tab ? `${NEON_GREEN}08` : 'transparent',
                }}
              >
                {tab === 'flow' ? 'Visual Flow' : tab === 'criteria' ? 'Entry/Exit' : tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Visual Flow Tab */}
            {activeTab === 'flow' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={18} style={{ color: NEON_GREEN }} />
                  <h4
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: NEON_GREEN }}
                  >
                    Authoritative Process Flow
                  </h4>
                </div>
                <div className="flex flex-col items-center py-6 bg-gray-800/50 rounded-xl border border-gray-700">
                  {sop.flowSteps.map((step, idx) => (
                    <PlaybookFlowStep
                      key={idx}
                      step={step}
                      isLast={idx === sop.flowSteps.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Entry/Exit Criteria Tab */}
            {activeTab === 'criteria' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Lock size={18} className="text-amber-400" />
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                      Entry Criteria
                    </h4>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-2">
                    {sop.entryCriteria.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Circle size={10} className="text-amber-400 mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Unlock size={18} style={{ color: NEON_GREEN }} />
                    <h4
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{ color: NEON_GREEN }}
                    >
                      Exit Criteria
                    </h4>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-2">
                    {sop.exitCriteria.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle2
                          size={10}
                          style={{ color: NEON_GREEN }}
                          className="mt-1.5 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={18} style={{ color: NEON_GREEN }} />
                    <h4
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{ color: NEON_GREEN }}
                    >
                      Governing Rules
                    </h4>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
                    {sop.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <ChevronRight
                          size={16}
                          style={{ color: NEON_GREEN }}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-300">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {sop.zeroTolerance.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle size={18} className="text-red-400" />
                      <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">
                        Zero Tolerance Violations
                      </h4>
                    </div>
                    <div className="bg-red-950/30 rounded-xl p-4 border border-red-900/50 space-y-3">
                      {sop.zeroTolerance.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <ViolationBadge type={item.severity} />
                            <span className="text-sm text-gray-300">{item.violation}</span>
                          </div>
                          <span className="text-xs text-red-400 font-medium">
                            → {item.consequence}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enforcement Tab */}
            {activeTab === 'enforcement' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={18} style={{ color: NEON_GREEN }} />
                  <h4
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: NEON_GREEN }}
                  >
                    System Enforcement
                  </h4>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
                  {sop.systemEnforcement.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${NEON_GREEN}20` }}
                      >
                        <CheckCircle2 size={12} style={{ color: NEON_GREEN }} />
                      </div>
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Acknowledge Button */}
          {!isAcknowledged && (
            <div className="p-4 border-t border-gray-800 bg-gray-800/30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge();
                }}
                disabled={isAcknowledging}
                className="w-full py-3 text-sm font-bold text-black rounded-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                style={{ backgroundColor: NEON_GREEN }}
              >
                {isAcknowledging ? 'Acknowledging...' : `I Acknowledge SOP ${sop.number}: ${sop.title}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
