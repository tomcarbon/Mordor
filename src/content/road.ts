// The Last Road: game copy. In-world frame: an exercise of the Office of the Watch that reconstructs
// an alleged incursion, with the player as the intruder.
// Instructions describe the planned mechanics; align them with the game once WO-0001.6 is built.

export type StageId = "cirith-ungol" | "morgai" | "gorgoroth" | "orodruin";

export interface RoadStage {
  id: StageId;
  name: string;
  briefing: string;
}

export interface RoadInstruction {
  action: string;
  keys: string;
  detail: string;
}

export interface RoadHud {
  stageLabel: string;
  exposureLabel: string;
  ringOnLabel: string;
  ringOffLabel: string;
}

export interface RoadVictory {
  title: string;
  lines: string[];
  verdict: string;
  retryLabel: string;
  exitLabel: string;
}

export interface RoadGameOver {
  title: string;
  /** One shown at random on failure. */
  lines: string[];
  retryLabel: string;
  exitLabel: string;
}

export interface RoadCopy {
  title: string;
  subtitle: string;
  intro: string[];
  startLabel: string;
  pauseLabel: string;
  resumeLabel: string;
  touchHint: string;
}

export const roadCopy: RoadCopy = {
  title: "The Last Road",
  subtitle: "Reconstruction Exercise of the Office of the Watch. Restricted Circulation.",
  intro: [
    "It is alleged that in March a person of small stature crossed this Land on foot, from Cirith Ungol to the slopes of Orodruin, without being stopped.",
    "The Office of the Watch has reconstructed the route so that officers may learn how such a thing could be attempted. You will take the part of the intruder.",
    "You are reminded that this is an exercise, and that no one has yet been commended for doing well at it.",
  ],
  startLabel: "Begin the exercise",
  pauseLabel: "Suspend the exercise",
  resumeLabel: "Resume the exercise",
  touchHint: "On a touch screen, use the controls shown on the field.",
};

export const instructions: RoadInstruction[] = [
  { action: "Move", keys: "Arrow keys or WASD", detail: "Keep to the rocks and the dark. Open ground is reported ground." },
  { action: "The Eye", keys: "Watch the sweep", detail: "Its gaze crosses the land on a slow course. Be behind something when it arrives." },
  { action: "The Ring", keys: "Space", detail: "Hides you from patrols. It does not hide you from the Eye, which it brings to you faster." },
  { action: "Pause", keys: "Esc", detail: "The exercise will wait. The original did not." },
];

export const stages: RoadStage[] = [
  {
    id: "cirith-ungol",
    name: "Cirith Ungol",
    briefing: "Leave the tower. The garrison has been fighting itself and can be relied upon to continue.",
  },
  {
    id: "morgai",
    name: "The Morgai",
    briefing: "Follow the trench through the thorns. The patrols here are bored, which is not the same as blind.",
  },
  {
    id: "gorgoroth",
    name: "The Plain of Gorgoroth",
    briefing: "Cross open ash under the full sweep of the Eye. The Office notes that there is no other way.",
  },
  {
    id: "orodruin",
    name: "Orodruin",
    briefing: "Climb. The candidate will find the load has grown. It does this. It is the last of its defences.",
  },
];

export const hud: RoadHud = {
  stageLabel: "Stage",
  exposureLabel: "Exposure",
  ringOnLabel: "Ring worn",
  ringOffLabel: "Ring hidden",
};

export const gameOver: RoadGameOver = {
  title: "Intruder Recovered",
  lines: [
    "Recovered without incident. The exercise has performed as the Office intended.",
    "The patrol reports that you were small, tired and easy to find. All three have been noted.",
    "A sentry looked up. That is the whole of the report.",
    "You stepped into the light. The Office asks that you consider how long it took.",
    "The item has been recovered and forwarded to the Tower. You have not.",
    "You put on the Ring, and the Eye was pleased to accept the invitation.",
    "Your route is entered in the training manual, under Common Errors.",
    "The search party had expected to be out for longer. They have asked to thank you.",
    "The plain is wide. You crossed some of it.",
    "The attempt is over. It compares favourably with no other.",
  ],
  retryLabel: "Attempt the exercise again",
  exitLabel: "Report to the Threshold",
};

export const victory: RoadVictory = {
  title: "Exercise Terminated",
  lines: [
    "The candidate has reached the Sammath Naur.",
    "This outcome is not available.",
    "The exercise has been withdrawn from circulation, and the reconstruction has been referred to the Ministry of Record for correction.",
    "The officer who designed it has been reassigned to the Sea of Núrnen, where there is nothing to watch.",
  ],
  verdict: "You have completed the exercise incorrectly. The state is displeased.",
  retryLabel: "Repeat the exercise until it is done properly",
  exitLabel: "Leave before anyone reads this",
};
