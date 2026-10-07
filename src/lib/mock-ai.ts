import type { ActionItem, EmailResult, MeetingResult } from "./types";

/** Realistic offline responses so every feature can be demonstrated without an AI key. */
export function mockEmail(purpose: string, tone: string, recipient?: string): EmailResult {
  const topic = purpose.trim().replace(/\.$/, "");
  const short = topic.length > 60 ? topic.slice(0, 57) + "…" : topic;
  const greet = recipient ? recipient : tone === "Friendly" ? "there" : "Sir/Madam";
  const openers: Record<string, string> = {
    Formal: `Dear ${greet},\n\nI hope this message finds you well. I am writing regarding the following matter: ${topic}.`,
    Friendly: `Hi ${greet},\n\nHope you're having a great week! I wanted to reach out about something: ${topic}.`,
    Persuasive: `Dear ${greet},\n\nI'd like to share an opportunity I believe is well worth your attention: ${topic}.`,
  };
  const middles: Record<string, string> = {
    Formal:
      "I would be grateful if you could review this at your earliest convenience. Please let me know if any further information or documentation is required from my side.",
    Friendly:
      "Let me know what you think whenever you get a chance — happy to jump on a quick call if that's easier.",
    Persuasive:
      "Acting on this now would save time, reduce effort later, and deliver clear value. I'm confident it is the right next step, and I'd be glad to walk you through the details.",
  };
  const closers: Record<string, string> = {
    Formal: "Thank you for your time and consideration.\n\nKind regards,\n[Your Name]",
    Friendly: "Thanks so much!\n\nCheers,\n[Your Name]",
    Persuasive: "Could we schedule 15 minutes this week to move forward?\n\nBest regards,\n[Your Name]",
  };
  const subj: Record<string, string> = {
    Formal: `Regarding: ${short}`,
    Friendly: `Quick note about ${short}`,
    Persuasive: `Let's move forward: ${short}`,
  };
  const t = (openers[tone] ? tone : "Formal") as "Formal";
  return {
    subject: subj[t].charAt(0).toUpperCase() + subj[t].slice(1),
    body: `${openers[t]}\n\n${middles[t]}\n\n${closers[t]}`,
    source: "mock",
  };
}

const DATE_RE =
  /\b(today|tomorrow|tonight|(?:next |this )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|end of (?:day|week|month)|eow|eod|\d{1,2}(?:st|nd|rd|th)? (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;

export function mockMeeting(notes: string): MeetingResult {
  const sentences = notes
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((s) => s.length > 3);

  const actionItems: ActionItem[] = [];
  const decisions: string[] = [];
  const keyPoints: string[] = [];
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (/\b(decided|agreed|approved|will go with|decision)\b/.test(lower)) {
      decisions.push(s);
      continue;
    }
    if (/\b(will|to do|todo|action|needs? to|should|must|assigned|follow up)\b/.test(lower)) {
      const ownerMatch = s.match(/^([A-Z][a-z]+)(?:\s(?:will|to|needs?|should|must|is going))/) ||
        s.match(/assigned to ([A-Z][a-z]+)/) || s.match(/^([A-Z][a-z]+):/);
      const dateMatch = s.match(DATE_RE);
      actionItems.push({ task: s, owner: ownerMatch?.[1] ?? null, deadline: dateMatch ? dateMatch[0] : null });
      continue;
    }
    keyPoints.push(s);
  }
  const summarySrc = keyPoints.length ? keyPoints : sentences;
  return {
    summary:
      summarySrc.slice(0, 2).join(" ") +
      (actionItems.length ? ` The meeting produced ${actionItems.length} action item${actionItems.length > 1 ? "s" : ""}.` : ""),
    keyPoints: keyPoints.slice(0, 6),
    decisions,
    actionItems,
    deadlines: actionItems.filter((a) => a.deadline).map((a) => ({ item: a.task, date: a.deadline! })),
    source: "mock",
  };
}
