import { ArrowLeft, FileText, ShieldAlert } from "lucide-react";

type TermsOfServicePageProps = {
  onBack: () => void;
};

type TermsSection = {
  title: string;
  body: string[];
};

const sections: TermsSection[] = [
  {
    title: "1. Agreement to these terms",
    body: [
      "These Terms of Service (“Terms”) govern your access to and use of Asset Oracle, including its website, interface, smart-contract integrations, and related features (the “Platform”). By accessing or using the Platform, connecting a wallet, or signing in, you agree to these Terms. If you do not agree, do not use the Platform.",
      "If you use the Platform on behalf of an organization, you confirm that you have authority to bind it to these Terms.",
    ],
  },
  {
    title: "2. About Asset Oracle",
    body: [
      "Asset Oracle is a developing platform for exploring prediction markets and the evidence used to verify real-world outcomes. Features, market availability, supported networks, and integrations may change as the platform evolves.",
      "Asset Oracle is a software interface. Unless a page expressly states otherwise, it is not a bank, broker, exchange, custodian, investment adviser, or escrow agent.",
    ],
  },
  {
    title: "3. Development and testnet status",
    body: [
      "Unless a page clearly states otherwise, the Platform is provided for testing, evaluation, and development. Testnet assets may have no monetary value, and testnet balances, markets, and history may be reset or removed at any time without notice.",
      "Testnet activity is not a promise that a feature, market, token, or network will be available on mainnet, nor a promise of any future reward, allocation, or benefit.",
    ],
  },
  {
    title: "4. Eligibility",
    body: [
      "You must be at least 18 years old, or the age of majority where you live if higher, and have the legal capacity to enter into these Terms.",
      "You may not use the Platform if you are barred from doing so by applicable law, if you are subject to economic or trade sanctions, or if you are located in or ordinarily resident in a jurisdiction where prediction markets, digital assets, or similar activity is prohibited or requires a licence we do not hold. We may restrict access by region, wallet, or account at our discretion, including through technical measures.",
      "You are solely responsible for determining whether your use of the Platform is lawful where you live, including any tax, reporting, and licensing obligations.",
    ],
  },
  {
    title: "5. Accounts, wallets, and security",
    body: [
      "Asset Oracle does not take custody of your assets and does not control your wallet or private keys. If email or social sign-in is offered, it is provided for convenience and does not make us a custodian of any funds.",
      "You are responsible for your wallet, devices, credentials, and all activity under them. Check transaction details, network selection, contract and token addresses, fees, and every message you sign before approving it. Never share your seed phrase or private keys with anyone, including anyone claiming to represent Asset Oracle. We cannot recover lost keys or reverse transactions.",
    ],
  },
  {
    title: "6. Blockchain transactions",
    body: [
      "Transactions are processed by third-party blockchain networks, not by Asset Oracle. They may be public, irreversible, delayed, reordered, or fail, and may require network fees that we do not control or refund.",
      "Smart contracts may contain bugs or vulnerabilities despite review or testing. Networks may experience congestion, forks, outages, or attacks. You accept these risks when you interact with on-chain features.",
    ],
  },
  {
    title: "7. Markets, data, and resolution",
    body: [
      "Market descriptions, data feeds, third-party sources, and displayed statistics may be delayed, incomplete, or incorrect. Read each market’s resolution rules, deadlines, and designated evidence sources before taking any action.",
      "Outcomes are determined according to the resolution process stated for the relevant market. Resolution may involve evidence submitted by third parties, automated checks, or human review, and may be disputed, delayed, or deemed inconclusive. We do not guarantee that a data provider will remain available, that every market will resolve, or that every dispute can be resolved to your satisfaction.",
      "Where a market is cancelled, invalidated, or cannot be resolved, the outcome will follow the rules stated for that market or the relevant smart contract, which may result in a refund, partial refund, or no recovery.",
    ],
  },
  {
    title: "8. Proposals and user submissions",
    body: [
      "Where the Platform lets you propose markets or submit evidence, comments, or other content, you are responsible for it. You confirm that it is accurate to the best of your knowledge, lawful, and does not infringe anyone’s rights.",
      "We may review, edit, reject, expire, remove, or decline to list any proposal or submission for any reason, including legal, safety, quality, or integrity concerns. You grant us a non-exclusive, worldwide, royalty-free licence to host, display, and use your submissions to operate and improve the Platform.",
    ],
  },
  {
    title: "9. Acceptable use",
    body: [
      "You agree not to: break any law or regulation; manipulate markets or resolution outcomes; submit false, misleading, or fabricated evidence; trade or act on material non-public information you are prohibited from using; operate multiple accounts or wallets to abuse referrals, rewards, or limits; attempt to bypass geographic or access restrictions; launder funds or finance unlawful activity; harass, defraud, or exploit other users; or interfere with, probe, overload, scrape in a disruptive way, or attack the Platform, its contracts, or its infrastructure.",
      "You must not use the Platform to create markets that encourage or reward harm to any person, or that concern private individuals’ personal information.",
    ],
  },
  {
    title: "10. Referrals and rewards",
    body: [
      "Any referral programme, reward, point, or incentive we offer is discretionary, may have eligibility conditions, and may be changed, paused, or ended at any time. Unless expressly stated in writing, it has no cash value and creates no right to any token, payment, or future benefit. We may withhold or reverse rewards where we reasonably suspect abuse, fraud, or a breach of these Terms.",
    ],
  },
  {
    title: "11. Fees and taxes",
    body: [
      "Network fees and any Platform or market fees are shown or described before you confirm an action where practicable. Fees can change. You are responsible for all taxes arising from your activity, and we do not provide tax advice or withhold taxes on your behalf.",
    ],
  },
  {
    title: "12. No financial, legal, or tax advice",
    body: [
      "Platform content is provided for general information and does not constitute financial, investment, legal, or tax advice, or a recommendation to buy, sell, stake, trade, or hold any asset or to take any position in any market. Prediction markets involve substantial risk, and you may lose all amounts you commit. Only participate with amounts you can afford to lose. You are responsible for your own decisions and for obtaining independent professional advice where appropriate.",
    ],
  },
  {
    title: "13. Third-party services",
    body: [
      "The Platform may rely on or link to third-party wallets, blockchain networks, data providers, explorers, identity or sign-in providers, hosting services, and websites. They operate independently and may have separate terms, risks, outages, or privacy practices. Asset Oracle does not control or endorse them and is not responsible for their availability, accuracy, or conduct.",
    ],
  },
  {
    title: "14. Intellectual property",
    body: [
      "The Platform, including its design, branding, text, graphics, and original code (excluding open-source components, which are governed by their own licences, and your submissions), is owned by or licensed to Asset Oracle and protected by applicable intellectual property laws. Subject to these Terms, you may use the Platform for your personal, lawful use. You may not copy, sell, or exploit our branding or content except as permitted by law or in writing.",
    ],
  },
  {
    title: "15. Availability and changes",
    body: [
      "We may modify, suspend, restrict, or discontinue any feature, market, network, or part of the Platform for maintenance, security, compliance, or development reasons, with or without notice. We do not guarantee uninterrupted access, error-free operation, or that displayed information will always be current. On-chain positions and contracts may remain accessible independently of the interface, but we have no obligation to maintain an interface for them.",
    ],
  },
  {
    title: "16. Suspension and termination",
    body: [
      "We may suspend or terminate your access to the Platform at any time, including if we reasonably believe you have breached these Terms, created risk or legal exposure for us or others, or are required to do so by law. You may stop using the Platform at any time. Sections that by their nature should survive termination will continue to apply, including sections on risk, disclaimers, liability, indemnity, and disputes.",
    ],
  },
  {
    title: "17. Disclaimers",
    body: [
      "To the maximum extent permitted by applicable law, the Platform is provided on an “as is” and “as available” basis, without warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, accuracy, non-infringement, and uninterrupted or secure operation.",
    ],
  },
  {
    title: "18. Limitation of liability",
    body: [
      "To the maximum extent permitted by law, Asset Oracle and its contributors are not liable for indirect, incidental, special, consequential, or punitive losses, or for lost profits, lost data, wallet compromise, network failures, smart-contract failures, market outcomes, or losses arising from reliance on data, resolutions, or third-party services.",
      "To the extent liability cannot be excluded, our total aggregate liability to you for all claims relating to the Platform is limited to the greater of the amount you paid us directly for using the Platform in the 12 months before the claim arose, or US$100. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited, including for fraud or for death or personal injury caused by negligence, and some jurisdictions do not allow certain limits, so parts of this section may not apply to you.",
    ],
  },
  {
    title: "19. Indemnity",
    body: [
      "To the extent permitted by law, you agree to indemnify and hold harmless Asset Oracle and its contributors from claims, losses, and reasonable costs arising from your breach of these Terms, your misuse of the Platform, your submissions, or your violation of law or third-party rights.",
    ],
  },
  {
    title: "20. Privacy",
    body: [
      "Public blockchain addresses and transactions may be visible to anyone and cannot be erased by us. Do not submit confidential or sensitive personal information through public transactions, proposals, or messages. We may process limited technical and account information, such as device data, sign-in details, and usage logs, to operate, secure, and improve the Platform and to prevent abuse. Personal information handling will be described in a separate privacy notice when one is published, and that notice will apply alongside these Terms.",
    ],
  },
  {
    title: "21. Governing law and disputes",
    body: [
      "Governing law, venue, and any dispute-resolution procedure will be specified here once the operating entity and primary jurisdiction are established. Until then, we encourage you to contact us first to try to resolve any concern informally. Nothing in these Terms limits mandatory consumer-protection rights or legal remedies you may have under the laws where you live.",
    ],
  },
  {
    title: "22. General",
    body: [
      "These Terms are the entire agreement between you and Asset Oracle about the Platform and replace earlier versions. If a provision is found unenforceable, the rest remains in effect. Our failure to enforce a provision is not a waiver of it. You may not assign these Terms without our consent; we may assign them in connection with a reorganization or transfer of the Platform. Nothing in these Terms creates a partnership, agency, employment, or fiduciary relationship.",
    ],
  },
  {
    title: "23. Updates and contact",
    body: [
      "We may update these Terms as the Platform develops, for example when features, networks, or legal requirements change. The latest version published on this page applies from its stated effective date, and we will update the version and date shown above. If you continue to use the Platform after the effective date, you accept the updated Terms. For material changes, we will try to give reasonable notice through the Platform or official channels.",
      "For questions about these Terms, contact the Asset Oracle team through its official community channels.",
    ],
  },
];

