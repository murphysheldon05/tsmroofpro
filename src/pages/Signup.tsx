import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Clock, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "office_admin", label: "Office Admin" },
  { value: "va", label: "VA (Virtual Assistant)" },
  { value: "sales", label: "Sales" },
  { value: "production", label: "Production" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "vendor", label: "Vendor" },
] as const;

const DEPARTMENT_OPTIONS = [
  { value: "production", label: "Production" },
  { value: "sales", label: "Sales" },
  { value: "office", label: "Office" },
  { value: "accounting", label: "Accounting" },
  { value: "other", label: "Other" },
] as const;

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  requestedRole: z.string().min(1, "Please select a role"),
  requestedDepartment: z.string().min(1, "Please select a department"),
  companyName: z.string().optional(),
  dataConsent: z.literal(true, {
    errorMap: () => ({ message: "You must agree to data sharing to continue" }),
  }),
});

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState("");
  const [requestedDepartment, setRequestedDepartment] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [dataConsent, setDataConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signupComplete, setSignupComplete] = useState(false);

  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  const showCompanyField = requestedRole === "subcontractor" || requestedRole === "vendor";

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      signupSchema.parse({ 
        fullName, 
        email, 
        password, 
        requestedRole,
        requestedDepartment,
        companyName: showCompanyField ? companyName : undefined,
        dataConsent 
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
      } else {
        // Update profile with requested role, department, and company name
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await supabase
            .from("profiles")
            .update({
              requested_role: requestedRole,
              requested_department: requestedDepartment,
              company_name: showCompanyField ? companyName : null,
            })
            .eq("id", newUser.id);

          // Send admin notification with full details (fire and forget)
          supabase.functions.invoke("notify-new-signup", {
            body: {
              user_id: newUser.id,
              email: email,
              full_name: fullName,
              requested_role: requestedRole,
              requested_department: requestedDepartment,
            },
          }).catch(console.error);
        }

        // Sign out so they can't access anything until approved
        await supabase.auth.signOut();
        
        // Show success state
        setSignupComplete(true);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state after signup
  if (signupComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />
        
        <main className="relative z-10 flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="glass-card rounded-2xl p-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Account Created Successfully!
              </h1>
              <p className="text-muted-foreground mb-8">
                Your account is pending admin approval.
              </p>
              
              <div className="space-y-4 text-left mb-8">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
                  <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Pending Review</p>
                    <p className="text-xs text-muted-foreground">
                      An administrator will review your request shortly. This typically takes 1-2 business days.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
                  <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Email Notification</p>
                    <p className="text-xs text-muted-foreground">
                      Once approved, you'll receive an email at <span className="font-medium text-foreground">{email}</span> with a link to sign in.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                Go to Sign In
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />

      {/* Header */}
      <header className="relative z-10 p-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </header>

      {/* Signup Form */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground">
              Sign up to access the TSM Roofing Hub
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@tsmroofing.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={
                      errors.password ? "border-destructive pr-10" : "pr-10"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Department Request */}
              <div className="space-y-2">
                <Label htmlFor="requestedDepartment">Department</Label>
                <Select value={requestedDepartment} onValueChange={setRequestedDepartment}>
                  <SelectTrigger className={errors.requestedDepartment ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.requestedDepartment && (
                  <p className="text-sm text-destructive">{errors.requestedDepartment}</p>
                )}
              </div>

              {/* Role Request */}
              <div className="space-y-2">
                <Label htmlFor="requestedRole">Role Request</Label>
                <Select value={requestedRole} onValueChange={setRequestedRole}>
                  <SelectTrigger className={errors.requestedRole ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.requestedRole && (
                  <p className="text-sm text-destructive">{errors.requestedRole}</p>
                )}
              </div>

              {/* Company Name - shown for subcontractors/vendors */}
              {showCompanyField && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Your company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={errors.companyName ? "border-destructive" : ""}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">{errors.companyName}</p>
                  )}
                </div>
              )}

              {/* Data Consent Checkbox */}
              <div className="space-y-2">
                <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-secondary/30">
                  <Checkbox
                    id="dataConsent"
                    checked={dataConsent}
                    onCheckedChange={(checked) =>
                      setDataConsent(checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="dataConsent"
                      className="text-sm font-medium leading-tight cursor-pointer"
                    >
                      I consent to data sharing within TSM Roofing Hub
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      I understand that my contact information (email and phone number)
                      may be visible to other approved TSM Roofing Hub users to
                      facilitate internal communication. My data will not be shared
                      outside of the Hub's approved users.
                    </p>
                  </div>
                </div>
                {errors.dataConsent && (
                  <p className="text-sm text-destructive">{errors.dataConsent}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="neon"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/auth")}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}