import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PartyPopper, Sparkles, Check, Loader2 } from "lucide-react";
import { NEON_GREEN } from "@/lib/masterPlaybookSOPs";

interface PlaybookCongratulationsModalProps {
  show: boolean;
  onClose: () => void;
  userName?: string;
}

export function PlaybookCongratulationsModal({ show, onClose, userName }: PlaybookCongratulationsModalProps) {
  const navigate = useNavigate();
  const [notificationSent, setNotificationSent] = useState(false);

  useEffect(() => {
    if (show && !notificationSent) {
      // Simulate sending notification to manager/admin
      setTimeout(() => {
        setNotificationSent(true);
      }, 1000);
    }
  }, [show, notificationSent]);

  if (!show) return null;

  const handleContinue = () => {
    onClose();
    navigate('/command-center');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center border-2 overflow-hidden"
        style={{ borderColor: NEON_GREEN }}
      >
        {/* Glow Effect */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${NEON_GREEN} 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          {/* Icon */}
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${NEON_GREEN}20` }}
          >
            <PartyPopper size={40} style={{ color: NEON_GREEN }} />
          </div>

          {/* Title */}
          <h2
            className="text-3xl font-black mb-4 tracking-tight"
            style={{ color: NEON_GREEN }}
          >
            CONGRATULATIONS!
          </h2>

          {/* Sparkles */}
          <div className="flex justify-center gap-2 mb-4">
            <Sparkles size={20} className="text-yellow-400" />
            <Sparkles size={20} style={{ color: NEON_GREEN }} />
            <Sparkles size={20} className="text-yellow-400" />
          </div>

          {/* Message */}
          <p className="text-xl font-bold text-white mb-2">
            You've completed all 10 SOP acknowledgements!
          </p>
          <p className="text-gray-400 mb-6">
            You now have full system access. Your manager and admin team have been notified.
          </p>

          {/* Notification Status */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
            {notificationSent ? (
              <>
                <Check size={16} style={{ color: NEON_GREEN }} />
                Notification sent to manager & admins
              </>
            ) : (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending notification...
              </>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-xl font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: NEON_GREEN }}
          >
            Continue to Hub
          </button>
        </div>
      </div>
    </div>
  );
}
