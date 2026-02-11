// ── Current Standard Laminates ──
export interface CurrentLaminate {
  manufacturer: string;
  series: string;
  width: string;
  height: string;
  exposure: string;
  toothStyle: string;
  shadow: string;
}

export const currentLaminates: CurrentLaminate[] = [
  { manufacturer: "Atlas", series: "StormMaster", width: '42"', height: '14"', exposure: '6"', toothStyle: "Tapered", shadow: "Bold" },
  { manufacturer: "Atlas", series: "Pinnacle", width: '42"', height: '14"', exposure: '6"', toothStyle: "Tapered", shadow: "Bold" },
  { manufacturer: "Atlas", series: "Briarwood", width: '42"', height: '14"', exposure: '6"', toothStyle: "Tapered", shadow: "Bold" },
  { manufacturer: "Atlas", series: "Castlebrook", width: '42"', height: '14"', exposure: '6"', toothStyle: "Tapered", shadow: "Bold/Med" },
  { manufacturer: "Atlas", series: "ProLam", width: '42"', height: '14"', exposure: '6"', toothStyle: "Tapered", shadow: "Bold" },
  { manufacturer: "BP", series: "Laminates", width: '42"', height: '14"', exposure: '6"', toothStyle: "Tapered", shadow: "Medium" },
  { manufacturer: "CertainTeed", series: "Landmark Series", width: '38 3/4"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Medium" },
  { manufacturer: "CRC (IKO)", series: "Biltmore", width: '40 7/8"', height: '13 3/4"', exposure: '5 7/8"', toothStyle: "Straight", shadow: "Bold/Med" },
  { manufacturer: "GAF", series: "American Harvest", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "None" },
  { manufacturer: "GAF", series: "Timberline HD/HDZ", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Blended" },
  { manufacturer: "GAF", series: "Natural Shadow", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Blended" },
  { manufacturer: "IKO", series: "Cambridge", width: '40 7/8"', height: '13 3/4"', exposure: '5 7/8"', toothStyle: "Straight", shadow: "Medium" },
  { manufacturer: "IKO", series: "Dynasty", width: '40 7/8"', height: '13 3/4"', exposure: '5 7/8"', toothStyle: "Straight", shadow: "Medium" },
  { manufacturer: "Malarkey", series: "Highlander", width: '39"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Medium" },
  { manufacturer: "Malarkey", series: "Vista", width: '39"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Medium" },
  { manufacturer: "Malarkey", series: "Legacy", width: '40"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Medium" },
  { manufacturer: "Owens Corning", series: "Oakridge AR", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Medium" },
  { manufacturer: "Owens Corning", series: "Duration TruDef", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Medium" },
  { manufacturer: "Pabco", series: "Premier", width: '40"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Narrowed", shadow: "Bold" },
  { manufacturer: "Pabco", series: "Prestige", width: '40"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Narrowed", shadow: "Bold" },
  { manufacturer: "Pabco", series: "Radiance", width: '40"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Narrowed", shadow: "Bold" },
  { manufacturer: "Tamko", series: "Heritage", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Bold/Med" },
  { manufacturer: "Tamko", series: "Heritage Prolines", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "Tapered", shadow: "Bold/Med" },
  { manufacturer: "Tamko", series: "Woodgate", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', toothStyle: "LG Tapered", shadow: "Bold/Med" },
];

// ── Current 3-Tab Shingles ──
export interface Current3Tab {
  manufacturer: string;
  series: string;
  width: string;
  height: string;
  exposure: string;
  sealant: string;
}

export const current3Tabs: Current3Tab[] = [
  { manufacturer: "Atlas", series: "Glass Master", width: '36"', height: '12"', exposure: '5"', sealant: "Solid" },
  { manufacturer: "BP", series: "Yukon/Dakota", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', sealant: "—" },
  { manufacturer: "CertainTeed", series: "XT 25 AR", width: '36"', height: '12"', exposure: '5"', sealant: "Dashed" },
  { manufacturer: "GAF", series: "Royal Sovereign", width: '36"', height: '12"', exposure: '5"', sealant: "Dashed" },
  { manufacturer: "IKO", series: "Marathon AR", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', sealant: "Dashed" },
  { manufacturer: "Malarkey", series: "Dura-Seal", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', sealant: "Dashed" },
  { manufacturer: "Owens Corning", series: "Supreme", width: '36"', height: '12"', exposure: '5"', sealant: "Solid" },
  { manufacturer: "Pabco", series: "Tahoma", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', sealant: "—" },
  { manufacturer: "Tamko", series: "Elite Glass Seal", width: '36"', height: '12"', exposure: '5"', sealant: "—" },
];

// ── Discontinued Laminates ──
export interface DiscontinuedShingle {
  width: string;
  exposure: string;
  height: string;
  manufacturer: string;
  series: string;
  date: string;
  status: "Discontinued" | "Do Not Mix" | "Not Compatible";
}

export const discontinuedLaminates: DiscontinuedShingle[] = [
  { width: '36"', exposure: '5"', height: '12"', manufacturer: "CertainTeed", series: "Landmark 25 or 30", date: "2005", status: "Discontinued" },
  { width: '36"', exposure: '5"', height: '12"', manufacturer: "Atlas", series: "Stratford", date: "—", status: "Discontinued" },
  { width: '36 1/2"', exposure: '5"', height: '12"', manufacturer: "Tamko", series: "Heritage 25 or 30", date: "2012", status: "Discontinued" },
  { width: '37"', exposure: '5"', height: '12"', manufacturer: "GAF", series: "Timberline Shadow", date: "2001", status: "Discontinued" },
  { width: '38 1/4"', exposure: '5 5/8"', height: '13 1/8"', manufacturer: "Atlas", series: "Pinnacle/StormMaster", date: "2013", status: "Do Not Mix" },
  { width: '38 3/4"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "Tamko", series: "Heritage (Dallas/Joplin)", date: "2016", status: "Do Not Mix" },
  { width: '38 3/4"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "Owens Corning", series: "Oakridge Pro 25/30", date: "2008", status: "Not Compatible" },
  { width: '38 3/4"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "Elk", series: "Raised Profile/Prestique", date: "2007", status: "Discontinued" },
  { width: '38 5/8"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "Atlas", series: "Castlebrook", date: "2013", status: "Do Not Mix" },
  { width: '39 3/8"', exposure: '6"', height: '14"', manufacturer: "Atlas", series: "Pinnacle/StormMaster", date: "2017", status: "Do Not Mix" },
  { width: '39 3/8"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "Owens Corning", series: "Oakridge Pro 40/50", date: "2008", status: "Not Compatible" },
  { width: '39 3/8"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "Owens Corning", series: "Duration (non TruDef)", date: "2010", status: "Do Not Mix" },
  { width: '39 3/8"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "Elk", series: "Prestique I or Plus", date: "2007", status: "Discontinued" },
  { width: '39 3/8"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "GAF", series: "Timberline 30", date: "2007", status: "Do Not Mix" },
  { width: '39 3/8"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "GAF", series: "Natural Shadow 30", date: "2007", status: "Do Not Mix" },
];

export const discontinued3Tabs: DiscontinuedShingle[] = [
  { width: '36"', exposure: '5"', height: '12"', manufacturer: "CertainTeed", series: "XT 30 (30 year)", date: "—", status: "Discontinued" },
  { width: '36"', exposure: '5"', height: '12"', manufacturer: "Owens Corning", series: "Classic (20 year)", date: "2015", status: "Discontinued" },
  { width: '36"', exposure: '5"', height: '12"', manufacturer: "Tamko", series: "Glass Seal (20 year)", date: "—", status: "Discontinued" },
  { width: '36"', exposure: '5"', height: '12"', manufacturer: "GAF", series: "Sentinel (20 year)", date: "2017", status: "Discontinued" },
  { width: '36"', exposure: '5"', height: '12"', manufacturer: "Owens Corning", series: "Supreme Deep Shadow", date: "—", status: "Discontinued" },
  { width: '36"', exposure: '5"', height: '12"', manufacturer: "Tamko", series: "Glass Seal Elite", date: "—", status: "Do Not Mix" },
  { width: '39 3/8"', exposure: '5 5/8"', height: '13 1/4"', manufacturer: "CertainTeed", series: "XT 25 Metric AR", date: "2017", status: "Discontinued" },
];

// ── Designer Shingles ──
export interface DesignerShingle {
  manufacturer: string;
  brand: string;
  status: "Current" | "Discontinued";
  width: string;
  height: string;
  exposure: string;
  tabs: string;
  look: string;
  similarProduct: string;
}

export const designerShingles: DesignerShingle[] = [
  { manufacturer: "GAF", brand: "Grand Sequoia", status: "Current", width: '42"', height: '16"', exposure: '8"', tabs: "2", look: "Shake", similarProduct: "—" },
  { manufacturer: "GAF", brand: "Grand Canyon", status: "Current", width: '36"', height: '17 3/8"', exposure: '8"', tabs: "Multi", look: "Wood Shake", similarProduct: "—" },
  { manufacturer: "GAF", brand: "Camelot II", status: "Current", width: '36"', height: '14 1/2"', exposure: '5 5/8"', tabs: "2", look: "Slate", similarProduct: "—" },
  { manufacturer: "GAF", brand: "Camelot", status: "Discontinued", width: '36"', height: '14 1/2"', exposure: '5 5/8"', tabs: "2", look: "Slate", similarProduct: "Camelot II" },
  { manufacturer: "GAF", brand: "Slateline", status: "Current", width: '36"', height: '12"', exposure: '5"', tabs: "1", look: "Slate", similarProduct: "—" },
  { manufacturer: "Owens Corning", brand: "Woodcrest", status: "Current", width: '36"', height: '15 1/4"', exposure: '6 1/2"', tabs: "Multi", look: "Wood Shake", similarProduct: "—" },
  { manufacturer: "Owens Corning", brand: "Woodmoor", status: "Current", width: '36"', height: '17 1/4"', exposure: '8"', tabs: "Multi", look: "Wood Shake", similarProduct: "—" },
  { manufacturer: "Owens Corning", brand: "Berkshire", status: "Current", width: '36"', height: '15 1/4"', exposure: '6 1/2"', tabs: "2", look: "Slate", similarProduct: "—" },
  { manufacturer: "Owens Corning", brand: "Devonshire", status: "Discontinued", width: '40"', height: '18"', exposure: '9"', tabs: "Multi", look: "Slate", similarProduct: "Berkshire" },
  { manufacturer: "CertainTeed", brand: "Grand Manor", status: "Current", width: '36"', height: '16"', exposure: '7"', tabs: "Multi", look: "Slate", similarProduct: "—" },
  { manufacturer: "CertainTeed", brand: "Presidential Shake", status: "Current", width: '36"', height: '18"', exposure: '8"', tabs: "Multi", look: "Wood Shake", similarProduct: "—" },
  { manufacturer: "CertainTeed", brand: "Belmont", status: "Current", width: '36"', height: '12"', exposure: '5"', tabs: "1", look: "Luxury", similarProduct: "—" },
  { manufacturer: "IKO", brand: "Royal Estate", status: "Current", width: '41 3/4"', height: '15 7/8"', exposure: '6 1/2"', tabs: "2", look: "Slate", similarProduct: "—" },
  { manufacturer: "IKO", brand: "Crowne Slate", status: "Current", width: '41 3/4"', height: '15 7/8"', exposure: '6 1/2"', tabs: "2", look: "Slate", similarProduct: "—" },
  { manufacturer: "Atlas", brand: "StormMaster Shake", status: "Current", width: '42"', height: '16"', exposure: '8"', tabs: "Multi", look: "Shake", similarProduct: "—" },
  { manufacturer: "Tamko", brand: "Heritage Woodgate", status: "Current", width: '39 3/8"', height: '13 1/4"', exposure: '5 5/8"', tabs: "LG", look: "Premium", similarProduct: "—" },
  { manufacturer: "Elk", brand: "Capstone", status: "Discontinued", width: '41 3/4"', height: '15 7/8"', exposure: '6 1/2"', tabs: "2", look: "Slate", similarProduct: "IKO Royal Estate" },
  { manufacturer: "Elk", brand: "Domain Winslow", status: "Discontinued", width: '36"', height: '18"', exposure: '8"', tabs: "Multi", look: "Shake/Slate", similarProduct: "Presidential" },
];

// ── Timeline Events ──
export interface TimelineEvent {
  year: string;
  event: string;
}

export const timelineEvents: TimelineEvent[] = [
  { year: "1994", event: "GP discontinued" },
  { year: "1998", event: "GS (General Shingle) discontinued" },
  { year: "2000", event: "Celotex discontinued" },
  { year: "2003–2011", event: "CertainTeed plants changed Landmark production" },
  { year: "2005", event: "CertainTeed Landmark 25/30 discontinued (moved to 38 3/4\")" },
  { year: "2007", event: "Elk acquired by GAF — ALL Elk products discontinued. Full \"Do Not Mix\" applied." },
  { year: "2008", event: "Owens Corning Oakridge Pro changed to Oakridge AR. OC Prominence discontinued." },
  { year: "2010", event: "Owens Corning Duration changed to Duration TruDef. SureNail Guard was black plastic strip." },
  { year: "2011", event: "GAF announced 2010+ shingles are Lifetime warranty. OC WeatherGuard IR discontinued." },
  { year: "2012", event: "Tamko major metric change and overhaul" },
  { year: "2013", event: "Atlas Pinnacle/StormMaster changed size (38 1/4\" to 42\")" },
  { year: "2015", event: "Owens Corning Classic 3-tab discontinued" },
  { year: "2016", event: "Tamko Heritage (Dallas/Joplin plant) Do Not Mix" },
  { year: "2017", event: "GAF granule outsourcing changes. Sentinel 3-tab discontinued. Atlas most recent change." },
  { year: "2018", event: "GAF Sentinel fully discontinued" },
  { year: "2020", event: "Owens Corning Devonshire discontinued" },
];

// ── Manufacturer Quick Reference Cards ──
export interface ManufacturerCard {
  name: string;
  details: string[];
}

export const manufacturerCards: ManufacturerCard[] = [
  {
    name: "Elk (acquired by GAF 2007)",
    details: [
      "Elk purchased the RGM line (Chancellor)",
      "Raised Profile 30 year (like GAF Natural Shadow) = 38 3/4\"",
      "Prestique 30 year (like GAF Timberline) = 38 3/4\"",
      "Prestique I 40 year (like GAF Timberline 40) = 39 3/8\"",
      "Prestique Plus 50 year (granules on the back) = 39 3/8\"",
      "Print IDs: brown paper, blank, \"MYERSTOWN\", Texas outline with \"ENNIS\", or T1/T2/T3 or M1/M2/M3 with \"DO NOT REMOVE\" between codes",
      "Designer: Capstone (looks like IKO Royal Estate), Domain Winslow (like Presidential but straight)",
    ],
  },
  {
    name: "Owens Corning",
    details: [
      "Oakridge Pro → Oakridge AR change in 2008 (Pro 25/30 = 38 3/4\", Pro 40/50 = 39 3/8\")",
      "Duration → Duration TruDef in 2010 (black plastic SureNail strip = old)",
      "Cellophane print key: \"Do Not Remove xxx / No Quitar ## (## = year) / Do Not Remove xxx (letters = plant)\"",
      "Discontinued: Supreme Deep Shadow, Crestwood, Classic 3-tab (2015–2018), Prominence (2008), Devonshire (2020)",
    ],
  },
  {
    name: "GAF",
    details: [
      "Easily confused with Elk from the ground",
      "After going metric, GAF went to 39 3/8\"",
      "After Nov 2007 Elk buyout = full Do Not Mix on all pre-acquisition products",
      "All Timberline pre-2008 laminates are discontinued",
      "2008–2009 transition shingles may also be discontinued",
      "Current cellophane print: XX #### with dashed sealant",
      "2017 granule changes = useful for designers and 3-tabs",
    ],
  },
];
