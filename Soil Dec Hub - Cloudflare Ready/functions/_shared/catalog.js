export const defaultSubmitters = [
  {
    id: "chris",
    label: "Chris Knight",
    name: "Chris Knight",
    email: "chris.knight@earthlift.com.au",
    phone: "0404817643",
    active: true,
    sortOrder: 10,
  },
  {
    id: "alan",
    label: "Alan Fenner",
    name: "Alan Fenner",
    email: "alan.fenner@earthlift.com.au",
    phone: "0448517046",
    active: true,
    sortOrder: 20,
  },
];

export const defaultSites = [
  { id: "harkaway", name: "Harkaway", method: "Webform" },
  { id: "urm", name: "URM", method: "Webform" },
  { id: "landfix", name: "Landfix", method: "Webform" },
  { id: "daisys", name: "Daisy's", method: "Webform" },
  { id: "esg", name: "ESG", method: "Webform" },
  { id: "scope", name: "Scope", method: "Webform" },
  { id: "lte-monk", name: "LTE / Monk", method: "Google Form" },
  { id: "galcon", name: "Galcon", method: "Webform" },
  { id: "hanson", name: "Hanson / Heidelberg", method: "PDF email" },
  { id: "landformx", name: "LandformX", method: "PDF email" },
  { id: "antech", name: "Antech", method: "PDF email" },
].map((site, index) => ({
  ...site,
  enabled: true,
  senderStatus: "planned",
  loginUrl: "",
  notes: "",
  sortOrder: (index + 1) * 10,
}));

export const defaultSettings = {
  defaultSubmitter: "chris",
  emailAction: "send",
  esgSiteId: "85",
  lteDestination: "LTE Langwarrin - Soil",
};
