import { AppLayout } from "@/components/layout/AppLayout";
import { Building2, Heart, Target, Users, CheckCircle, FileText, ExternalLink, Loader2 } from "lucide-react";
import { usePolicies } from "@/hooks/usePolicies";

const coreValues = [
  {
    title: "Genuinely Authentic",
    description: "We are real, honest, and transparent in all our interactions.",
  },
  {
    title: "Do the Right Thing",
    description: "Integrity guides every decision we make, even when no one is watching.",
  },
  {
    title: "Never Stop Building",
    description: "We continuously improve ourselves, our processes, and our company.",
  },
  {
    title: "Reliable Reputation",
    description: "We deliver on our promises and build trust through consistent excellence.",
  },
];

const contacts = [
  { role: "Sales Questions", contact: "Sales Manager" },
  { role: "Production Issues", contact: "Production Manager" },
  { role: "Supplement Help", contact: "Supplements Team Lead" },
  { role: "IT / Systems", contact: "Office Admin" },
  { role: "HR / Benefits", contact: "HR Manager" },
  { role: "Accounting / Payroll", contact: "Accounting Manager" },
];

export default function Company() {
  const { data: policies, isLoading: policiesLoading } = usePolicies();

  const handlePolicyClick = (policy: { url: string | null }) => {
    if (policy.url) {
      window.open(policy.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Company Information</h1>
              <p className="text-muted-foreground text-sm">
                Our values, mission, and organizational structure
              </p>
            </div>
          </div>
        </header>

        {/* Core Focus */}
        <section className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            Core Focus
          </span>
          <h2 className="text-4xl font-bold text-foreground mt-2 gradient-text">
            Simplify Roofing
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            We make roofing simple for homeowners and contractors alike. From the first 
            inspection to the final walkthrough, we streamline every step of the process.
          </p>
        </section>

        {/* Core Values */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {coreValues.map((value, index) => (
              <div
                key={value.title}
                className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{value.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{value.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Who to Contact */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Who to Contact</h2>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    For
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((item, index) => (
                  <tr
                    key={item.role}
                    className={index < contacts.length - 1 ? "border-b border-border/30" : ""}
                  >
                    <td className="px-6 py-4 text-foreground">{item.role}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Policies */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Policies</h2>
          </div>
          {policiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : policies && policies.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map((policy) => (
                <button
                  key={policy.id}
                  onClick={() => handlePolicyClick(policy)}
                  className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all text-left group"
                  disabled={!policy.url}
                >
                  <div className="flex items-start justify-between gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                    {policy.url && (
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors mt-2">
                    {policy.title}
                  </p>
                  {policy.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {policy.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No policies have been added yet.</p>
              <p className="text-sm">Admins can add policies from the Admin Panel.</p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
