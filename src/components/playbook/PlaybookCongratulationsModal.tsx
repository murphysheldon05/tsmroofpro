import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PartyPopper, Sparkles, Check, Loader2 } from "lucide-react";

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
      <div className="relative bg-card rounded-2xl p-8 max-w-md w-full text-center border-2 border-primary overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,hsl(var(--primary))_0%,transparent_70%)]" />

        <div className="relative z-10">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-primary/20">
            <PartyPopper size={40} className="text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-black mb-4 tracking-tight text-primary">
            CONGRATULATIONS!
          </h2>

          {/* Sparkles */}
          <div className="flex justify-center gap-2 mb-4">
            <Sparkles size={20} className="text-yellow-400" />
            <Sparkles size={20} className="text-primary" />
            <Sparkles size={20} className="text-yellow-400" />
          </div>

          {/* Message */}
          <p className="text-xl font-bold text-foreground mb-2">
            You've completed all 10 SOP acknowledgements!
          </p>
          <p className="text-muted-foreground mb-6">
            You now have full system access. Your manager and admin team have been notified.
          </p>

          {/* Notification Status */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            {notificationSent ? (
              <>
                <Check size={16} className="text-primary" />
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
            className="w-full py-3 rounded-xl font-bold text-primary-foreground bg-primary transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Continue to Hub
          </button>
        </div>
      </div>
    </div>
  );
}
