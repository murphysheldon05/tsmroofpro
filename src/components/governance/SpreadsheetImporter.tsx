import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { useUpsertApplications } from "@/hooks/useApplications";
import { useUpsertAppAssignments } from "@/hooks/useAppAssignments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ParsedData {
  applications: any[];
  assignments: any[];
  errors: string[];
}

interface SpreadsheetImporterProps {
  onComplete: () => void;
}

export function SpreadsheetImporter({ onComplete }: SpreadsheetImporterProps) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const upsertApps = useUpsertApplications();
  const upsertAssignments = useUpsertAppAssignments();

  const { data: existingApps } = useQuery({
    queryKey: ["applications-for-import"],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("id, app_name");
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-for-import"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      return data || [];
    },
  });

  const categoryMap: Record<string, string> = {
    crm: "crm",
    accounting: "accounting",
    comms: "communications",
    communications: "communications",
    suppliers: "suppliers",
    financing: "financing",
    training: "training",
    marketing: "marketing",
    storage: "storage",
    social: "social",
    productivity: "productivity",
    other: "other",
  };

  const roleMap: Record<string, string> = {
    businessowner: "business_owner",
    "business owner": "business_owner",
    systemadmin: "system_admin",
    "system admin": "system_admin",
    onboardingowner: "onboarding_owner",
    "onboarding owner": "onboarding_owner",
    accessmonitor: "access_monitor",
    "access monitor": "access_monitor",
    ittriageowner: "it_triage_owner",
    "it triage owner": "it_triage_owner",
    operator: "operator",
    profileowner: "profile_owner",
    "profile owner": "profile_owner",
    externalvendor: "external_vendor",
    "external vendor": "external_vendor",
  };

  const permissionMap: Record<string, string> = {
    toptieradmin: "top_tier_admin",
    "top tier admin": "top_tier_admin",
    admin: "admin",
    standarduser: "standard_user",
    "standard user": "standard_user",
    limiteduser: "limited_user",
    "limited user": "limited_user",
    none: "none",
  };

  const parseSpreadsheet = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        const errors: string[] = [];
        const applications: any[] = [];
        const assignments: any[] = [];

        // Try to find Applications sheet
        const appSheetNames = ["Applications", "Apps", "Application"];
        const appSheet = appSheetNames.find((name) => workbook.SheetNames.includes(name));
        
        if (appSheet) {
          const appData = XLSX.utils.sheet_to_json(workbook.Sheets[appSheet]);
          appData.forEach((row: any, idx: number) => {
            const appName = row.app_name || row["App Name"] || row.name || row.Name;
            if (!appName) {
              errors.push(`Row ${idx + 2} in Applications: Missing app name`);
              return;
            }

            const categoryRaw = (row.category || row.Category || "other").toLowerCase();
            const category = categoryMap[categoryRaw] || "other";

            applications.push({
              app_name: appName,
              category,
              source_of_truth: row.source_of_truth || row["Source of Truth"] || "",
              description: row.description || row.Description || "",
              vendor_contact: row.vendor_contact || row["Vendor Contact"] || "",
              notes: row.notes || row.Notes || "",
              status: (row.status || row.Status || "active").toLowerCase() === "archived" ? "archived" : "active",
            });
          });
        }

        // Try to find Assignments sheet
        const assignmentSheetNames = ["Assignments", "App_Assignments", "AppAssignments"];
        const assignmentSheet = assignmentSheetNames.find((name) => workbook.SheetNames.includes(name));
        
        if (assignmentSheet) {
          const assignmentData = XLSX.utils.sheet_to_json(workbook.Sheets[assignmentSheet]);
          assignmentData.forEach((row: any, idx: number) => {
            const employeeName = row.employee_name || row["Employee Name"] || row.employee || row.Employee;
            const appName = row.app_name || row["App Name"] || row.app || row.App;
            
            if (!employeeName || !appName) {
              errors.push(`Row ${idx + 2} in Assignments: Missing employee or app name`);
              return;
            }

            // Find employee ID by name or email
            const employee = employees?.find(
              (e) =>
                e.full_name?.toLowerCase() === employeeName.toLowerCase() ||
                e.email?.toLowerCase() === employeeName.toLowerCase()
            );
            
            if (!employee) {
              errors.push(`Row ${idx + 2}: Employee "${employeeName}" not found in system`);
              return;
            }

            // Find app ID by name (check existing and parsed)
            let appId = existingApps?.find(
              (a) => a.app_name.toLowerCase() === appName.toLowerCase()
            )?.id;
            
            // If not found, it might be in parsed applications - we'll resolve after import
            const needsAppLookup = !appId;

            const roleRaw = (row.assignment_role || row.role || row.Role || "operator").toLowerCase();
            const role = roleMap[roleRaw] || "operator";

            const permRaw = (row.permission_level || row.permission || row.Permission || "standard_user").toLowerCase();
            const permission = permissionMap[permRaw] || "standard_user";

            const isPrimary = 
              row.primary === true || 
              row.primary === "true" || 
              row.primary === "yes" || 
              row.primary === "Yes" ||
              row.is_primary === true;

            assignments.push({
              employee_id: employee.id,
              app_name: appName, // We'll resolve to app_id during import
              _needs_app_lookup: needsAppLookup,
              assignment_role: role,
              permission_level: permission,
              is_primary: isPrimary,
              scope_notes: row.scope_notes || row["Scope Notes"] || "",
            });
          });
        }

        if (applications.length === 0 && assignments.length === 0) {
          errors.push("No data found. Make sure your spreadsheet has sheets named 'Applications' or 'Assignments'");
        }

        setParsedData({ applications, assignments, errors });
      } catch (err) {
        toast.error("Failed to parse spreadsheet");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [existingApps, employees]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        parseSpreadsheet(file);
      }
    },
    [parseSpreadsheet]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!parsedData) return;

    setImporting(true);
    setProgress(0);

    try {
      // Step 1: Import applications
      if (parsedData.applications.length > 0) {
        setProgress(20);
        await upsertApps.mutateAsync(parsedData.applications);
      }

      setProgress(50);

      // Step 2: Refresh app list to get IDs
      const { data: updatedApps } = await supabase.from("applications").select("id, app_name");
      
      // Step 3: Map assignments to use app_id instead of app_name
      if (parsedData.assignments.length > 0) {
        const mappedAssignments = parsedData.assignments
          .map((a) => {
            const app = updatedApps?.find(
              (app) => app.app_name.toLowerCase() === a.app_name.toLowerCase()
            );
            if (!app) {
              console.warn(`App not found: ${a.app_name}`);
              return null;
            }
            const { app_name, _needs_app_lookup, ...rest } = a;
            return { ...rest, app_id: app.id };
          })
          .filter(Boolean);

        setProgress(75);
        
        if (mappedAssignments.length > 0) {
          await upsertAssignments.mutateAsync(mappedAssignments as any);
        }
      }

      setProgress(100);
      toast.success("Import completed successfully!");
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Import failed. Check console for details.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {!parsedData ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">
            {isDragActive ? "Drop the file here" : "Drag & drop a spreadsheet here"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Supports .xlsx, .xls, and .csv files
          </p>
          <Button variant="outline" className="mt-4">
            Or click to browse
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Preview
          </div>

          {parsedData.errors.length > 0 && (
            <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Warnings ({parsedData.errors.length}):</strong>
                <ul className="list-disc ml-4 mt-1 max-h-32 overflow-y-auto">
                  {parsedData.errors.map((error, i) => (
                    <li key={i} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Applications</CardTitle>
                <CardDescription>Will be upserted by app name</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-400">
                    {parsedData.applications.length} records
                  </Badge>
                  {parsedData.applications.length > 0 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                {parsedData.applications.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground max-h-24 overflow-y-auto">
                    {parsedData.applications.slice(0, 5).map((app, i) => (
                      <div key={i}>{app.app_name}</div>
                    ))}
                    {parsedData.applications.length > 5 && (
                      <div>...and {parsedData.applications.length - 5} more</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Assignments</CardTitle>
                <CardDescription>Will be matched or inserted</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
                    {parsedData.assignments.length} records
                  </Badge>
                  {parsedData.assignments.length > 0 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setParsedData(null)}
              disabled={importing}
            >
              Upload Different File
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                importing ||
                (parsedData.applications.length === 0 && parsedData.assignments.length === 0)
              }
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Data"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
