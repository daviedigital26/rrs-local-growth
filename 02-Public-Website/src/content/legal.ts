/**
 * LEGAL DRAFTS. Every page renders a visible "Draft, pending legal review" banner.
 * These must be reviewed by a qualified attorney before the site is published.
 */
export interface LegalDoc {
  slug: 'privacy' | 'terms' | 'accessibility';
  title: string;
  description: string;
  sections: Array<{ h: string; p: string[] }>;
}

const updated = 'Draft prepared November 2026';

export const legalDocs: LegalDoc[] = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description: 'How Reale Revenue Systems collects, uses and protects information submitted through this website.',
    sections: [
      { h: 'Status', p: [`${updated}. This policy is a draft and has not yet been reviewed by an attorney.`] },
      { h: 'Who we are', p: ['Reale Revenue Systems is the client-facing company of Reale Labs. We help local businesses with visibility, reputation, website conversion and lead follow-up.'] },
      { h: 'What we collect', p: ['Information you submit in our forms: your name, business name, website, city, industry, email, phone (optional), contact preferences, your answers to optional questions, and your message.', 'Basic attribution data that helps us understand how you found us: campaign parameters in the link you used (such as utm_source), the referring page and the page where you arrived.', 'We never ask for passwords. When clients grant us access to their accounts, they use delegated user access that they can remove at any time.'] },
      { h: 'How we use it', p: ['To prepare and send the Snapshot or reply to your request, to follow up about it, and to improve our services.', 'We do not sell personal information.', 'We send text messages only if you separately opt in to them. Reply STOP to opt out.'] },
      { h: 'Analytics and cookies', p: ['This site does not load third-party analytics unless configured. If we enable analytics, we will update this policy, use privacy-respecting settings, and ask for consent where required.'] },
      { h: 'Sharing', p: ['We use service providers to operate our forms, email and customer records. They process data only on our instructions. We may disclose information if required by law.'] },
      { h: 'Retention and security', p: ['We keep request data only as long as needed for the purposes above or as required by law, and protect it with access controls. No method of transmission or storage is perfectly secure.'] },
      { h: 'Your choices', p: ['You can ask us to access, correct or delete your information, or to stop contacting you, using the contact details on our Contact page.'] },
      { h: 'Children', p: ['This site is intended for business owners and is not directed to children under 13.'] },
      { h: 'Changes', p: ['We will post updates on this page with a revised date.'] },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    description: 'Terms that apply to using the Reale Revenue Systems website and its free Snapshot.',
    sections: [
      { h: 'Status', p: [`${updated}. These terms are a draft and have not yet been reviewed by an attorney.`] },
      { h: 'Using this site', p: ['You may use this website to learn about our services and request a Snapshot or consultation. Don’t misuse the site, interfere with its operation or submit information you don’t have the right to share.'] },
      { h: 'The free Snapshot', p: ['The Snapshot is an informational assessment based on publicly observable information and any details you choose to provide, checked on the dates shown. Items we could not verify are labelled as such. It is not a guarantee of results.', 'Example reports and illustrations on this site use fictional businesses and are clearly labelled.'] },
      { h: 'No guarantees', p: ['We do not guarantee search rankings, placement in AI-generated answers, review volumes, leads or revenue. Paid services are governed by a separate written agreement.'] },
      { h: 'Intellectual property', p: ['Site content, design and the Snapshot methodology belong to Reale Revenue Systems / Reale Labs unless stated otherwise.'] },
      { h: 'Limitation of liability', p: ['To the extent permitted by law, the site and Snapshot are provided “as is” without warranties. [Attorney to complete the limitation and governing-law language for Arizona.]'] },
      { h: 'Contact', p: ['Questions about these terms can be sent through our Contact page.'] },
    ],
  },
  {
    slug: 'accessibility',
    title: 'Accessibility Statement',
    description: 'Our commitment to an accessible website, the WCAG 2.2 AA standard we build to, and how to report any barrier you find.',
    sections: [
      { h: 'Status', p: [`${updated}. This statement is a draft pending review.`] },
      { h: 'Our goal', p: ['We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA across this website.'] },
      { h: 'What we do', p: ['Tested colour contrast for all text and interface colours, keyboard-accessible navigation with visible focus, a skip-to-content link, semantic headings and landmarks, labelled form fields with clear error messages, reduced motion when your device requests it, and pages that work without JavaScript.'] },
      { h: 'Known limitations', p: ['We have not yet completed a full audit with assistive-technology users. Some decorative illustrations are simplified for screen readers.'] },
      { h: 'Feedback', p: ['If you find a barrier, please tell us through the Contact page and we will work to fix it.'] },
    ],
  },
];
