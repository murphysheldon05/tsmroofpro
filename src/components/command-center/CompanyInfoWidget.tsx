import { Building2, Phone, Mail, AlertTriangle } from "lucide-react";

const companyInfo = {
  name: "TSM Roofing LLC",
  phone: "(469) 402-3535",
  email: "info@tsmroofing.com",
  emergencyContact: "Production Manager",
};

export function CompanyInfoWidget() {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-semibold text-foreground">{companyInfo.name}</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <a 
          href={`tel:${companyInfo.phone}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Phone className="w-4 h-4 flex-shrink-0" />
          <span>{companyInfo.phone}</span>
        </a>
        
        <a 
          href={`mailto:${companyInfo.email}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span>{companyInfo.email}</span>
        </a>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <span>Emergency: {companyInfo.emergencyContact}</span>
        </div>
      </div>
    </div>
  );
}
