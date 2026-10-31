// Service dossiers. Issued by the Directorate of Forces.
// Gothmog: the books name him Lieutenant of Morgul and give no race. Do not depict him as the film's orc.

export type LegionCategory = "Command" | "Orcs" | "Trolls" | "Allies" | "Beasts" | "Unaffiliated";

/** Each rating is an integer from 1 to 10. */
export interface LegionRatings {
  strength: number;
  discipline: number;
  loyalty: number;
  dread: number;
}

export interface LegionDossier {
  id: string;
  name: string;
  category: LegionCategory;
  role: string;
  ratings: LegionRatings;
  text: string;
  ministryNote: string;
}

export interface LegionsCopy {
  title: string;
  intro: string;
  filterAllLabel: string;
  filterLabel: string;
  noteLabel: string;
  ratingLabels: Record<keyof LegionRatings, string>;
  emptyState: string;
}

export const legionsCopy: LegionsCopy = {
  title: "The Legions",
  intro:
    "Files of the Directorate of Forces. All ratings are out of ten and were awarded without appeal. A low score in loyalty is not an accusation. It is a schedule.",
  filterAllLabel: "All files",
  filterLabel: "Filter by service",
  noteLabel: "Ministry note",
  ratingLabels: {
    strength: "Strength",
    discipline: "Discipline",
    loyalty: "Loyalty",
    dread: "Dread",
  },
  emptyState: "No such file exists. Someone has been told.",
};

export const legionCategories: LegionCategory[] = [
  "Command",
  "Orcs",
  "Trolls",
  "Allies",
  "Beasts",
  "Unaffiliated",
];

