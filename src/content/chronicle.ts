// The authorised history. Issued by the Ministry of Record.
// Ordered oldest first. The regime may spin, but every event and date here is meant to hold up
// against the Appendices of The Lord of the Rings. The last entry is the refusal.

export type ChronicleEra = "Second Age" | "Third Age";

export interface ChronicleEntry {
  id: string;
  era: ChronicleEra;
  /** Display year. A leading "c." marks a conventional date. */
  year: string;
  title: string;
  text: string;
}

export interface ChronicleCopy {
  title: string;
  intro: string;
  closing: string;
}

export const chronicleCopy: ChronicleCopy = {
  title: "The Chronicle",
  intro:
    "The authorised history of the Land, compiled by the Ministry of Record. Other histories exist. Their authors have been informed.",
  closing: "The record is closed. This office remains open.",
};

export const chronicle: ChronicleEntry[] = [
  {
    id: "founding",
    era: "Second Age",
    year: "c. S.A. 1000",
    title: "The Founding",
    text: "The Lord of this Land surveys the world and finds it badly run. He chooses Mordor for its walls, its fire and its want of neighbours, and begins a tower at Barad-dûr. No other government in Middle-earth has ever selected its capital with such foresight. No other has needed to.",
  },
  {
    id: "completion",
    era: "Second Age",
    year: "c. S.A. 1600",
    title: "The Completion of the Tower",
    text: "At Orodruin the Lord completes the work he began among the smiths of Eregion, who had been taught better than they knew. The Elves perceive it at once and withdraw their rings, an act of bad faith the Ministry still regrets on their behalf. In the same year the Dark Tower is finished.",
  },
  {
    id: "eriador",
    era: "Second Age",
    year: "S.A. 1701",
    title: "The Eriador Campaign",
    text: "Eight years of war lay waste to Eriador and bring down Eregion, whose smith Celebrimbor pays the full price of his workmanship. A late fleet from Númenor compels the Lord's forces to withdraw from the north-west. The Ministry records this as a withdrawal. It was a long one. He kept what he had learned about Númenor.",
  },
  {
    id: "riders",
    era: "Second Age",
    year: "c. S.A. 2251",
    title: "The First Riders",
    text: "The Nazgûl are first seen abroad. Nine kings and lords, given what they asked for, have reached the end of the bargain. The Ministry notes that no complaint has been lodged by any of them. It further notes that this is the most reliable personnel arrangement in the history of the state.",
  },
  {
    id: "numenor",
    era: "Second Age",
    year: "S.A. 3262",
    title: "The Númenor Mission",
    text: "Ar-Pharazôn lands at Umbar with the greatest host of the age, and the Lord of this Land surrenders himself as a prisoner. Historians elsewhere call this a defeat. Within a few decades the captive is counsellor to the king, a great temple stands in Armenelos, and the faithful are being burned upon its altar.",
  },
  {
    id: "downfall",
    era: "Second Age",
    year: "S.A. 3319",
    title: "The Reduction of Númenor",
    text: "The king sails against the Undying Lands, and the island goes down beneath the sea with all but a few of its people. The Lord survives as a spirit and returns to Mordor, though the fair form he once wore is lost for ever. The state records the cost as acceptable. It was paid principally by Númenor.",
  },
  {
    id: "alliance",
    era: "Second Age",
    year: "S.A. 3441",
    title: "The Long Siege",
    text: "After seven years of siege Barad-dûr falls to the Last Alliance. On the slopes of Orodruin the Lord overthrows Gil-galad and Elendil and is overthrown with them, and Isildur cuts the Ring from his hand. The Ministry will say only this: the foundations stood, the Ring was not destroyed, and Isildur had it for two years.",
  },
  {
    id: "watch",
    era: "Third Age",
    year: "T.A. 1640",
    title: "The Vacating of the Watch",
    text: "Plague empties Gondor's cities and its fortresses, and within four years the watch upon Mordor is given up. The towers that shut this Land stand unmanned. The state did nothing to bring this about, and it was not required to. Patience has always been the most economical of its weapons. The enemy resigned his post of his own accord.",
  },
  {
    id: "minas-ithil",
    era: "Third Age",
    year: "T.A. 2002",
    title: "The Acquisition of Minas Ithil",
    text: "Returning to Mordor, the Nazgûl besiege the Tower of the Moon for two years and take it, and with it a palantír. Gondor renames its own city the Tower of Guard. The city we took is renamed also. The Ministry observes that both sides now agreed on what the war was about.",
  },
  {
    id: "uruks",
    era: "Third Age",
    year: "T.A. 2475",
    title: "The Uruks Enter Service",
    text: "A new breed of orc is fielded for the first time and overruns Ithilien. Osgiliath is taken and its stone bridge is broken, though Boromir of Gondor recovers the ruins for a time. The ruined city was never again worth what it once was. The Directorate's trial of the Uruks is judged a complete success.",
  },
  {
    id: "return",
    era: "Third Age",
    year: "T.A. 2951",
    title: "The Return to Government",
    text: "Having left Dol Guldur at a moment of his own choosing, the Lord is nine years returned to Mordor when he declares himself openly. The Dark Tower rises again on its surviving foundations. Three years later Orodruin bursts into flame, and the last people of Ithilien cross the Anduin. The state considers this an endorsement.",
  },
  {
    id: "hunt",
    era: "Third Age",
    year: "T.A. 3018",
    title: "The Northern Inquiry",
    text: "Word having been obtained from a creature named Gollum, the Nazgûl ride north to a country called the Shire, in search of a certain item. They arrive in September, days too late. Pursuit ends at the Ford of Bruinen, where river and horses part company with the Riders. The Ministry calls this a delay. It is the correct word.",
  },
  {
    id: "pelennor",
    era: "Third Age",
    year: "T.A. 3019, 15 March",
    title: "The Engagement on the Pelennor",
    text: "The armies of the Land break the great gate of Minas Tirith. The Lord of the Nazgûl falls on the field, and the host does not take the city in the time allotted. Reinforcements of the enemy arrive by river, in ships the Ministry had reason to think were ours. The inquiry into this matter has not reported.",
  },
  {
    id: "closure",
    era: "Third Age",
    year: "T.A. 3019, 25 March",
    title: "Entry Withheld",
    text: "The Ministry of Record has no statement to make concerning this date. Instructions from the Tower ceased at about the time the record ceased. Staff are reminded that nothing has been announced. Staff are reminded that the sky is not a source. This office continues to issue reminders. It has not been told to stop.",
  },
];