export default function TermsOfServicePage({ onBack }: TermsOfServicePageProps) {
  return (
    <section className="page-section terms-page">
      <div className="terms-hero">
        <div className="terms-hero-icon"><FileText size={25} aria-hidden="true" /></div>
        <span className="eyebrow">ASSET ORACLE · PLATFORM POLICIES</span>
        <h1>Terms of Service</h1>
        <p>Please read these terms before using Asset Oracle. They explain the current development status, wallet and account responsibilities, data and resolution limitations, acceptable use, and key risks of using the platform.</p>
        <div className="terms-meta"><span>Effective date: 22 October 2026</span><span>Version 1.1 · Development phase</span></div>
      </div>

      <div className="terms-notice" role="note">
        <ShieldAlert size={20} aria-hidden="true" />
        <p><strong>Important:</strong> This is a practical draft for the current testnet-development phase, not legal advice. Have a qualified lawyer review it and align it with the final product, operating entity, applicable jurisdictions, privacy notice, and any real-money features before launch.</p>
      </div>

      <div className="terms-content">
        {sections.map((section) => (
          <article className="terms-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </div>

      <div className="terms-bottom-actions">
        <button className="text-action" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to home</button>
        <span>Asset Oracle · Real-world truth, on-chain.</span>
      </div>
    </section>
  );
}
