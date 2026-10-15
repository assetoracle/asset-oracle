import { friendlyError } from "../utils/friendlyError";

import { useState, type FormEvent } from "react";
import BrandedSelect from "./BrandedSelect";
import {
  validateMarketProposal,
  createMarketProposal,
  updateMarketProposal,
  type MarketProposalInput,
  type StoredMarketProposal,
} from "../markets/marketApi";

type Props = {
  address: string;
  signMessage: (message: string) => Promise<string>;
  onClose: () => void;
  onCreated: (proposal: StoredMarketProposal) => void;
  initialProposal?: StoredMarketProposal | null;
  onUpdated?: (proposal: StoredMarketProposal) => void;
};

const categories = [
  "Crypto",
  "Sports",
  "Economics",
  "RWA",
  "Regional",
] as const;

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #1D6675",
  borderRadius: 10,
  background: "#071A24",
  color: "#F2FCFF",
  font: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  color: "#8DA9B3",
  fontSize: 13,
};

function toIsoDate(value: string): string {
  return new Date(value).toISOString();
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function MarketProposalForm({
  address,
  signMessage,
  onClose,
  onCreated,
  initialProposal = null,
  onUpdated,
}: Props)
 {
  const [question, setQuestion] = useState(initialProposal?.question ?? "");
  const [description, setDescription] = useState(initialProposal?.description ?? "");
  const [category, setCategory] =
    useState<MarketProposalInput["category"]>(initialProposal?.category ?? "Crypto");
  const [closesAt, setClosesAt] = useState(initialProposal ? toLocalDateTime(initialProposal.closesAt) : "");
  const [resolvesAt, setResolvesAt] = useState(initialProposal ? toLocalDateTime(initialProposal.resolvesAt) : "");
  const [resolutionCriteria, setResolutionCriteria] = useState(initialProposal?.resolutionRule.description ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setMessage("");

    const dates = [closesAt, resolvesAt];

    if (dates.some((value) => !value || Number.isNaN(new Date(value).getTime()))) {
      setErrors(["Enter valid closing and resolution dates."]);
      return;
    }

    if (resolvesAt && closesAt && new Date(resolvesAt) <= new Date(closesAt)) {
      setErrors(["The resolution deadline must be after the market closing time."]);
      return;
    }

    if (resolutionCriteria.trim().length < 10) {
      setErrors(["Explain clearly what must happen for YES or NO to win."]);
      return;
    }

    const proposal: MarketProposalInput = {
      question: question.trim(),
      description: description.trim(),
      category,
      closesAt: toIsoDate(closesAt),
      resolvesAt: toIsoDate(resolvesAt),
      resolutionRule: {
        sourceId: "human-validation",
        metric: "market-outcome",
        comparison: "EQUALS",
        targetValue: 1,
        observationTime: toIsoDate(resolvesAt),
        description: resolutionCriteria.trim(),
      },
    };

    setBusy(true);

    try {
      const validation = await validateMarketProposal(proposal);

      if (!validation.valid) {
        setErrors(
          validation.errors?.map(
            (item) => `${item.field}: ${item.message}`
          ) ?? ["The proposal failed validation."]
        );
        return;
      }

      if (initialProposal) {
        const result = await updateMarketProposal(initialProposal.id, proposal, address, signMessage);
        (onUpdated ?? onCreated)(result.proposal);
      } else {
        const result = await createMarketProposal(proposal, address, signMessage);
        onCreated(result.proposal);
      }
    } catch (error) {
      setMessage(
        friendlyError(error, "Proposal failed.")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 14,
        background: "rgba(0, 0, 0, 0.78)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 24,
          border: "1px solid #1D6675",
          borderRadius: 20,
          background: "#071A24",
          color: "#F2FCFF",
          boxShadow: "0 20px 70px rgba(0,0,0,.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                color: "#12D9F5",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2,
              }}
            >
              ASSET ORACLE
            </p>
            <h2 id="proposal-title" style={{ margin: 0, fontSize: 26 }}>
              {initialProposal ? "Edit and resubmit proposal" : "Propose a market"}
            </h2>
            <p style={{ color: "#8DA9B3", lineHeight: 1.7 }}>
              Create a clear market question and explain exactly what must happen for each outcome.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close proposal form"
            style={{
              padding: "8px 12px",
              border: "1px solid #1D6675",
              borderRadius: 9,
              background: "#0B2A35",
              color: "#F2FCFF",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 17 }}>
          <label style={labelStyle}>
            Market question
            <textarea
              required
              minLength={15}
              maxLength={240}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Will Bitcoin exceed $150,000 by the end of 2026?"
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
            <span>{question.length}/240 characters</span>
          </label>

          <label style={labelStyle}>
            Description
            <textarea
              required
              minLength={20}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add useful context so people understand what this market is about."
              rows={4}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </label>

          <label style={labelStyle}>
            Category
            <BrandedSelect
              value={category}
              onChange={(value) => setCategory(value as MarketProposalInput["category"])}
              options={categories.map((item) => ({ value: item, label: item }))}
              ariaLabel="Market category"
            />
          </label>

          <div style={{ display: "grid", gap: 14 }}>
            <label style={labelStyle}>
              Market closing date and time
              <input
                required
                type="datetime-local"
                value={closesAt}
                onChange={(event) => setClosesAt(event.target.value)}
                style={fieldStyle}
              />
            </label>

            <label style={labelStyle}>
              Outcome resolution date and time
              <input
                required
                type="datetime-local"
                value={resolvesAt}
                onChange={(event) => setResolvesAt(event.target.value)}
                style={fieldStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            What must happen for YES or NO to win?
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={resolutionCriteria}
              onChange={(event) => setResolutionCriteria(event.target.value)}
              placeholder="Explain the exact conditions for YES and NO, including how an unclear, cancelled, or postponed event should be handled."
              rows={4}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
            <span>Be specific so the final outcome can be determined fairly.</span>
          </label>


          {errors.length > 0 && (
            <div
              role="alert"
              style={{
                padding: 14,
                border: "1px solid #B45353",
                borderRadius: 10,
                background: "#351B23",
                color: "#FFB4A9",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              <strong>Check these fields:</strong>
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                {errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {message && (
            <p role="alert" style={{ color: "#FFB4A9", lineHeight: 1.6 }}>
              {message}
            </p>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 4,
            }}
          >
            <button
              type="submit"
              disabled={busy}
              style={{
                flex: "1 1 200px",
                minHeight: 48,
                padding: "12px 18px",
                border: 0,
                borderRadius: 11,
                background: "linear-gradient(110deg, #12D9F5, #00B8A9)",
                color: "#071A24",
                fontWeight: 800,
                opacity: busy ? 0.65 : 1,
              }}
            >
              {busy ? "Validating and submitting..." : initialProposal ? "Save changes and resubmit" : "Submit proposal"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                minHeight: 48,
                padding: "12px 18px",
                border: "1px solid #1D6675",
                borderRadius: 11,
                background: "#0B2A35",
                color: "#F2FCFF",
              }}
            >
              Cancel
            </button>
          </div>

          <p style={{ color: "#8DA9B3", fontSize: 12, lineHeight: 1.7 }}>
            Submissions are subject to review. Submitting a proposal
            does not publish a market or guarantee approval. {initialProposal ? "Saving changes returns it to pending approval." : ""}
          </p>
        </form>
      </section>
    </div>
  );
}
