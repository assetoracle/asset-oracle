import { friendlyError } from "../utils/friendlyError";
import { toIsoDate, toLocalDateTime } from "../utils/marketTime";

import { useState, type FormEvent } from "react";
import BrandedSelect from "./BrandedSelect";
import SportIcon from "./SportIcon";
import {
  validateMarketProposal,
  createMarketProposal,
  createPaidMarketProposal,
  getPublicWalletRole,
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
  const [sport, setSport] = useState<NonNullable<MarketProposalInput["sport"]> | "">(initialProposal?.sport ?? "");
  const [closesAt, setClosesAt] = useState(initialProposal ? toLocalDateTime(initialProposal.closesAt) : "");
  const [resolvesAt, setResolvesAt] = useState(initialProposal ? toLocalDateTime(initialProposal.resolvesAt) : "");
  const [resolutionCriteria, setResolutionCriteria] = useState(initialProposal?.resolutionRule.description ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);

  function continueStep() {
    setErrors([]);
    setMessage("");
    if (step === 1) {
      const nextErrors: string[] = [];
      if (question.trim().length < 15) nextErrors.push("Write a market question with at least 15 characters.");
      if (description.trim().length < 20) nextErrors.push("Add at least 20 characters of context.");
      if (category === "Sports" && !sport) nextErrors.push("Choose a sport for this market.");
      if (nextErrors.length) { setErrors(nextErrors); return; }
    }
    if (step === 2) {
      const nextErrors: string[] = [];
      if ([closesAt, resolvesAt].some((value) => !value || Number.isNaN(new Date(value).getTime()))) nextErrors.push("Enter valid closing and resolution dates.");
      else if (new Date(resolvesAt) <= new Date(closesAt)) nextErrors.push("The resolution deadline must be after the market closing time.");
      if (resolutionCriteria.trim().length < 10) nextErrors.push("Explain clearly what must happen for YES or NO to win.");
      if (nextErrors.length) { setErrors(nextErrors); return; }
    }
    setStep((current) => Math.min(3, current + 1));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setMessage("");

    const dates = [closesAt, resolvesAt];

    if (category === "Sports" && !sport) {
      setErrors(["Choose Football, Basketball, or Tennis for this sports market."]);
      return;
    }

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
      ...(category === "Sports" && sport ? { sport } : {}),
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
        const role = await getPublicWalletRole(address);
        if (role.permissions.createMarketProposal) {
          const result = await createMarketProposal(proposal, address, signMessage);
          onCreated(result.proposal);
        } else {
          const result = await createPaidMarketProposal(proposal, address, signMessage);
          setMessage(result.message);
          onCreated(result.proposal);
        }
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
            {!initialProposal && (
              <div
                role="note"
                aria-label="Proposal submission fee"
                style={{
                  marginTop: 14,
                  padding: "14px 16px",
                  border: "1px solid #12D9F5",
                  borderRadius: 12,
                  background: "linear-gradient(120deg, rgba(18,217,245,.12), rgba(0,184,169,.08))",
                  color: "#F2FCFF",
                  lineHeight: 1.65,
                }}
              >
                <strong style={{ display: "block", color: "#63F3FF", fontSize: 15 }}>
                  Proposal submission fee
                </strong>
                <span style={{ display: "block", marginTop: 4, fontSize: 14 }}>
                  Regular users: <strong>10 USDC</strong> on Asset Chain Enugu Testnet.
                  Configured market makers: <strong>Free</strong>.
                </span>
                <span style={{ display: "block", marginTop: 5, color: "#8DA9B3", fontSize: 12 }}>
                  The fee is checked with the backend when you submit. Your wallet will request the USDC transfer only after the server returns a valid payment instruction. Your proposal remains pending review after payment.
                </span>
              </div>
            )}
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
          <div aria-label="Proposal steps" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 2 }}>
            {[{ number: 1, title: "Define" }, { number: 2, title: "Resolve" }, { number: 3, title: "Review" }].map((item) => (
              <button key={item.number} type="button" aria-current={step === item.number ? "step" : undefined} aria-label={`Step ${item.number}: ${item.title}`} onClick={() => {
                setErrors([]);
                setMessage("");
                if (item.number <= step) setStep(item.number);
                else if (item.number === step + 1) continueStep();
              }} style={{ minWidth: 0, padding: "10px 8px", border: "1px solid " + (step === item.number ? "#12D9F5" : "#1D6675"), borderRadius: 10, background: step === item.number ? "rgba(18,217,245,.1)" : "#0B2A35", color: "#F2FCFF", font: "inherit", textAlign: "left", cursor: item.number <= step + 1 ? "pointer" : "not-allowed", opacity: item.number > step + 1 ? 0.65 : 1 }}>
                <span style={{ display: "block", color: step === item.number ? "#63F3FF" : "#8DA9B3", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>STEP 0{item.number}</span>
                <strong style={{ display: "block", marginTop: 4, fontSize: 12, color: "#F2FCFF" }}>{item.title}</strong>
              </button>
            ))}
          </div>
          {step === 1 && <>
          <p style={{ margin: 0, color: "#8DA9B3", fontSize: 13, lineHeight: 1.6 }}>Start with a precise question, enough context, and the right category. You can review everything before submitting.</p>
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
              onChange={(value) => {
                const nextCategory = value as MarketProposalInput["category"];
                setCategory(nextCategory);
                if (nextCategory !== "Sports") setSport("");
              }}
              options={categories.map((item) => ({ value: item, label: item }))}
              ariaLabel="Market category"
            />
          </label>

          {category === "Sports" && (
            <fieldset
              aria-label="Choose sport"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
                padding: 14,
                border: "1px solid #1D6675",
                borderRadius: 12,
                background: "linear-gradient(145deg, #102F3A, #0B2A35)",
                minWidth: 0,
              }}
            >
              <legend style={{ padding: "0 6px", color: "#8DA9B3", fontSize: 13 }}>Choose sport</legend>
              {([
                { sport: "football", label: "Football" },
                { sport: "basketball", label: "Basketball" },
                { sport: "tennis", label: "Tennis" },
              ] as const).map((item) => {
                const selected = sport === item.sport;
                return (
                  <button
                    key={item.sport}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSport(item.sport);
                      setErrors([]);
                    }}
                    style={{
                      display: "grid",
                      justifyItems: "center",
                      alignContent: "center",
                      gap: 8,
                      minHeight: 88,
                      padding: 10,
                      border: selected ? "2px solid #12D9F5" : "1px solid #1D6675",
                      borderRadius: 10,
                      background: selected ? "#123E49" : "#071A24",
                      color: "#F2FCFF",
                      font: "inherit",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <SportIcon sport={item.sport} size={38} />
                    {item.label}
                    {selected && <span style={{ color: "#12D9F5", fontSize: 10 }}>SELECTED</span>}
                  </button>
                );
              })}
              <p style={{ gridColumn: "1 / -1", margin: "2px 0 0", color: "#8DA9B3", fontSize: 11, lineHeight: 1.6 }}>
                The selected sport is saved with your proposal and determines the ball shown on the published market.
              </p>
            </fieldset>
          )}

          </>}
          {step === 2 && <>
          <p style={{ margin: 0, color: "#8DA9B3", fontSize: 13, lineHeight: 1.6 }}>Set when predictions stop and when the outcome should be determined. Times are shown in West Africa Time (WAT).</p>
          <div style={{ display: "grid", gap: 14 }}>
            <label style={labelStyle}>
              Market closing date and time (WAT)
              <input
                required
                type="datetime-local"
                value={closesAt}
                onChange={(event) => setClosesAt(event.target.value)}
                style={fieldStyle}
              />
            </label>

            <label style={labelStyle}>
              Outcome resolution date and time (WAT)
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


          </>}
          {step === 3 && <section aria-labelledby="proposal-review-title" style={{ display: "grid", gap: 14, padding: 16, border: "1px solid #1D6675", borderRadius: 14, background: "linear-gradient(145deg, #102F3A, #0B2A35)" }}>
            <div><p style={{ margin: "0 0 5px", color: "#12D9F5", fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>FINAL CHECK</p><h3 id="proposal-review-title" style={{ margin: 0, fontSize: 20 }}>Review your proposal</h3><p style={{ marginBottom: 0, color: "#8DA9B3", fontSize: 13, lineHeight: 1.6 }}>Check the wording and schedule before sending it for review.</p></div>
            {[{ label: "Question", value: question }, { label: "Category", value: category + (category === "Sports" && sport ? " · " + sport : "") }, { label: "Description", value: description }, { label: "Closes (WAT)", value: closesAt.replace("T", " ") }, { label: "Resolution deadline (WAT)", value: resolvesAt.replace("T", " ") }, { label: "Resolution criteria", value: resolutionCriteria }].map((item) => <div key={item.label} style={{ display: "grid", gap: 5, paddingTop: 10, borderTop: "1px solid rgba(29,102,117,.45)" }}><strong style={{ color: "#8DA9B3", fontSize: 11, textTransform: "uppercase", letterSpacing: .8 }}>{item.label}</strong><p style={{ margin: 0, color: "#F2FCFF", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.value || "Not provided"}</p></div>)}
          </section>}
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
            {step > 1 && <button type="button" disabled={busy} onClick={() => { setErrors([]); setMessage(""); setStep((current) => Math.max(1, current - 1)); }} style={{ flex: "1 1 120px", minHeight: 48, padding: "12px 18px", border: "1px solid #1D6675", borderRadius: 11, background: "#0B2A35", color: "#F2FCFF", fontWeight: 700 }}>Back</button>}
            {step < 3 ? <button type="button" onClick={continueStep} style={{ flex: "1 1 200px", minHeight: 48, padding: "12px 18px", border: 0, borderRadius: 11, background: "linear-gradient(110deg, #12D9F5, #00B8A9)", color: "#071A24", fontWeight: 800 }}>Continue to {step === 1 ? "resolution details" : "review"}</button> : <button type="submit" disabled={busy} style={{ flex: "1 1 200px", minHeight: 48, padding: "12px 18px", border: 0, borderRadius: 11, background: "linear-gradient(110deg, #12D9F5, #00B8A9)", color: "#071A24", fontWeight: 800, opacity: busy ? 0.65 : 1 }}>{busy ? "Validating and submitting..." : initialProposal ? "Save changes and resubmit" : "Submit proposal"}</button>}

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
            does not publish a market or guarantee approval. For new proposals, configured market makers submit for free; regular users pay exactly 10 USDC on Asset Chain Testnet. {initialProposal ? "Saving changes returns it to pending approval." : ""}
          </p>
        </form>
      </section>
    </div>
  );
}
