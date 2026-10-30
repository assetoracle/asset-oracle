import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

export type Page =
  | "Home"
  | "Markets"
  | "My Proposals"
  | "Portfolio"
  | "Claims"
  | "History"
  | "Referrals"
  | "Admin"
  | "Market Creators"
  | "Validators"
  | "Terms of Service";

export type NavItem = {
  label: Page;
  icon: LucideIcon;
};

type NavProps = {
  items: NavItem[];
  page: Page;
  onNavigate: (page: Page) => void;
};

export function DesktopNav({ items, page, onNavigate }: NavProps) {
  return (
    <nav className="desktop-navigation" aria-label="Main navigation">
      {items.map(({ label, icon: Icon }) => (
        <button
          className={page === label ? "nav-link active" : "nav-link"}
          key={label}
          type="button"
          onClick={() => onNavigate(label)}
          aria-current={page === label ? "page" : undefined}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  );
}

export function MobileNav({ items, page, onNavigate }: NavProps) {
  return (
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      {items.map(({ label, icon: Icon }) => (
        <button
          className={page === label ? "nav-link active" : "nav-link"}
          key={label}
          type="button"
          onClick={() => onNavigate(label)}
          aria-current={page === label ? "page" : undefined}
        >
          <Icon size={19} />
          {label === "Referrals" ? "Referral leaderboard" : label}
        </button>
      ))}
    </nav>
  );
}

export function BottomNav({ items, page, onNavigate }: NavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Four primary destinations; remaining destinations live in More.
  const primaryLabels: Page[] = [
    "Home",
    "Markets",
    "My Proposals",
    "Portfolio",
  ];

  const primaryItems = items.filter((item) =>
    primaryLabels.includes(item.label),
  );

  const moreItems = items.filter(
    (item) => !primaryLabels.includes(item.label),
  );

  function selectPage(nextPage: Page) {
    setMoreOpen(false);
    onNavigate(nextPage);
  }

  return (
    <>
      <nav className="bottom-navigation" aria-label="Quick navigation">
        {primaryItems.map(({ label, icon: Icon }) => (
          <button
            className={
              page === label ? "bottom-nav-link active" : "bottom-nav-link"
            }
            key={label}
            type="button"
            onClick={() => selectPage(label)}
            aria-current={page === label ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}

        <button
          className={
            moreOpen || moreItems.some((item) => item.label === page)
              ? "bottom-nav-link active"
              : "bottom-nav-link"
          }
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-label="More navigation options"
        >
          <ChevronDown size={19} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <button
            className="more-sheet-backdrop"
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMoreOpen(false)}
          />
          <section
            className="more-navigation-sheet"
            aria-label="More navigation"
          >
            <div className="more-sheet-heading">
              <strong>More</strong>
              <button
                className="text-action"
                type="button"
                onClick={() => setMoreOpen(false)}
              >
                Close
              </button>
            </div>

            {moreItems.map(({ label, icon: Icon }) => (
              <button
                className={page === label ? "nav-link active" : "nav-link"}
                key={label}
                type="button"
                onClick={() => selectPage(label)}
              >
                <Icon size={19} />
                {label === "Referrals" ? "Referral leaderboard" : label}
              </button>
            ))}
          </section>
        </>
      )}
    </>
  );
}