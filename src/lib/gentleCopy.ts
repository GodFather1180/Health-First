const MESSAGES = [
  "Small steps still count.",
  "You don’t need to do it perfectly to make progress.",
  "Show up for yourself today, even a little.",
  "One healthy choice is enough for today.",
  "Effort matters. Rest matters too — sleep is part of the plan.",
  "You’ve handled hard days before. You can handle this one.",
  "Progress over perfection.",
  "Keep going — you’re doing better than you think.",
  "Mistakes are how we learn and grow.",
  "You are worthy, no matter what today looks like.",
  "Be kind to yourself today.",
  "Your health comes first.",
];

export function groundingMessage(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return MESSAGES[hash % MESSAGES.length];
}
