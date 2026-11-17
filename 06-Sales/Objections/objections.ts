/**
 * Objection library for the call queue: a short, honest reply and the next step for each.
 * Browser-safe. No pressure tactics, no invented facts; every "no" is respected.
 */
import type { ObjectionId } from '../Call-Queue/queue-config.ts';

export interface ObjectionReply { id: ObjectionId; heard: string; reply: (ask: 'snapshot' | 'audit') => string; next: string }

export const OBJECTION_REPLIES: ObjectionReply[] = [
  { id: 'have_system', heard: '“We already have a system for that.”', reply: () => 'That makes sense; most teams do. Out of curiosity, what happens to a call that comes in after hours? If that’s covered, I’ll leave you alone.', next: 'If covered: thank them, log Not interested. If not: back to the bridge.' },
  { id: 'no_budget', heard: '“There’s no budget for this.”', reply: (ask) => ask === 'audit' ? 'Understood. That’s why it starts small: the audit tells you what’s worth fixing before anyone spends real money. Is it the timing or the amount?' : 'Understood. The Snapshot is free and you keep it either way. It’s a list of what’s worth fixing, in order.', next: 'If still no: Not now, ask permission to check back.' },
  { id: 'send_info', heard: '“Just send me some info.”', reply: () => 'Happy to. What’s the best email, and what’s the one thing you’d want it to answer?', next: 'Log Interested, set the channel to email, send the first email today.' },
  { id: 'too_busy', heard: '“I’m too busy right now.”', reply: () => 'Totally fair. When’s a better 10 minutes this week? I’ll put it in my calendar and call you then.', next: 'Log Call back with the date they give.' },
  { id: 'happy', heard: '“We’re happy with how things are.”', reply: () => 'Good to hear. Thanks for the straight answer. Mind if I check back in a few months, in case anything changes?', next: 'Log Not now: permission yes or no.' },
  { id: 'who_are_you', heard: '“Who is this? How did you get my number?”', reply: () => 'Fair question. I found your business’s public listing. We help local businesses turn more of their calls and inquiries into booked work. If you’d rather I didn’t call again, I’ll make a note right now.', next: 'If they ask not to be called: log Do not call.' },
];

export const objectionReply = (id: ObjectionId) => OBJECTION_REPLIES.find((o) => o.id === id)!;
