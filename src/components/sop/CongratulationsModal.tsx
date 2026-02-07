import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper, Sparkles, Home, CheckCircle2, Send } from "lucide-react";

interface CongratulationsModalProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
}

// Confetti animation component
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;

  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 2,
    color: ['hsl(var(--primary))', '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7'][
      Math.floor(Math.random() * 5)
    ],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 rounded-full animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

export function CongratulationsModal({ open, onClose, userName }: CongratulationsModalProps) {
  const navigate = useNavigate();
  const [notificationSent, setNotificationSent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      // Simulate notification being sent
      const timer = setTimeout(() => {
        setNotificationSent(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
      setNotificationSent(false);
    }
  }, [open]);

  const handleGoToHub = () => {
    onClose();
    navigate("/command-center");
  };

  return (
    <>
      <Confetti active={showConfetti} />
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-md text-center border-primary/30"
          hideClose
        >
          {/* Celebration Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <PartyPopper className="h-10 w-10 text-primary" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 animate-bounce" />
              <Sparkles className="absolute -bottom-1 -left-3 h-5 w-5 text-primary animate-bounce delay-100" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            CONGRATULATIONS!
          </h2>

          {/* Subtitle */}
          <p className="text-lg text-foreground mt-2">
            You've completed all 10 SOP acknowledgements!
          </p>

          <p className="text-sm text-muted-foreground">
            You now have full access to the TSM Roof Pro Hub.
          </p>

          {/* Notification Status */}
          <div className="flex items-center justify-center gap-2 text-sm mt-4">
            {notificationSent ? (
              <span className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Notification sent to manager & admins
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Send className="h-4 w-4 animate-pulse" />
                Sending notification...
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-6">
            <Button onClick={handleGoToHub} className="gap-2">
              <Home className="h-4 w-4" />
              Go to Command Center
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Stay in SOP Library
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
