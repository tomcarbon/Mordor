// Atlas of the Land. Issued by the Bureau of Survey.
// Coordinates: 0-1000 on both axes, x runs west to east, y runs north to south (SVG convention).
// Layout follows Tolkien's geography loosely: Morannon in the north-west corner, Udûn behind it,
// Ephel Dúath down the west and round the south, Ered Lithui along the north, Morgai as the inner
// ridge, Minas Morgul outside the western wall.

export type PlaceKind =
  | "Fortress"
  | "Mountain of Fire"
  | "Gate"
  | "Pass"
  | "City"
  | "Valley"
  | "Hold"
  | "Plateau"
  | "Ridge"
  | "Rampart"
  | "Province"
  | "Inland Sea";

export type DangerRating = 1 | 2 | 3 | 4 | 5;

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  x: number;
  y: number;
  epithet: string;
  dossier: string;
  danger: DangerRating;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface MountainRange {
  id: string;
  name: string;
  /** Polyline, ordered along the range. */
  points: MapPoint[];
}

export interface AtlasCopy {
  title: string;
  intro: string;
  dangerLabel: string;
  /** Index 0 is the wording for danger 1, index 4 for danger 5. */
  dangerScale: string[];
  closeLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  resetLabel: string;
  instructions: string;
}

export const atlasCopy: AtlasCopy = {
  title: "Atlas of the Land",
  intro:
    "Surveyed by the Bureau of Survey and corrected by the Tower. Each entry carries a danger rating, which describes the place and not the visitor. The visitor has not yet been rated.",
  dangerLabel: "Danger",
  dangerScale: ["Inadvisable", "Hazardous", "Severe", "Usually fatal", "Do not"],
  closeLabel: "Close the dossier",
  zoomInLabel: "Draw nearer",
  zoomOutLabel: "Stand back",
  resetLabel: "Restore the survey",
  instructions: "Drag to pan. Scroll or pinch to zoom. Select a place to open its dossier.",
};

