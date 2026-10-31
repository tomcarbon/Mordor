// Words for the Threshold (/): hero, proclamations, State of the Realm, entry cards.

import type { RouteId } from "./site";

export interface HeroCopy {
  eyebrow: string;
  title: string;
  /** Shown in rotation beneath the title, or stacked with reduced motion. */
  lines: string[];
  scrollHint: string;
}

export interface HeroControlCopy {
  pause: string;
  resume: string;
}

export interface Proclamation {
  id: string;
  /** In-universe date, Third Age reckoning. */
  date: string;
  issuer: string;
  title: string;
  body: string;
}

export interface RealmFigure {
  id: string;
  label: string;
  value: string;
  note: string;
}

export interface EntryCard {
  route: RouteId;
  path: string;
  kicker: string;
  title: string;
  blurb: string;
  action: string;
}

export interface SectionHeadings {
  proclamationsTitle: string;
  proclamationsIntro: string;
  realmTitle: string;
  realmIntro: string;
  entriesTitle: string;
  entriesIntro: string;
}

export const hero: HeroCopy = {
  eyebrow: "By Authority of the Tower",
  title: "The Black Land",
  lines: [
    "You were expected.",
    "Nothing grows here without permission.",
    "Your attendance has been noted. Your departure has not been scheduled.",
    "The Black Land regrets nothing, and has the paperwork to prove it.",
    "Every road in Middle-earth ends here. The Ministry of Roads considers the matter settled.",
  ],
  scrollHint: "Descend",
};

export const heroControl: HeroControlCopy = {
  pause: "Suspend the announcements",
  resume: "Resume the announcements",
};

export const headings: SectionHeadings = {
  proclamationsTitle: "Proclamations",
  proclamationsIntro:
    "The following are in force. Ignorance of them has been tried as a defence, and it was brief.",
  realmTitle: "The State of the Realm",
  realmIntro: "Figures certified by the Ministry of Record. Do not check them.",
  entriesTitle: "Departments of State",
  entriesIntro: "You may proceed in any order. The result is the same.",
};

export const proclamations: Proclamation[] = [
  {
    id: "return",
    date: "T.A. 2951",
    issuer: "Office of Proclamations",
    title: "Proclamation of Residence",
    body: "The Lord of this Land has resumed residence and no longer troubles to conceal it. The Dark Tower will rise again on its old foundations, which were never surrendered. All peoples are advised to revise their plans.",
  },
  {
    id: "orodruin",
    date: "T.A. 2954",
    issuer: "Bureau of Survey",
    title: "Notice of Volcanic Activity",
    body: "Orodruin has resumed burning. Remaining residents of Ithilien are reminded that the opportunity to leave is a courtesy, and that courtesies lapse.",
  },
  {
    id: "osgiliath",
    date: "T.A. 3018, 20 June",
    issuer: "Directorate of Forces",
    title: "Notice to Travellers on the Anduin",
    body: "Forces of the Land have entered eastern Osgiliath. The last bridge is no longer in service. Persons wishing to cross the river are invited to wait for us to come to them.",
  },
  {
    id: "dawn",
    date: "T.A. 3019, 10 March",
    issuer: "Office of the Watch",
    title: "Order Suspending the Morning",
    body: "Dawn is withdrawn from the lands west of the mountains until further notice. The cloud now leaving Orodruin is an instrument of state. Gondor may use the time to reflect.",
  },
  {
    id: "garrisons",
    date: "T.A. 3019, 14 March",
    issuer: "Directorate of Forces",
    title: "Circular to All Garrisons",
    body: "Captured property belongs to the Tower. Disputes over it will be settled by the Tower. The garrison at Cirith Ungol has demonstrated the alternative and is no longer in a position to comment.",
  },
  {
    id: "small-persons",
    date: "T.A. 3019, 16 March",
    issuer: "Office of the Watch",
    title: "Standing Order on Small Persons",
    body: "A spy of unusually low stature was taken near Cirith Ungol and has not remained taken. Patrols will report all small persons, in any company. An officer who describes this matter as resolved will be invited to explain himself in person.",
  },
  {
    id: "west",
    date: "T.A. 3019, 24 March",
    issuer: "Office of Proclamations",
    title: "Notice of Arrival",
    body: "A small army of the West is reported on the road to the Morannon, led by a man who claims a certain ancestry. The Land has been emptied of its garrisons in order to receive him properly. The Gate will open. It generally does, once.",
  },
];

export const realmFigures: RealmFigure[] = [
  {
    id: "sunrises",
    label: "Sunrises Scheduled",
    value: "0",
    note: "The Office of the Watch considers them an unnecessary exposure.",
  },
  {
    id: "riders",
    label: "Riders in Service",
    value: "9",
    note: "The establishment has not altered since the Second Age.",
  },
  {
    id: "exits",
    label: "Roads Leading Out",
    value: "0",
    note: "Roads leading in remain open at all hours.",
  },
  {
    id: "rings",
    label: "Rings Outstanding",
    value: "1",
    note: "The Ministry does not wish to discuss this figure.",
  },
];

export const entryCards: EntryCard[] = [
  {
    route: "atlas",
    path: "/atlas",
    kicker: "Bureau of Survey",
    title: "The Atlas",
    blurb: "Twelve places, surveyed at some cost. All distances are correct. All are further than they look.",
    action: "Consult the map",
  },
  {
    route: "legions",
    path: "/legions",
    kicker: "Directorate of Forces",
    title: "The Legions",
    blurb: "The servants of the Land, assessed without sentiment. The assessments are read by those assessed.",
    action: "Open the files",
  },
  {
    route: "chronicle",
    path: "/chronicle",
    kicker: "Ministry of Record",
    title: "The Chronicle",
    blurb: "Two Ages of patient government, in the only edition still being printed.",
    action: "Read the record",
  },
  {
    route: "muster",
    path: "/muster",
    kicker: "Office of Musters",
    title: "The Muster Office",
    blurb: "Seven questions. Six stations. There is a place for you here, and it has already been measured.",
    action: "Report for assessment",
  },
  {
    route: "road",
    path: "/road",
    kicker: "Office of the Watch",
    title: "The Last Road",
    blurb: "A restricted exercise. You will take the part of the intruder, so that officers may learn how it was done.",
    action: "Begin the exercise",
  },
];
