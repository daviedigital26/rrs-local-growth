/**
 * Lead payload contract for the Snapshot and contact forms → n8n webhook → CRM.
 * Mirrors the field names used in the HTML forms and public/js/site.js.
 * No passwords or credentials are ever collected.
 */
export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  first_touch_at?: string; // ISO
}

/** Spam signals the server re-checks (05-Lead-Research/intake/lead-intake.ts). */
export interface SpamSignals {
  form_started_at?: string; // ISO, set on first interaction
  company_website?: string; // honeypot: must be empty
}

export interface SnapshotRequestPayload extends SpamSignals {
  form: 'snapshot_request';
  submitted_at: string; // ISO
  interest?: string; // offer id from ?interest= links
  business_name: string;
  website?: string; // optional: "no website" is valid
  city: string;
  industry: string;
  concerns: string[];
  /** Owner self-check answers: criterionId → tier (0–1) or "not_verified". */
  self_check: Record<string, number | 'not_verified'>;
  contact_name: string;
  email: string;
  phone?: string;
  preferred_channel: 'email' | 'phone' | 'text';
  consent_contact: true;
  consent_sms: boolean; // only true if the visitor ticked the separate SMS consent box
  consent_text: string; // exact wording shown, stored with the record
  attribution: Attribution;
}

export interface ContactPayload extends SpamSignals {
  form: 'contact';
  submitted_at: string;
  contact_name: string;
  business_name?: string;
  email: string;
  phone?: string;
  topic: string;
  message: string;
  consent_contact: true;
  consent_text: string;
  attribution: Attribution;
}

export const CONSENT_CONTACT =
  'I agree that Reale Revenue Systems may contact me about this request by email or phone. I can opt out at any time.';
export const CONSENT_SMS =
  'Text me about my Snapshot. Message and data rates may apply. Reply STOP to opt out. Consent is not a condition of any purchase.';
