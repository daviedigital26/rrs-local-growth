import { LABOR_COST_PER_HOUR, TARGET_GROSS_MARGIN, offers } from './offer-catalog.ts';
import type { HoursRange, Offer } from './types.ts';

const mid = (r: HoursRange) => (r.min + r.max) / 2;

export interface MarginResult {
  id: string;
  setupCost: number;
  setupMargin: number;
  monthlyCost: number;
  monthlyMargin: number;
  /** Revenue per delivery hour at midpoint hours. */
  setupRevenuePerHour: number;
  monthlyRevenuePerHour: number;
  flags: string[];
}

/** Illustrative unit economics. Every input is an ASSUMPTION documented in offer-catalog.ts. */
export function margins(o: Offer, rate = LABOR_COST_PER_HOUR, target = TARGET_GROSS_MARGIN): MarginResult {
  const setupCost = mid(o.hours.setup) * rate;
  const monthlyCost = mid(o.hours.monthly) * rate + o.cost.toolCostMonthly;
  const setupMargin = (o.price.setup - setupCost) / o.price.setup;
  const monthlyMargin = (o.price.monthly - monthlyCost) / o.price.monthly;
  const flags: string[] = [];
  if (setupMargin < target) flags.push(`Setup margin ${(setupMargin * 100).toFixed(0)}% < target ${(target * 100).toFixed(0)}%`);
  if (monthlyMargin < target) flags.push(`Monthly margin ${(monthlyMargin * 100).toFixed(0)}% < target ${(target * 100).toFixed(0)}%`);
  return {
    id: o.id,
    setupCost,
    setupMargin,
    monthlyCost,
    monthlyMargin,
    setupRevenuePerHour: o.price.setup / mid(o.hours.setup),
    monthlyRevenuePerHour: o.price.monthly / mid(o.hours.monthly),
    flags,
  };
}

/** Sum of the five focused programs vs. the flagship (spec: flagship replaces overlapping retainers). */
export function flagshipComparison() {
  const focused = offers.filter((o) => o.code !== 'F');
  const flagship = offers.find((o) => o.code === 'F')!;
  const monthlySum = focused.reduce((s, o) => s + o.price.monthly, 0);
  const setupSum = focused.reduce((s, o) => s + o.price.setup, 0);
  return { monthlySum, setupSum, flagshipMonthly: flagship.price.monthly, flagshipSetup: flagship.price.setup };
}
