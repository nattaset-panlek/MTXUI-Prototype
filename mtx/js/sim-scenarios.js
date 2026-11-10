/* Random Event scenarios (DRAFT for the prototype, written by hand; replace with the design sheet when it exists).
   A Simulate day "Random Event" rolls one scenario first, then the player picks one card from that scenario's set.
   cards = Event IDs from window.MTX_SIM_DATA.events (source/UltimateFightStatus_Sheets/31_Random Event.csv);
   every event belongs to exactly one scenario. weight = roll weight of the scenario (equal for now).
   The Collection's Random Event tab lists these scenarios as groups; a scenario unlocks once it has come up. */
window.MTX_SIM_SCENARIOS = [
  {
    id: "SCN_01", name: "Money Is Tight", weight: 1,
    desc: "Rent is due and the gym account is almost empty. Something has to give this week.",
    cards: ["EVN_186", "EVN_188", "EVN_114", "EVN_117"]
  },
  {
    id: "SCN_02", name: "Trouble at the Gym", weight: 1,
    desc: "Something at the gym went wrong overnight. Pick which problem you deal with first.",
    cards: ["EVN_38", "EVN_46", "EVN_123"]
  },
  {
    id: "SCN_03", name: "The Neighbourhood", weight: 1,
    desc: "The people living around the gym have opinions about it, good and bad.",
    cards: ["EVN_36", "EVN_74", "EVN_105", "EVN_193"]
  },
  {
    id: "SCN_04", name: "Building a Name", weight: 1,
    desc: "Word about the gym is starting to spread. Decide how to use the attention.",
    cards: ["EVN_41", "EVN_44", "EVN_195"]
  },
  {
    id: "SCN_05", name: "Running the Camp", weight: 1,
    desc: "A hard week of training lies ahead. Choose how the camp gets through it.",
    cards: ["EVN_107", "EVN_76", "EVN_45"]
  },
  {
    id: "SCN_06", name: "Strange Encounters", weight: 1,
    desc: "Odd things keep turning up around the gym. Some are lucky, some are not.",
    cards: ["EVN_47", "EVN_103", "EVN_110", "EVN_122"]
  }
];
