// The Muster Office: quiz, stations of service, Writ of Service. Issued by the Office of Musters.
// Scoring: sum each answer's scores per station; highest total wins. On a tie, the station earliest
// in `stations` wins. Maximum per station: warden, herald, artificer and keeper 10; clerk and scout 9.
// Each station is reachable.
// Writ tokens: {name}, {station}, {closing}. Substitute at render time.

export type StationId = "warden" | "herald" | "clerk" | "artificer" | "scout" | "keeper";

export interface Station {
  id: StationId;
  title: string;
  duties: string;
  closing: string;
}

export interface MusterAnswer {
  id: string;
  text: string;
  scores: Partial<Record<StationId, number>>;
}

export interface MusterQuestion {
  id: string;
  prompt: string;
  answers: MusterAnswer[];
}

export interface MusterCopy {
  title: string;
  intro: string;
  beginLabel: string;
  /** Tokens: {current}, {total}. */
  progressLabel: string;
  nextLabel: string;
  resultHeading: string;
  nameLabel: string;
  namePlaceholder: string;
  /** True in fact: the name leaves the page only in the Writ the visitor chooses to download. */
  nameNotice: string;
  downloadLabel: string;
  retakeLabel: string;
  retakeNote: string;
}

export interface WritCopy {
  office: string;
  title: string;
  /** Used when no name is given. */
  fallbackName: string;
  /** Tokens: {name}, {station}. */
  preamble: string;
  clauses: string[];
  /** Token: {closing}. */
  closingLine: string;
  dateLine: string;
  signature: string;
  sealText: string;
}

export const musterCopy: MusterCopy = {
  title: "The Muster Office",
  intro:
    "The Land has work for everyone. Answer the seven questions truthfully, or as truthfully as you dare, and the Office will determine where you can be of use. It has made no errors to date. It has checked.",
  beginLabel: "Report for assessment",
  progressLabel: "Question {current} of {total}",
  nextLabel: "Enter your answer",
  resultHeading: "The Office has reached its determination",
  nameLabel: "Name of the Recruit",
  namePlaceholder: "As you wish it entered",
  nameNotice: "The Office, unusually, keeps no copy. Your name leaves this page only in the Writ you choose to download.",
  downloadLabel: "Take your Writ",
  retakeLabel: "Petition for reassessment",
  retakeNote: "Petitions are heard in the order they are forgotten.",
};

export const stations: Station[] = [
  {
    id: "warden",
    title: "Warden of the Morannon",
    duties: "You will stand upon the Black Gate and watch the plain beyond it, in all weathers, for as long as the wall stands. You will open nothing without an order. You will note every movement on the Dagorlad, and you will develop an opinion of the horizon that nobody will ever ask to hear.",
    closing: "Stand fast. The gate does not open for you either.",
  },
  {
    id: "herald",
    title: "Herald of the Tower",
    duties: "You will ride to the enemy's walls under a black banner and read out terms that nobody can accept. You will speak clearly and be believed. You will be listened to with hatred by people who dare not interrupt, and on your return you will report exactly what they said, without improvement.",
    closing: "Your voice is now the property of the Tower. Look after it.",
  },
  {
    id: "clerk",
    title: "Clerk of the Silent Register",
    duties: "You will descend to the archive beneath Barad-dûr and keep the Register in which all things are entered: grain, spears, debts and names. You will reconcile the totals by lamplight. You will correct the past as directed, and you will come to understand what the state fears by what it asks you to remove.",
    closing: "Write nothing you would not wish to find later. Others will be reading.",
  },
  {
    id: "artificer",
    title: "Artificer of Udûn",
    duties: "You will work the forges under the slopes of Udûn, turning ore into mail, blades and the great engines of siege. You will learn to judge the heat by its colour. The hammers do not stop, by day or by night. In time, neither will you, and your work will arrive at the front before you are thanked for it.",
    closing: "A flawed blade is traced to its maker. They all are.",
  },
  {
    id: "scout",
    title: "Scout of the Morgai",
    duties: "You will walk the thorn-ridge between the mountains and the plain, alone, on the roads that do not appear in the Atlas. You will eat what you carry and report what moves. Your reports will reach the Watch quickly, and your own failure to report will reach the Watch more quickly than that.",
    closing: "Trust your eyes. They are not the only ones on you.",
  },
  {
    id: "keeper",
    title: "Keeper of the Durthang Pens",
    duties: "You will take charge of the wolves and other creatures kept under the walls of Durthang. You will feed them on schedule, because the alternative has already been tried. You will learn their tempers before they learn yours. The previous Keeper has left you detailed notes, which end in the middle of a sentence.",
    closing: "Never run. It only encourages them, and they are your colleagues.",
  },
];

