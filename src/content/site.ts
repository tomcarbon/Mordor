// Site-wide words: title, navigation, footer, meta, 404, global controls, Palantir palette.

export type RouteId =
  | "threshold"
  | "atlas"
  | "legions"
  | "chronicle"
  | "muster"
  | "road";

export type MetaKey = RouteId | "notFound";

export interface NavItem {
  id: RouteId;
  path: string;
  label: string;
}

export interface ErrorFallbackCopy {
  heading: string;
  line: string;
  returnLabel: string;
}

export interface SiteIdentity {
  title: string;
  subtitle: string;
  skipLink: string;
  /** Top-level error screen. */
  errorFallback: ErrorFallbackCopy;
}

export interface FooterCopy {
  /** In-character line. */
  decree: string;
  /** Out-of-character. Must always be displayed, plainly, and must not be restyled as lore. */
  fanNotice: string;
  /** Out-of-character. Plain statement of what the site stores. */
  privacyNote: string;
}

export interface RouteMeta {
  title: string;
  description: string;
}

export interface NotFoundCopy {
  code: string;
  title: string;
  lines: string[];
  returnLabel: string;
}

export interface AudioControlCopy {
  turnOnLabel: string;
  turnOffLabel: string;
  /** Short caption shown while sound is off, its default state. */
  offCaption: string;
  /** Short caption shown while sound is on. */
  onCaption: string;
}

export type PaletteCommandId =
  | "go-threshold"
  | "go-atlas"
  | "go-legions"
  | "go-chronicle"
  | "go-muster"
  | "go-road"
  | "toggle-ring"
  | "toggle-audio";

export interface PaletteCommand {
  id: PaletteCommandId;
  label: string;
  hint: string;
  /** Extra search terms. */
  keywords: string[];
}

export interface PaletteCopy {
  title: string;
  placeholder: string;
  ariaLabel: string;
  groupGo: string;
  groupActions: string;
  emptyState: string;
  openHint: string;
  selectHint: string;
  closeHint: string;
  commands: PaletteCommand[];
}

export const site: SiteIdentity = {
  title: "The Black Land",
  subtitle: "Official Portal of the Realm of Mordor",
  skipLink: "Proceed directly to the matter at hand",
  errorFallback: {
    heading: "A Fault in the Apparatus",
    line: "This page could not be produced. The Ministry denies it, and those responsible are being found.",
    returnLabel: "Return to the Threshold",
  },
};

export const nav: NavItem[] = [
  { id: "threshold", path: "/", label: "Threshold" },
  { id: "atlas", path: "/atlas", label: "Atlas" },
  { id: "legions", path: "/legions", label: "Legions" },
  { id: "chronicle", path: "/chronicle", label: "Chronicle" },
  { id: "muster", path: "/muster", label: "Muster Office" },
  { id: "road", path: "/road", label: "The Last Road" },
];

export const footer: FooterCopy = {
  decree:
    "Issued under the authority of the Tower. Any errors in this document are the reader's.",
  fanNotice:
    "A non-commercial fan work. Mordor and related names are from the works of J.R.R. Tolkien. Not affiliated with or endorsed by the Tolkien Estate, Middle-earth Enterprises or any film studio.",
  privacyNote:
    "This site collects nothing about you. Only the attention meter and the game's best run are stored, in your own browser. The name on a Writ of Service leaves the page only in the Writ you choose to download.",
};

export const meta: Record<MetaKey, RouteMeta> = {
  threshold: {
    title: "The Black Land | Official Portal of the Realm of Mordor",
    description:
      "The official portal of the Realm of Mordor. Proclamations, public notices and the current state of the Realm, issued by the ministries of the Black Land.",
  },
  atlas: {
    title: "Atlas of the Land | The Black Land",
    description:
      "The Bureau of Survey's map of Mordor, with dossiers on twelve places from Barad-dûr to the Sea of Núrnen. Accuracy is guaranteed. Safety is not.",
  },
  legions: {
    title: "The Legions | The Black Land",
    description:
      "Service dossiers on the forces, allies and hazards of the Black Land, assessed for strength, discipline, loyalty and dread by the Directorate of Forces.",
  },
  chronicle: {
    title: "The Chronicle | The Black Land",
    description:
      "The authorised history of the Second and Third Ages, compiled by the Ministry of Record. Every date is correct. The conclusions are compulsory.",
  },
  muster: {
    title: "The Muster Office | The Black Land",
    description:
      "Seven questions from the Office of Musters. Answer them and receive a Writ of Service naming your station in the Black Land.",
  },
  road: {
    title: "The Last Road | The Black Land",
    description:
      "A restricted exercise of the Watch. Carry the Ring from Cirith Ungol to Orodruin while the Eye sweeps the plain. The state does not recommend success.",
  },
  notFound: {
    title: "Unmapped | The Black Land",
    description: "The Bureau of Survey has no record of this place.",
  },
};

export const notFound: NotFoundCopy = {
  code: "404",
  title: "This place is not on the map",
  lines: [
    "The Bureau of Survey has no record of the road you have taken.",
    "There are two explanations. It never existed, or it has been corrected.",
    "In neither case will you be helped by looking for it.",
  ],
  returnLabel: "Return to the Threshold",
};

export const audioControl: AudioControlCopy = {
  turnOnLabel: "Let the Land be heard",
  turnOffLabel: "Silence the Land",
  offCaption: "Sound is off. The Land is listening instead.",
  onCaption: "Sound is on. It will not get better.",
};

export const palette: PaletteCopy = {
  title: "The Palantír",
  placeholder: "Tell the Stone what you are looking for",
  ariaLabel: "Palantír command palette",
  groupGo: "Look upon",
  groupActions: "Act",
  emptyState: "The Stone shows nothing. That is not the same as there being nothing.",
  openHint: "Ctrl K or Cmd K to consult the Stone",
  selectHint: "Enter to look",
  closeHint: "Esc to look away",
  commands: [
    { id: "go-threshold", label: "The Threshold", hint: "Proclamations and the state of the Realm", keywords: ["home", "start", "eye", "decrees"] },
    { id: "go-atlas", label: "The Atlas", hint: "Twelve places, none of them advisable", keywords: ["map", "places", "geography", "barad-dur", "orodruin"] },
    { id: "go-legions", label: "The Legions", hint: "Service dossiers", keywords: ["bestiary", "army", "nazgul", "orcs", "trolls"] },
    { id: "go-chronicle", label: "The Chronicle", hint: "The authorised history", keywords: ["history", "timeline", "ages"] },
    { id: "go-muster", label: "The Muster Office", hint: "Receive a Writ of Service", keywords: ["quiz", "writ", "enlist", "service"] },
    { id: "go-road", label: "The Last Road", hint: "A restricted exercise of the Watch", keywords: ["game", "play", "ring-bearer", "stealth"] },
    { id: "toggle-ring", label: "Claim or release the Ring", hint: "The Eye will take an interest", keywords: ["ring", "wraith", "invisible"] },
    { id: "toggle-audio", label: "Sound of the Land", hint: "Off until you say otherwise", keywords: ["audio", "sound", "mute", "drone"] },
  ],
};
