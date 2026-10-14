import { ArrowLeft, FileText, ShieldAlert } from "lucide-react";

type TermsOfServicePageProps = {
  onBack: () => void;
};

const sections = [
  {
    title: "1. About Asset Oracle",
    body: "Asset Oracle is a developing platform for exploring prediction markets and the evidence used to verify outcomes. Features, market availability, supported networks, and integrations may change as the platform evolves.",
  },
  {
    title: "2. Development and testnet status",
    body: "Unless a page clearly states otherwise, the platform is provided for testing, evaluation, and development. Testnet assets may have no monetary value. Testnet activity is not a promise that a feature, market, token, or network will be available on mainnet.",
  },
  {
    title: "3. Eligibility and your responsibilities",
    body: "You are responsible for ensuring that your access to and use of the platform is lawful where you live. You must provide accurate information when requested, protect your wallet and signing devices, and not use the platform to break laws, interfere with services, manipulate markets, or exploit other users.",
  },
  {
    title: "4. Wallets and blockchain transactions",
    body: "Asset Oracle does not control your wallet or private keys. You are responsible for checking transaction details, network selection, token addresses, fees, and the messages you sign. Blockchain transactions may be public, irreversible, delayed, or fail. Never share your seed phrase or private keys with anyone.",
  },
  {
    title: "5. Markets, data, and resolution",
    body: "Market descriptions, data feeds, third-party sources, and displayed statistics may be delayed, incomplete, or incorrect. Resolution rules and the designated evidence sources for each market should be reviewed before taking any action. The platform does not guarantee that a data provider will remain available or that every dispute can be resolved.",
  },
  {
    title: "6. No financial, legal, or tax advice",
    body: "Platform content is provided for general information and does not constitute financial, investment, legal, or tax advice, or a recommendation to buy, sell, stake, or hold any asset. You are responsible for your own decisions and for obtaining independent professional advice where appropriate.",
  },
  {
    title: "7. Third-party services",
    body: "The platform may rely on third-party wallets, blockchain networks, data providers, explorers, hosting services, and links. Those services operate independently and may have separate terms, risks, outages, or privacy practices. Asset Oracle does not control their availability or policies.",
  },
  {
    title: "8. Availability and changes",
    body: "We may modify, suspend, or discontinue any feature, market, or part of the platform for maintenance, security, compliance, or development reasons. We do not guarantee uninterrupted access, error-free operation, or that displayed information will always be current.",
  },
  {
    title: "9. Disclaimers and limitation of liability",
    body: "To the maximum extent permitted by applicable law, the platform is provided on an “as is” and “as available” basis, without warranties of any kind. To the maximum extent permitted by law, Asset Oracle is not liable for indirect or consequential losses, lost profits, lost data, wallet compromise, network failures, or losses arising from reliance on data or third-party services. Nothing in these terms excludes liability that cannot lawfully be excluded.",
  },
  {
    title: "10. Privacy",
    body: "Public blockchain addresses and transactions may be visible to anyone. Do not submit confidential information through public transactions or messages. Any personal information handled by the platform should be described in a separate privacy notice when one is published.",
  },
  {
    title: "11. Updates and contact",
    body: "These terms may be updated as the platform develops. The latest version published on this page applies from its stated effective date. For questions about these terms, contact the Asset Oracle team through its official community channels.",
  },
];

export default function TermsOfServicePage({ onBack }: TermsOfServicePageProps) {
  return (
    <section className="page-section terms-page">
      <div className="terms-hero">
        <div className="terms-hero-icon"><FileText size={25} aria-hidden="true" /></div>
        <span className="eyebrow">ASSET ORACLE · PLATFORM POLICIES</span>
        <h1>Terms of Service</h1>
        <p>Please read these terms before using Asset Oracle. They explain the current development status, wallet responsibilities, data limitations, and key risks of using the platform.</p>
        <div className="terms-meta"><span>Effective date: 14 October 2026</span><span>Version 1.0 · Development phase</span></div>
      </div>

      <div className="terms-notice" role="note">
        <ShieldAlert size={20} aria-hidden="true" />
        <p><strong>Important:</strong> This is a practical draft for the current testnet-development phase, not legal advice. Have a qualified lawyer review it and align it with the final product, operating entity, applicable jurisdictions, privacy notice, and any real-money features before launch.</p>
      </div>

      <div className="terms-content">
        {sections.map((section) => (
          <article className="terms-section" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
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