export const questions: MusterQuestion[] = [
  {
    id: "stranger",
    prompt: "A stranger stands at your post without papers. What do you do?",
    answers: [
      { id: "stranger-hold", text: "Hold them where they are, until they regret arriving.", scores: { warden: 2 } },
      { id: "stranger-ask", text: "Ask what they want. People will tell you almost anything.", scores: { herald: 2 } },
      { id: "stranger-form", text: "Establish which form they should have filed, and when.", scores: { clerk: 2 } },
      { id: "stranger-follow", text: "Let them pass, and see who else they know.", scores: { scout: 2 } },
    ],
  },
  {
    id: "sound",
    prompt: "Which of these sounds do you find restful?",
    answers: [
      { id: "sound-hammer", text: "A hammer on hot iron, kept in time.", scores: { artificer: 2 } },
      { id: "sound-breath", text: "Something large, breathing in the dark, and asleep for now.", scores: { keeper: 2 } },
      { id: "sound-pen", text: "A pen moving across vellum, in a room with no windows.", scores: { clerk: 2 } },
      { id: "sound-wind", text: "Wind in the thorns, and nothing else for a mile.", scores: { scout: 2 } },
    ],
  },
  {
    id: "order",
    prompt: "You are handed an order you do not understand. What then?",
    answers: [
      { id: "order-obey", text: "Carry it out. Understanding is a matter for the Tower.", scores: { warden: 2 } },
      { id: "order-improve", text: "Correct the flaw in it, and return it improved.", scores: { artificer: 2, clerk: 1 } },
      { id: "order-deliver", text: "Deliver it to someone else as though you wrote it.", scores: { herald: 2 } },
      { id: "order-beast", text: "Pass it to something that cannot ask questions.", scores: { keeper: 2 } },
    ],
  },
  {
    id: "quarters",
    prompt: "Quarters are assigned on merit. Which do you request?",
    answers: [
      { id: "quarters-window", text: "A cell above the gate, with one window, facing out.", scores: { warden: 2, scout: 1 } },
      { id: "quarters-warm", text: "Anywhere near the furnace. Heat is the one honest thing here.", scores: { artificer: 2 } },
      { id: "quarters-ledge", text: "None. A dry ledge and a view of the road will do.", scores: { scout: 2 } },
      { id: "quarters-pens", text: "Below the pens, where nothing can come up behind you.", scores: { keeper: 2 } },
    ],
  },
  {
    id: "fear",
    prompt: "What do you privately fear? The Office already knows, and is comparing answers.",
    answers: [
      { id: "fear-error", text: "An error that nobody has yet noticed.", scores: { clerk: 2 } },
      { id: "fear-silence", text: "The silence after you have finished speaking.", scores: { herald: 2 } },
      { id: "fear-blade", text: "A piece of your own work, failing at the front.", scores: { artificer: 2 } },
      { id: "fear-open", text: "A knock from the far side of the gate.", scores: { warden: 2 } },
    ],
  },
  {
    id: "reward",
    prompt: "You have served with distinction. What reward will you accept?",
    answers: [
      { id: "reward-horse", text: "A black horse, and the right to be heard.", scores: { herald: 2 } },
      { id: "reward-archive", text: "One hour alone with the sealed archive.", scores: { clerk: 2 } },
      { id: "reward-beast", text: "The largest, worst-tempered animal in the pens.", scores: { keeper: 2 } },
      { id: "reward-forgotten", text: "To be forgotten by everyone but the Tower.", scores: { scout: 2 } },
    ],
  },
  {
    id: "gaze",
    prompt: "The Eye turns towards you, without warning. How do you conduct yourself?",
    answers: [
      { id: "gaze-stand", text: "Stand straight. It has seen worse.", scores: { warden: 2 } },
      { id: "gaze-work", text: "Keep working. Let the work answer for you.", scores: { artificer: 2 } },
      { id: "gaze-speak", text: "Speak first, before it can form a view.", scores: { herald: 2 } },
      { id: "gaze-still", text: "Go low and very still, as the animals do.", scores: { keeper: 2, scout: 1 } },
    ],
  },
];

export const writ: WritCopy = {
  office: "Office of Musters, Barad-dûr",
  title: "Writ of Service",
  fallbackName: "The Bearer of This Writ",
  preamble: "Be it entered in the Register of the Land that {name}, having been examined by this Office and found to be of use, is appointed {station}.",
  clauses: [
    "This appointment takes effect upon issue and continues at the pleasure of the Tower.",
    "The holder will present this Writ on demand to any officer of the Land.",
    "Loss of this Writ does not release the holder from its terms.",
  ],
  closingLine: "{closing}",
  dateLine: "Given at Lugbúrz in the Third Age, in the year 3019.",
  signature: "For the Tower, the Office of Musters",
  sealText: "Sealed under the Eye",
};
