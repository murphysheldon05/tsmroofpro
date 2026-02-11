import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Info, CheckCircle, AlertTriangle, XCircle, Clock, ExternalLink, Ruler, Eye, Camera, FileText, MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  currentLaminates,
  current3Tabs,
  discontinuedLaminates,
  discontinued3Tabs,
  designerShingles,
  timelineEvents,
  manufacturerCards,
} from "@/lib/shingleData";

function StatusBadge({ status }: { status: string }) {
  if (status === "Discontinued") return <Badge variant="destructive">{status}</Badge>;
  if (status === "Do Not Mix") return <Badge variant="outline" className="border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400">{status}</Badge>;
  if (status === "Not Compatible") return <Badge variant="outline" className="border-orange-400 bg-orange-400/10 text-orange-700 dark:text-orange-400">{status}</Badge>;
  if (status === "Current") return <Badge variant="outline" className="border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

// ── Tab 1: Why This Matters ──
function OverviewTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Shingle Identification: The Foundation of Insurance Supplements</CardTitle>
          <CardDescription>
            Identifying discontinued shingles is one of the most valuable skills in roofing insurance work.
            When a roof has discontinued shingles that cannot be matched, the entire roof slope (or the full roof)
            may need replacement instead of just a repair. This significantly impacts the scope of the insurance claim.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: AlertTriangle, text: "All 5-inch exposure laminates are discontinued — this was the old standard size", color: "text-amber-500" },
          { icon: XCircle, text: "Elk was acquired by GAF in 2007 — ALL Elk shingles are discontinued", color: "text-destructive" },
          { icon: Ruler, text: "Measurements are your first tool: Width, Exposure, and Height", color: "text-primary" },
          { icon: MessageSquare, text: "Always ask the homeowner when their roof was installed", color: "text-primary" },
          { icon: Eye, text: "The cellophane print on the back often contains key identification data", color: "text-primary" },
        ].map((item, i) => (
          <Card key={i} className="border-l-4 border-l-primary/50">
            <CardContent className="p-4 flex items-start gap-3">
              <item.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${item.color}`} />
              <p className="text-sm">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Training Resources</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://youtu.be/QwPFFzyUmwE"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Watch: Overview of shingle changes over 20+ years (John Senac)
          </a>
          <a
            href="https://app.companycam.com/report/e5b660f9-42c8-423b-8f96-a5a12c544858"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline text-sm"
          >
            <Camera className="w-4 h-4" /> CompanyCam: Photo reference of current laminates and 3-tabs
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 2: Current Shingles ──
function CurrentShinglesTab() {
  const [search, setSearch] = useState("");
  const filteredLaminates = useMemo(() =>
    currentLaminates.filter(s => `${s.manufacturer} ${s.series}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const filtered3Tabs = useMemo(() =>
    current3Tabs.filter(s => `${s.manufacturer} ${s.series}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-primary/50">
        <CardContent className="p-3">
          <p className="text-sm font-medium"><Info className="w-4 h-4 inline mr-1 text-primary" />CertainTeed Landmark is the ONLY laminate under 39 inches that is currently available (38 3/4 inches wide).</p>
        </CardContent>
      </Card>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by manufacturer or series…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Standard Laminates</h3>
        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-muted z-10 min-w-[120px]">Manufacturer</TableHead>
                <TableHead className="min-w-[140px]">Series</TableHead>
                <TableHead>Width</TableHead>
                <TableHead>Height</TableHead>
                <TableHead>Exposure</TableHead>
                <TableHead>Tooth Style</TableHead>
                <TableHead>Shadow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLaminates.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">{s.manufacturer}</TableCell>
                  <TableCell>{s.series}</TableCell>
                  <TableCell>{s.width}</TableCell>
                  <TableCell>{s.height}</TableCell>
                  <TableCell>{s.exposure}</TableCell>
                  <TableCell>{s.toothStyle}</TableCell>
                  <TableCell>{s.shadow}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">3-Tab Shingles</h3>
        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-muted z-10 min-w-[120px]">Manufacturer</TableHead>
                <TableHead className="min-w-[120px]">Series</TableHead>
                <TableHead>Width</TableHead>
                <TableHead>Height</TableHead>
                <TableHead>Exposure</TableHead>
                <TableHead>Sealant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered3Tabs.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">{s.manufacturer}</TableCell>
                  <TableCell>{s.series}</TableCell>
                  <TableCell>{s.width}</TableCell>
                  <TableCell>{s.height}</TableCell>
                  <TableCell>{s.exposure}</TableCell>
                  <TableCell>{s.sealant}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Discontinued Shingles ──
function DiscontinuedTab() {
  const [search, setSearch] = useState("");
  const filterFn = (s: { manufacturer: string; series: string }) =>
    `${s.manufacturer} ${s.series}`.toLowerCase().includes(search.toLowerCase());

  const filteredLam = useMemo(() => discontinuedLaminates.filter(filterFn), [search]);
  const filtered3T = useMemo(() => discontinued3Tabs.filter(filterFn), [search]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by manufacturer or series…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Accordion type="multiple" defaultValue={["tips"]}>
        <AccordionItem value="tips">
          <AccordionTrigger>Identification Tips</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>All 5-inch exposure laminates are discontinued as the old standard size</li>
              <li>CertainTeed Landmark is the only laminate under 39 inches that is current (38 3/4 wide)</li>
              <li>The 39 3/8 inch shingles are the toughest — you'll need markings and ideally the year installed</li>
              <li><strong>3-tab notes:</strong> Classic will have "Do Not Remove" but NOT "no quitar". Sentinel likely has no print. CertainTeed will have logo or "the roofing collection". Tamko will have "Tamko" and/or plant name.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div>
        <h3 className="text-lg font-semibold mb-3">Discontinued Laminates</h3>
        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-muted z-10 min-w-[120px]">Manufacturer</TableHead>
                <TableHead className="min-w-[150px]">Series</TableHead>
                <TableHead>Width</TableHead>
                <TableHead>Exposure</TableHead>
                <TableHead>Height</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLam.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">{s.manufacturer}</TableCell>
                  <TableCell>{s.series}</TableCell>
                  <TableCell>{s.width}</TableCell>
                  <TableCell>{s.exposure}</TableCell>
                  <TableCell>{s.height}</TableCell>
                  <TableCell>{s.date}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Discontinued 3-Tabs</h3>
        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-muted z-10 min-w-[120px]">Manufacturer</TableHead>
                <TableHead className="min-w-[150px]">Series</TableHead>
                <TableHead>Width</TableHead>
                <TableHead>Exposure</TableHead>
                <TableHead>Height</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered3T.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">{s.manufacturer}</TableCell>
                  <TableCell>{s.series}</TableCell>
                  <TableCell>{s.width}</TableCell>
                  <TableCell>{s.exposure}</TableCell>
                  <TableCell>{s.height}</TableCell>
                  <TableCell>{s.date}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Designer Shingles ──
function DesignerTab() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    designerShingles.filter(s => `${s.manufacturer} ${s.brand}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search designer shingles…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-muted z-10 min-w-[120px]">Manufacturer</TableHead>
              <TableHead className="min-w-[140px]">Brand/Line</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Width</TableHead>
              <TableHead>Height</TableHead>
              <TableHead>Exposure</TableHead>
              <TableHead>Tabs</TableHead>
              <TableHead>Look</TableHead>
              <TableHead className="min-w-[140px]">Similar Product</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="sticky left-0 bg-background z-10 font-medium">{s.manufacturer}</TableCell>
                <TableCell>{s.brand}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell>{s.width}</TableCell>
                <TableCell>{s.height}</TableCell>
                <TableCell>{s.exposure}</TableCell>
                <TableCell>{s.tabs}</TableCell>
                <TableCell>{s.look}</TableCell>
                <TableCell>{s.similarProduct}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Tab 5: Key Dates & Manufacturer History ──
function TimelineTab() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Major Manufacturer Events</h3>
        <div className="relative border-l-2 border-primary/30 ml-4 space-y-4">
          {timelineEvents.map((e, i) => (
            <div key={i} className="relative pl-6">
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-primary/80 border-2 border-background" />
              <p className="text-sm"><span className="font-bold text-primary">{e.year}</span> — {e.event}</p>
            </div>
          ))}
        </div>
      </div>

      <Accordion type="multiple">
        {manufacturerCards.map((card, i) => (
          <AccordionItem key={i} value={card.name}>
            <AccordionTrigger className="text-base font-semibold">{card.name}</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-5 space-y-1.5 text-sm">
                {card.details.map((d, j) => <li key={j}>{d}</li>)}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ── Tab 6: Field Inspection Guide ──
function FieldGuideTab() {
  const steps = [
    { title: "ASK THE HOMEOWNER", icon: MessageSquare, content: "\"When was your roof installed?\" — This single question narrows identification significantly." },
    { title: "MEASURE THE SHINGLE", icon: Ruler, content: "Width: widest measurement left to right of a full shingle. Exposure: amount of shingle visible per row. Height: total measurement bottom edge to top edge.\n\nKey rule: 5\" exposure = discontinued (old standard)." },
    { title: "CHECK THE BACK", icon: Eye, content: "Cellophane/plastic strip location and text. Print markings: manufacturer logos, plant codes, year codes. Sealant type: solid, dashed, or none.\n\nNote: different sticker on back does NOT automatically mean discontinued." },
    { title: "COMPARE TO REFERENCE", icon: FileText, content: "Match measurements against the Current and Discontinued tables in this app. If dimensions match a discontinued product, document with photos. Get multiple measurements from different areas of the roof." },
    { title: "DOCUMENT FOR THE CLAIM", icon: Camera, content: "Take clear CompanyCam photos of: full shingle, measurement tape alongside, back markings, cellophane print. Include shingle in the supplement documentation. Reference the specific discontinued product name and discontinuation date." },
  ];

  return (
    <div className="space-y-4 max-w-3xl">
      {steps.map((step, i) => (
        <Card key={i} className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                {i + 1}
              </div>
              <step.icon className="w-5 h-5 text-primary flex-shrink-0" />
              <h4 className="font-semibold text-sm">STEP {i + 1}: {step.title}</h4>
            </div>
            <p className="text-sm whitespace-pre-line ml-11">{step.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ──
export default function ShingleIdentification() {
  const isMobile = useIsMobile();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Ruler className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Shingle Identification Guide</h1>
              <p className="text-muted-foreground text-sm">Product knowledge for insurance supplement claims</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue={isMobile ? "field-guide" : "overview"} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 pb-1" style={{ touchAction: "pan-x pan-y" }}>
            <TabsList className="w-max">
              <TabsTrigger value="overview">Why This Matters</TabsTrigger>
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="discontinued">Discontinued</TabsTrigger>
              <TabsTrigger value="designer">Designer</TabsTrigger>
              <TabsTrigger value="timeline">Key Dates</TabsTrigger>
              <TabsTrigger value="field-guide">Field Guide</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="current"><CurrentShinglesTab /></TabsContent>
          <TabsContent value="discontinued"><DiscontinuedTab /></TabsContent>
          <TabsContent value="designer"><DesignerTab /></TabsContent>
          <TabsContent value="timeline"><TimelineTab /></TabsContent>
          <TabsContent value="field-guide"><FieldGuideTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
