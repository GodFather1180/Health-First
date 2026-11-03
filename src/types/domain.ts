export type DailyGoalStatus = "DONE" | "PARTIAL" | "SKIPPED";

export type DailyGoal = {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  status: DailyGoalStatus;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Mood = "SHIT" | "BAD" | "MEH" | "GOOD" | "SLAYING";

export type MoodEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  mood: Mood;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type WeeklyGoalStatus = "DONE" | "PARTIAL" | "SKIPPED";

export type WeeklyGoal = {
  id: string;
  weekKey: string; // Monday YYYY-MM-DD
  text: string;
  status: WeeklyGoalStatus;

  isMain: boolean; // ⭐ weekly priority/main

  carriedFromWeekKey?: string; // if rolled over
  createdAt: string;
  updatedAt: string;
};


export type WeeklyMeta = {
  weekKey: string; // keyPath
  focusNote?: string;
  updatedAt: string;
};


export type MonthlyGoalStatus = "DONE" | "PARTIAL" | "SKIPPED";

export type MonthlyGoal = {
  id: string;
  monthKey: string; // YYYY-MM
  text: string;
  status: MonthlyGoalStatus;
  isMain: boolean; // ⭐ up to 10 per month
  createdAt: string;
  updatedAt: string;
};

export type MonthlyMeta = {
  monthKey: string; // keyPath
  reflectionWentWell?: string;
  reflectionWasHard?: string;
  reflectionChangeNext?: string;
  updatedAt: string;
};

export type YearlyGoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "PAUSED";

export type YearlyGoal = {
  id: string;
  yearKey: string; // YYYY
  text: string;
  status: YearlyGoalStatus;
  isMain: boolean; // ⭐ up to 10 per year
  createdAt: string;
  updatedAt: string;
};

export type YearlyMeta = {
  yearKey: string; // keyPath
  focusNote?: string;
  updatedAt: string;
};

export type HabitStatus = "DONE" | "PARTIAL" | "SKIPPED";

export type Habit = {
  id: string;
  name: string;
  order: number;
  active: boolean;
  createdAt: number;
};

export type HabitCheck = {
  id: string;
  habitId: string;
  dateKey: string;      // "YYYY-MM-DD"
  status: HabitStatus;  // DONE | PARTIAL | SKIPPED
  updatedAt: number;
};

export type LetterSection = "LOW" | "FUTURE" | "NEW_YEAR" | "GENERAL";

export type Letter = {
  id: string;
  section: LetterSection;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
