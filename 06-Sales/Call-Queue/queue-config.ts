/**
 * Call queue configuration: pipeline stages, call outcomes, follow-up cadence, calling window.
 * Browser-safe (bundled into the queue page). Every value here is a starting assumption the
 * owner can tune; the stage names follow the owner's PM Lead Scorer pipeline.
 */
export const STAGES = [
  { id: 'not_contacted', label: 'Not contacted', group: 'open' },
  { id: 'attempted', label: 'Attempted', group: 'open' },
  { id: 'contacted', label: 'Talked', group: 'open' },
  { id: 'audit_booked', label: 'Audit booked', group: 'pipeline' },
  { id: 'audit_delivered', label: 'Audit delivered', group: 'pipeline' },
  { id: 'build_sold', label: 'Build sold', group: 'won' },
  { id: 'retainer_active', label: 'Retainer active', group: 'won' },
  { id: 'declined', label: 'Declined', group: 'lost' },
  { id: 'do_not_contact', label: 'Do not contact', group: 'lost' },
] as const;
export type Stage = (typeof STAGES)[number]['id'];

/** Forward order for outcome-driven moves (a "no answer" never drags a booked deal backwards). */
export const STAGE_RANK: Record<Stage, number> = {
  not_contacted: 0, attempted: 1, contacted: 2, audit_booked: 3, audit_delivered: 4, build_sold: 5, retainer_active: 6, declined: -1, do_not_contact: -2,
};

export const OUTCOMES = [
  { id: 'no_answer', label: 'No answer', reached: false, stage: 'attempted', needs: null },
  { id: 'voicemail', label: 'Left voicemail', reached: false, stage: 'attempted', needs: null },
  { id: 'gatekeeper', label: 'Gatekeeper', reached: false, stage: 'attempted', needs: 'note' },
  { id: 'callback', label: 'Call back', reached: true, stage: 'contacted', needs: 'date' },
  { id: 'interested', label: 'Interested', reached: true, stage: 'contacted', needs: null },
  { id: 'audit_booked', label: 'Audit booked', reached: true, stage: 'audit_booked', needs: 'date_value' },
  { id: 'not_now', label: 'Not now', reached: true, stage: 'contacted', needs: 'permission' },
  { id: 'not_interested', label: 'Not interested', reached: true, stage: 'declined', needs: 'objection' },
  { id: 'wrong_number', label: 'Wrong number', reached: false, stage: null, needs: null },
  { id: 'do_not_call', label: 'Do not call', reached: true, stage: 'do_not_contact', needs: null },
] as const;
export type Outcome = (typeof OUTCOMES)[number]['id'];

export const OBJECTIONS = [
  { id: 'have_system', label: 'Already have a system' },
  { id: 'no_budget', label: 'No budget' },
  { id: 'send_info', label: 'Send me info' },
  { id: 'too_busy', label: 'Too busy' },
  { id: 'happy', label: 'Happy as is' },
  { id: 'who_are_you', label: 'Who is this?' },
] as const;
export type ObjectionId = (typeof OBJECTIONS)[number]['id'];

export const CHANNELS = ['phone', 'email', 'text'] as const;
export type Channel = (typeof CHANNELS)[number];

export const QUEUE_CONFIG = {
  version: 'queue-2026.11-1',
  /** Business days until the next try after unreached attempt 1, 2, 3, 4. */
  cadenceDays: [1, 2, 3, 5],
  /** Unreached attempts in a row before a lead is parked (out of the queue until reopened). */
  maxAttempts: 5,
  interestedFollowUpDays: 2,
  /** "Not now" with permission: check back after this many days. */
  notNowDays: 90,
  dailyGoal: 20,
  /** Local time of the business. A courtesy window, not a legal rule. */
  callWindow: { startHour: 8, endHour: 17, weekdays: [1, 2, 3, 4, 5] },
  ownerTimeZone: 'America/Phoenix',
  timeZones: {
    AZ: 'America/Phoenix', CA: 'America/Los_Angeles', NV: 'America/Los_Angeles', OR: 'America/Los_Angeles', WA: 'America/Los_Angeles',
    UT: 'America/Denver', CO: 'America/Denver', NM: 'America/Denver', ID: 'America/Boise', TX: 'America/Chicago',
  } as Record<string, string>,
  /** Stages whose deal value counts as pipeline / closed. */
  pipelineStages: ['contacted', 'audit_booked', 'audit_delivered'] as Stage[],
  closedStages: ['build_sold', 'retainer_active'] as Stage[],
};
export type QueueConfig = typeof QUEUE_CONFIG;

export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;
export const outcomeDef = (o: Outcome) => OUTCOMES.find((x) => x.id === o)!;
