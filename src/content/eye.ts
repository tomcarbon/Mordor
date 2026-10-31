// Words for the Attention of the Eye and the Ring.
// Honesty rule: observations are in-world menace. None may imply knowledge of real personal data
// (location, device, identity). They speak only of browsing in general and the Ring toggle.

export type AttentionThreshold = 0 | 25 | 50 | 75 | 100;

export interface AttentionLevel {
  /** The label applies from this percentage up to the next threshold. */
  threshold: AttentionThreshold;
  label: string;
  description: string;
}

export type ObservationCondition = "any" | "ringOn" | "ringOff";

export interface Observation {
  id: string;
  /** When this line may be shown. */
  when: ObservationCondition;
  text: string;
}

export interface TakeoverCopy {
  title: string;
  /** Shown in order. */
  lines: string[];
  dismissLabel: string;
  /** Shown after dismissal, once the meter has reset. */
  afterword: string;
}

export interface RingControlCopy {
  claimLabel: string;
  releaseLabel: string;
  /** Short status text for the wraith-world state. */
  wornStatus: string;
  unwornStatus: string;
}

export interface RingMessages {
  /** One shown at random on putting the Ring on. */
  on: string[];
  /** One shown at random on taking the Ring off. */
  off: string[];
}

export const meterTitle = "Attention of the Eye";

export const attentionLevels: AttentionLevel[] = [
  {
    threshold: 0,
    label: "Unremarked",
    description: "Nothing in this Land has yet troubled to look at you. It is a brief condition.",
  },
  {
    threshold: 25,
    label: "Noted",
    description: "A clerk has written something down. It was not long.",
  },
  {
    threshold: 50,
    label: "Of Interest",
    description: "The Eye has been made aware of a matter. You are the matter.",
  },
  {
    threshold: 75,
    label: "Under Regard",
    description: "It has turned. Do not run. Running is merely informative.",
  },
  {
    threshold: 100,
    label: "Found",
    description: "There is nothing further to report.",
  },
];

export const observations: Observation[] = [
  { id: "reading", when: "any", text: "You have been reading for some time. The Tower reads faster." },
  { id: "pause", when: "any", text: "You stopped just then. It was noticed, and it was not admired." },
  { id: "quiet", when: "any", text: "There is no need to scroll so quietly." },
  { id: "returning", when: "any", text: "You keep returning to the same places. So do the patrols." },
  { id: "not-left", when: "any", text: "You have not left. The Ministry draws its own conclusions." },
  { id: "carrying", when: "any", text: "You have the look of someone carrying something." },
  { id: "meter", when: "any", text: "The meter is a courtesy. The Eye does not require one." },
  { id: "only-looking", when: "any", text: "A person who only wished to look would have gone by now." },
  { id: "curiosity", when: "any", text: "Your curiosity has been entered under Assets." },
  { id: "late", when: "any", text: "It is late where you are. It is always late here." },
  { id: "bare-hand", when: "ringOff", text: "Your hand is empty. It keeps remembering otherwise." },
  { id: "pocket", when: "ringOff", text: "You took it off. You did not put it far away." },
  { id: "everyone", when: "ringOn", text: "You put it on. Everyone does." },
  { id: "orcs", when: "ringOn", text: "Hidden from the orcs, perhaps. They were never the difficulty." },
  { id: "fits", when: "ringOn", text: "It fits you very well. That ought to worry you." },
  { id: "heavier", when: "ringOn", text: "It is heavier than you were told, and it will go on being heavier." },
];

export const takeover: TakeoverCopy = {
  title: "Found",
  lines: [
    "The search is concluded. It took less time than you supposed.",
    "You were not hiding. You were being left until later.",
    "Please remain where you are. There is nowhere else.",
  ],
  dismissLabel: "Lower your eyes",
  afterword: "The Eye has turned elsewhere. This is not clemency. It has a great deal to look at.",
};

export const ringControl: RingControlCopy = {
  claimLabel: "Claim the Ring",
  releaseLabel: "Release the Ring",
  wornStatus: "The Ring is on your finger",
  unwornStatus: "The Ring is in your keeping",
};

export const ringMessages: RingMessages = {
  on: [
    "The world thins. Something in the east lifts its head.",
    "Colour leaves first. It is followed by the distance between you and the Tower.",
    "You have disappeared from everyone who does not matter.",
  ],
  off: [
    "The colours return. The attention does not.",
    "You are visible again, to the people who were never a danger.",
    "It came off. Note that you had to decide.",
  ],
};
