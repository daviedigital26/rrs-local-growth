/** Fictional sample Snapshot, scored by the real engine at build time. */
import sample from '../../../17-Sample-Clients/fictional-hvac-snapshot.json' with { type: 'json' };
import { scoreSnapshot, type SnapshotInput } from '../../../04-Audits-and-Scorecards/snapshot/engine.ts';

export const sampleData = sample as unknown as {
  _notice: string;
  input: SnapshotInput;
  competitors: Array<{ name: string; reviews: number; rating: number; schema: boolean; mobileCta: boolean }>;
  immediateOpportunities: Array<{ category: string; action: string; effort: string }>;
  scenarioInputs: { monthlyInquiries: number; closeRate: number; averageJobValue: number };
};

if (!sampleData.input.business.fictional) throw new Error('Sample report must be marked fictional');

export const sampleResult = scoreSnapshot(sampleData.input);
