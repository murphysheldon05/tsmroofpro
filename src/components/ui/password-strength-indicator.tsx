import { Check, X } from "lucide-react";
import { getPasswordStrength, PASSWORD_MIN_LENGTH } from "@/lib/passwordValidation";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);
  
  if (!password) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            "font-medium",
            strength.score <= 1 && "text-red-500",
            strength.score === 2 && "text-yellow-500",
            strength.score === 3 && "text-blue-500",
            strength.score === 4 && "text-green-500"
          )}>
            {strength.label}
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", strength.color)}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-1 text-xs">
        <RequirementItem 
          met={strength.requirements.minLength} 
          label={`At least ${PASSWORD_MIN_LENGTH} characters`} 
        />
        <RequirementItem 
          met={strength.requirements.hasUppercase} 
          label="One uppercase letter (A-Z)" 
        />
        <RequirementItem 
          met={strength.requirements.hasLowercase} 
          label="One lowercase letter (a-z)" 
        />
        <RequirementItem 
          met={strength.requirements.hasNumber} 
          label="One number (0-9)" 
        />
        <RequirementItem 
          met={strength.requirements.hasSymbol} 
          label="One special character (!@#$%^&*...)" 
        />
      </div>
    </div>
  );
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 transition-colors",
      met ? "text-green-600" : "text-muted-foreground"
    )}>
      {met ? (
        <Check className="w-3 h-3" />
      ) : (
        <X className="w-3 h-3" />
      )}
      <span>{label}</span>
    </div>
  );
}
