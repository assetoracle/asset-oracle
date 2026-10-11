import {
  CircleHelp,
  History,
  WalletCards,
} from "lucide-react";

type AccountPageProps = {
  page: "Claims" | "History";
  walletConnected: boolean;
  onConnect: () => void;
  onExploreMarkets: () => void;
};

const accountPageInfo = {
  Claims: {
    eyebrow: "YOUR REWARDS",
    title: "Claims",
    description:
      "Track eligible winnings and refunds after verified market settlement.",
    icon: WalletCards,
    cards: [
      ["Claimable rewards", "Awaiting settlement data"],
      ["Completed claims", "Awaiting transaction history"],
      ["Refunds", "Awaiting contract data"],
    ],
  },
  History: {
    eyebrow: "YOUR RECORDS",
    title: "History",
    description:
      "Review predictions, outcomes, settlement events, and refunds.",
    icon: History,
    cards: [
      ["Predictions", "No records loaded"],
      ["Settlements", "No records loaded"],
      ["Transactions", "No records loaded"],
    ],
  },
} as const;

export default function AccountPage({
  page,
  walletConnected,
  onConnect,
  onExploreMarkets,
}: AccountPageProps) {
  const info = accountPageInfo[page];
  const PageIcon = info.icon;

  return (
    <section className="page-section account-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{info.eyebrow}</span>
          <h1>{info.title}</h1>
          <p>{info.description}</p>
        </div>
        <div className="account-page-icon">
          <PageIcon size={25} />
        </div>
      </div>

      <div className="account-summary-grid">
        {info.cards.map(([label, value]) => (
          <article className="account-summary-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="account-empty-state">
        <div className="account-empty-icon">
          <CircleHelp size={25} />
        </div>
        <h2>
          {walletConnected
            ? "No records available yet"
            : "Connect your wallet"}
        </h2>
        <p>
          {walletConnected
            ? "Your wallet is connected, but verified account records are not yet available. This page will populate when the market contracts and account data services are integrated."
            : "Connect your wallet to prepare for account features. Positions, balances, claims, and history will appear only when verified data is available."}
        </p>

        {!walletConnected && (
          <button
            className="primary-button"
            type="button"
            onClick={onConnect}
          >
            Connect wallet
          </button>
        )}

        <button
          className="text-action"
          type="button"
          onClick={onExploreMarkets}
        >
          Explore markets
        </button>
      </div>
    </section>
  );
}