export const places: Place[] = [
  {
    id: "barad-dur",
    name: "Barad-dûr",
    kind: "Fortress",
    x: 540,
    y: 205,
    epithet: "The seat of government, and the reason for all the others.",
    dossier: "The Dark Tower stands on a southern spur of the Ered Lithui. It was begun about the thousandth year of the Second Age and finished six centuries later; the orcs call it Lugbúrz. The Last Alliance spent seven years bringing it down and could not remove the foundations, which were laid by a power its besiegers did not understand. Reconstruction has continued since 2951. Visitors are not received. Those who are summoned will find that the journey has been arranged.",
    danger: 5,
  },
  {
    id: "orodruin",
    name: "Orodruin",
    kind: "Mountain of Fire",
    x: 420,
    y: 345,
    epithet: "The national forge. Its output has been limited to one item of note.",
    dossier: "A solitary burning mountain on the plateau of Gorgoroth, known in Gondor as Amon Amarth. Near its summit a passage opens into the Sammath Naur, the Chambers of Fire, where the Lord of this Land made the greatest work of his hands. The mountain answers to him and wakes when he returns. A paved road runs here from the Tower, and is kept in repair. The Bureau has been instructed to omit the mountain's other properties, and it has done so.",
    danger: 5,
  },
  {
    id: "morannon",
    name: "Morannon",
    kind: "Gate",
    x: 195,
    y: 145,
    epithet: "The front door. There is no other that you would care to use.",
    dossier: "The Black Gate closes the gap where the Ered Lithui and the Ephel Dúath almost meet. Its iron wall holds three great doors. The two towers flanking it, the Teeth of Mordor, were raised by Gondor after the Last Alliance to keep this Land under guard, and were abandoned when Gondor grew tired. The Tower took them over without alteration. Hills of slag lie before the wall towards the north. Applications to enter are rarely refused. Applications to leave have no form.",
    danger: 4,
  },
  {
    id: "cirith-ungol",
    name: "Cirith Ungol",
    kind: "Pass",
    x: 185,
    y: 490,
    epithet: "A secondary route, rated impassable. The rating is under review.",
    dossier: "The Pass of the Spider climbs the Ephel Dúath above the Morgul Vale, by long stairs and then through a tunnel whose tenant is older than the state and pays it nothing. Beyond the cleft stands a tower raised by Gondor to watch this Land, and retained by us to watch everyone else. Two stone Watchers sit at its gate and cannot be argued with. The garrison has been reduced by recent events. The Bureau is unable to say more while the inquiry continues.",
    danger: 4,
  },
  {
    id: "minas-morgul",
    name: "Minas Morgul",
    kind: "City",
    x: 118,
    y: 500,
    epithet: "Formerly the Tower of the Moon. The moon has not asked for it back.",
    dossier: "Gondor built this city as Minas Ithil, on the western side of the mountains, and it stands on the wrong side of the Ephel Dúath for a reason: it was taken. The Nazgûl besieged it for two years and entered in 2002, securing a palantír with it. It has since been the seat of their Lord and a permanent assembly point for the armies that march on Gondor. Its walls give off a pale light of their own. It is not a comfort. No one in the Vale sleeps well, including the dead.",
    danger: 5,
  },
  {
    id: "udun",
    name: "Udûn",
    kind: "Valley",
    x: 245,
    y: 195,
    epithet: "The anteroom of the state, kept hot and fully stocked.",
    dossier: "The deep dale behind the Morannon, walled by mountains on the west and north and shut at its southern end by the Isenmouthe. Tunnels and armouries run through its slopes, and the pits and forges here supply the northern armies. Any army that forced the Gate would find itself in a sealed room, under the eyes of the people who built it. The Ministry mentions this for the benefit of planners in Gondor, who are welcome to their calculations.",
    danger: 4,
  },
  {
    id: "durthang",
    name: "Durthang",
    kind: "Hold",
    x: 185,
    y: 215,
    epithet: "An old castle above Udûn, in present use as a barracks for orcs.",
    dossier: "A fortress in the mountains on the western side of Udûn, with orc-holds in the rock around it. Its builders are not recorded in any document this Bureau is permitted to consult. The garrison changes often, for reasons the Directorate of Forces describes as operational. From the battlements a sentry can see the whole valley, the road to the Isenmouthe, and every colleague who might be plotting against him. Morale is reported as adequate, by the people who remain.",
    danger: 3,
  },
  {
    id: "gorgoroth",
    name: "Gorgoroth",
    kind: "Plateau",
    x: 470,
    y: 430,
    epithet: "The central plain. It offers no shade, no water and no argument.",
    dossier: "A high plateau of ash and broken rock between the Morgai and the Tower, scarred by pits and the old work of Orodruin's fires. Here the Last Alliance camped for seven years, and the ground has not forgiven it. Water is rare and foul. Cover is what the fumes provide. Military roads cross the plain, and camps of orcs and men stand along them when the armies gather. The Bureau records no one crossing it on foot without orders, and has been asked to say so firmly.",
    danger: 4,
  },
  {
    id: "morgai",
    name: "Morgai",
    kind: "Ridge",
    x: 255,
    y: 420,
    epithet: "The inner fence, where the last living things in the Land are dying slowly.",
    dossier: "A jagged inner ridge running north and south within the Ephel Dúath, with a deep trench between the two. Below it, hardy thorn and bramble still cling to the ground, and they are the last plants of any size in this part of the Land. Biting flies breed here, for reasons of their own. A patrol road follows the trench towards the Isenmouthe. The Bureau notes that the ridge conceals as much as it fences in. This observation was added recently, by another hand.",
    danger: 3,
  },
  {
    id: "isenmouthe",
    name: "Isenmouthe",
    kind: "Rampart",
    x: 285,
    y: 265,
    epithet: "The Iron Jaws. A second gate, for those who found the first too easy.",
    dossier: "Carach Angren, in the Grey-elven tongue, which the Bureau uses here for reference only. An earthwork rampart and a deep trench seal the southern end of Udûn where a spur of the Ered Lithui reaches towards the Morgai. A single bridge crosses the trench, and the roads from Morgul, the Tower and the Morannon converge on it. Companies arriving for inspection are counted here. Stragglers are also counted. All marching orders for the northern front pass through these jaws, and the Office of Musters takes attendance.",
    danger: 3,
  },
  {
    id: "nurn",
    name: "Nurn",
    kind: "Province",
    x: 480,
    y: 700,
    epithet: "The southern fields. The armies eat because of what is done here.",
    dossier: "The great fields of the south lie along the rivers that feed Núrnen, and they feed the host of Mordor in turn. The people who work them are thralls, brought from the lands the Tower has conquered, and they have no choice in it and no release from it. The Ministry has been asked to find something clever to say about this province. It has not, and no such entry will appear here. The harvest figures are complete. The names are not recorded.",
    danger: 2,
  },
  {
    id: "nurnen",
    name: "Sea of Núrnen",
    kind: "Inland Sea",
    x: 650,
    y: 730,
    epithet: "A bitter sea with nowhere to go.",
    dossier: "A great inland sea in the south-east of the Land, enclosed by distance and by the far wall of the Ephel Dúath. Its waters are dark and bitter, and rivers run into it that do not run out again. No fleet of the state has ever needed to sail on it. It appears in this atlas because surveyors are thorough, and because every traveller should be shown what lies at the end of a journey inland: still water, and a shore where nothing is expected to arrive.",
    danger: 1,
  },
];

export const ranges: MountainRange[] = [
  {
    id: "ephel-duath",
    name: "Ephel Dúath",
    points: [
      { x: 165, y: 165 },
      { x: 180, y: 230 },
      { x: 165, y: 330 },
      { x: 180, y: 420 },
      { x: 180, y: 520 },
      { x: 170, y: 640 },
      { x: 205, y: 760 },
      { x: 330, y: 850 },
      { x: 520, y: 890 },
      { x: 720, y: 880 },
      { x: 880, y: 820 },
      { x: 965, y: 740 },
    ],
  },
  {
    id: "ered-lithui",
    name: "Ered Lithui",
    points: [
      { x: 230, y: 125 },
      { x: 340, y: 105 },
      { x: 470, y: 125 },
      { x: 590, y: 105 },
      { x: 720, y: 125 },
      { x: 850, y: 110 },
      { x: 970, y: 140 },
    ],
  },
  {
    id: "morgai",
    name: "Morgai",
    points: [
      { x: 275, y: 285 },
      { x: 262, y: 380 },
      { x: 250, y: 470 },
      { x: 258, y: 560 },
      { x: 240, y: 620 },
    ],
  },
];
