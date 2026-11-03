export const DB_NAME = "healthfirst_local";

// bump when adding/removing stores or changing indexes
export const DB_VERSION = 13;

export const STORES = {
  dailyGoals: "dailyGoals",
  moodEntries: "moodEntries",

  weeklyGoals: "weeklyGoals",
  weeklyMeta: "weeklyMeta",

  monthlyGoals: "monthlyGoals",
  monthlyMeta: "monthlyMeta",

  yearlyGoals: "yearlyGoals",
  yearlyMeta: "yearlyMeta",

  habits: "habits",
  habitChecks: "habitChecks",

  selfCareItems: "selfCareItems",
  selfCareEntries: "selfCareEntries",

  affirmations: "affirmations",
  winEntries: "winEntries",

  letters: "letters",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];
