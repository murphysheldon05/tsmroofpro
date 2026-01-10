import { z } from "zod";

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
}

export const PASSWORD_MIN_LENGTH = 12;

// Password schema with all requirements
export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*...)");
  }
  
  return { valid: errors.length === 0, errors };
}

export function getPasswordStrength(password: string): PasswordStrength {
  const requirements = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  const metCount = Object.values(requirements).filter(Boolean).length;

  if (metCount === 0) {
    return { score: 0, label: "Very Weak", color: "bg-red-500", requirements };
  } else if (metCount === 1) {
    return { score: 1, label: "Weak", color: "bg-orange-500", requirements };
  } else if (metCount === 2) {
    return { score: 1, label: "Weak", color: "bg-orange-500", requirements };
  } else if (metCount === 3) {
    return { score: 2, label: "Fair", color: "bg-yellow-500", requirements };
  } else if (metCount === 4) {
    return { score: 3, label: "Good", color: "bg-blue-500", requirements };
  } else {
    return { score: 4, label: "Strong", color: "bg-green-500", requirements };
  }
}