export const legions: LegionDossier[] = [
  {
    id: "nazgul",
    name: "The Nazgûl",
    category: "Command",
    role: "Ringwraiths. Commanders, hunters, instruments of terror",
    ratings: { strength: 9, discipline: 10, loyalty: 10, dread: 10 },
    text: "Nine mortal men accepted rings of power, and over long years ceased to be men, though none could name the day. They are unseen, and the living feel their coming as a failure of nerve. Their Lord ruled Angmar before he ruled Morgul. Fire and running water have delayed them. The Directorate concedes nothing further. They do not eat, tire or resign.",
    ministryNote: "Do not address them. Their reply is not a conversation you would finish.",
  },
  {
    id: "uruk-hai",
    name: "Uruk-hai of Mordor",
    category: "Orcs",
    role: "Heavy infantry",
    ratings: { strength: 7, discipline: 7, loyalty: 6, dread: 6 },
    text: "Large black orcs, first fielded in 2475 when they took Osgiliath. They bear the Eye on their shields, march long distances without complaint, and tolerate the sun better than their lesser kin. They despise those kin openly, and the feeling is used. A rival concern at Isengard fields its own Uruk-hai under a white device. The Directorate has no comment on imitations.",
    ministryNote: "Promotion is available to any Uruk who can arrange a vacancy.",
  },
  {
    id: "snaga",
    name: "Snaga",
    category: "Orcs",
    role: "Line infantry, labour, scouts and trackers",
    ratings: { strength: 3, discipline: 3, loyalty: 3, dread: 3 },
    text: "The lesser orcs, and the great bulk of every army. Uruks use the word as a rank and as an insult, and do not distinguish between the two. Singly they are unimpressive and, in a straight line, unreliable. They are, however, numerous beyond the capacity of any enemy to exhaust. Their officers drive them from behind. Sniffers and trackers among them have surprising talents.",
    ministryNote: "Numbers are the only quality that has never failed us. Replacement is prompt.",
  },
  {
    id: "olog-hai",
    name: "Olog-hai",
    category: "Trolls",
    role: "Shock troops",
    ratings: { strength: 10, discipline: 8, loyalty: 8, dread: 8 },
    text: "Bred in the latter years of the Third Age, these trolls are a state achievement. They are cunning, they think in formation and, while the will of the Tower holds them, they endure the sun. Their scales of armour are mostly their own. They know little speech but the Black Speech, and they need little. Given a shield and a direction, they will walk through whatever is in it.",
    ministryNote: "The sun was the last argument the West had against them. It has been answered.",
  },
  {
    id: "trolls",
    name: "Trolls of Gorgoroth",
    category: "Trolls",
    role: "Siege labour and line-breakers",
    ratings: { strength: 9, discipline: 4, loyalty: 5, dread: 7 },
    text: "The older stock: hill-trolls and their cousins, of great size and limited conversation. Daylight turns the stone-breed back into the material they appear to prefer. They are used to haul engines, smash gates and walk into the front of a shield wall, and they do all three with the same expression. Their handlers are replaced at a steady rate, which the Directorate accepts as a running cost.",
    ministryNote: "Do not stand behind one. Do not stand in front of one either.",
  },
  {
    id: "easterlings",
    name: "Easterlings",
    category: "Allies",
    role: "Allied infantry and cavalry",
    ratings: { strength: 6, discipline: 7, loyalty: 6, dread: 5 },
    text: "Peoples of Rhûn and the lands beyond it, many and various, who have warred on Gondor since long before this government returned. The Wainriders and Balchoth came from among them. Axemen and riders serve with the armies now, and Variags of Khand beside them. They hold their own grievances, which the Tower has been pleased to adopt. They came to this war with reasons, and the Ministry has made sure of the reasons.",
    ministryNote: "Treaty partners. The word is used here in its local sense.",
  },
  {
    id: "haradrim",
    name: "Haradrim",
    category: "Allies",
    role: "Allied infantry, cavalry and war-mûmakil",
    ratings: { strength: 7, discipline: 7, loyalty: 6, dread: 7 },
    text: "The kingdoms of Harad have an old quarrel with Gondor, whose fleets once took Umbar and held it over their heads. Their lords now march under the Black Serpent on scarlet, and bring with them the mûmakil, which no line of horse will willingly face. They are proud, capable and fight for kings of their own. The Tower has never needed to correct their courage. It has only needed to direct it.",
    ministryNote: "A mûmak is not steered. It is pointed, and then accounted for.",
  },
  {
    id: "fell-beasts",
    name: "Fell Beasts",
    category: "Beasts",
    role: "Mounts of the Nazgûl",
    ratings: { strength: 8, discipline: 7, loyalty: 8, dread: 9 },
    text: "Vast winged creatures of bare hide, older in design than anything currently living. They were issued to the Riders after the loss of their horses at a ford in the north, a regrettable incident on which the Directorate has closed its file. Raised on a diet the Ministry does not publish, they are not afraid of anything, and this is a quality they share with very little else.",
    ministryNote: "Their shadow crosses a battlefield at no cost to the state. It is our cheapest weapon.",
  },
  {
    id: "wargs",
    name: "Wargs",
    category: "Beasts",
    role: "Allied predators and mounts for wolf-riders",
    ratings: { strength: 5, discipline: 4, loyalty: 3, dread: 6 },
    text: "Great evil wolves of Wilderland and the mountains, who speak among themselves and regard the orcs that ride them as a form of transport. They hunt in concert with the Tower's northern allies more than within the Land itself. They are clever, patient and impossible to pay. The Directorate lists them as allies. They would dispute the term if they thought it worth their trouble.",
    ministryNote: "They keep their own muster. So far it has agreed with ours.",
  },
  {
    id: "shelob",
    name: "Shelob",
    category: "Unaffiliated",
    role: "Unaffiliated hazard, Cirith Ungol",
    ratings: { strength: 9, discipline: 1, loyalty: 1, dread: 10 },
    text: "Last child of Ungoliant, she was in the Ephel Dúath before the first stone of the Tower was laid. She lairs in the tunnel of Torech Ungol and consumes elves, men and orcs without regard to their paperwork. She serves no one. The Tower tolerates her because she guards a road for free and has never once requested anything. She is the only resident of Mordor who is not afraid of its government.",
    ministryNote: "Not a member of the armed forces. Do not attempt to issue orders.",
  },
  {
    id: "mouth-of-sauron",
    name: "The Mouth of Sauron",
    category: "Command",
    role: "Lieutenant of the Tower, herald and envoy",
    ratings: { strength: 5, discipline: 9, loyalty: 10, dread: 8 },
    text: "A man of the Black Númenóreans, who entered the service of the Tower when it rose again and has climbed by sorcery and usefulness to speak in its name. Personnel holds no name for him. He was asked, and could not supply one. He conducts the Land's diplomacy, which is a matter of terms offered once. He smiles while delivering them, and it has not been recorded that this helps.",
    ministryNote: "He speaks with the full voice of the state. Do not correct his grammar, or anything else.",
  },
  {
    id: "gothmog",
    name: "Gothmog",
    category: "Command",
    role: "Lieutenant of Morgul",
    ratings: { strength: 7, discipline: 8, loyalty: 9, dread: 7 },
    text: "Second in the Morgul command, and the officer who takes the field when his Lord is otherwise engaged. His origins are not a matter of public record, and enquiries are discouraged. He has shown that he can hold a broken army at the wall of a city and send it forward again, with every reserve the Land can spare, which is a rare gift. The Directorate values a commander who does not stop to mourn.",
    ministryNote: "Succession in Morgul is orderly. It has had to be.",
  },
];
