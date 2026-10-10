
import { useState, type FormEvent } from "react";
import {
  validateMarketProposal,
  createMarketProposal,
  type MarketProposalInput,
  type StoredMarketProposal,
} from "../markets/marketApi";

type Props = {
  address: string;
  signMessage: (message: string) => Promise<string>;
  onClose: () => void;
  onCreated: (proposal: StoredMarketProposal) => void;
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

export function MarketProposalForm({
  address,
  signMessage,
  onClose,
  onCreated,
}: Props)
 {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<MarketProposalInput["category"]>("Crypto");
  const [closesAt, setClosesAt] = useState("");
  const [resolvesAt, setResolvesAt] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [metric, setMetric] = useState("");
  const [comparison, setComparison] =
    useState<MarketProposalInput["resolutionRule"]["comparison"]>(
      "ABOVE"
    );
  const [targetValue, setTargetValue] = useState("");
  const [currency, setCurrency] = useState("");
  const [observationTime, setObservationTime] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setMessage("");

    const target = Number(targetValue);

    if (targetValue.trim() === "" || !Number.isFinite(target)) {
      setErrors(["Enter a valid numeric target value."]);
      return;
    }

    const dates = [
      closesAt,
      resolvesAt,
      observationTime,
    ];

    if (dates.some((value) => !value || Number.isNaN(new Date(value).getTime()))) {
      setErrors(["Enter valid closing, resolution, and observation dates."]);
      return;
    }

    const proposal: MarketProposalInput = {
      question: question.trim(),
      description: description.trim(),
      category,
      closesAt: toIsoDate(closesAt),
      resolvesAt: toIsoDate(resolvesAt),
      resolutionRule: {
        sourceId: sourceId.trim(),
        metric: metric.trim(),
        comparison,
        targetValue: target,
        ...(currency.trim()
          ? { currency: currency.trim() }
          : {}),
        observationTime: toIsoDate(observationTime),
        description: ruleDescription.trim(),
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

      const result = await createMarketProposal(
  proposal,
  address,
  signMessage,
);
      onCreated(result.proposal);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit the proposal. Please try again."
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
              Propose a market
            </h2>
            <p style={{ color: "#8DA9B3", lineHeight: 1.7 }}>
              Define the question, evidence source, and rules that
              will determine the final outcome.
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
              placeholder="Explain the market and what a YES or NO outcome means."
              rows={4}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </label>

          <label style={labelStyle}>
            Category
            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value as MarketProposalInput["category"]
                )
              }
              style={fieldStyle}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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

          <div
            style={{
              height: 1,
              background: "#1D6675",
              margin: "4px 0",
            }}
          />

          <div>
            <h3 style={{ margin: "0 0 7px", fontSize: 18 }}>
              Resolution rules
            </h3>
            <p style={{ margin: 0, color: "#8DA9B3", fontSize: 13, lineHeight: 1.7 }}>
              Specify the data source and measurable condition used
              to establish the result.
            </p>
          </div>

          <label style={labelStyle}>
            Data source ID
            <input
              required
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              placeholder="For example, coingecko"
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Metric
            <input
              required
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
              placeholder="For example, BTC/USD price"
              style={fieldStyle}
            />
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <label style={labelStyle}>
              Comparison
              <select
                value={comparison}
                onChange={(event) =>
                  setComparison(
                    event.target.value as
                      MarketProposalInput["resolutionRule"]["comparison"]
                  )
                }
                style={fieldStyle}
              >
                <option value="ABOVE">Above</option>
                <option value="BELOW">Below</option>
                <option value="EQUALS">Equals</option>
              </select>
            </label>

            <label style={labelStyle}>
              Target value
              <input
                required
                type="number"
                step="any"
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                placeholder="150000"
                style={fieldStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            Currency (optional)
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              placeholder="USD"
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Observation date and time
            <input
              required
              type="datetime-local"
              value={observationTime}
              onChange={(event) => setObservationTime(event.target.value)}
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Explain how the outcome will be resolved
            <textarea
              required
              minLength={10}
              value={ruleDescription}
              onChange={(event) => setRuleDescription(event.target.value)}
              placeholder="Identify the source, observation, and condition that determine the outcome."
              rows={4}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
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
              {busy ? "Validating and submitting..." : "Submit proposal"}
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
            does not publish a market or guarantee approval.
          </p>
        </form>
      </section>
    </div>
  );
}
