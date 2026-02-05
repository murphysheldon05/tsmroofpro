interface PlaybookConfettiProps {
  active: boolean;
}

export function PlaybookConfetti({ active }: PlaybookConfettiProps) {
  if (!active) return null;

  // Using CSS custom property colors for the confetti
  const confettiColors = [
    'hsl(120, 100%, 62%)', // primary green
    'hsl(150, 100%, 50%)', // lighter green
    '#FFD700', // gold
    '#FF6B6B', // coral
    '#4ECDC4', // teal
  ];

  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 2,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: 'rotate(45deg)',
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
