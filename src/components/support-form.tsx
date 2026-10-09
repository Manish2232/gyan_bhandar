"use client";

import Link from "next/link";
import Script from "next/script";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Heart, ShieldCheck } from "lucide-react";
import { requestJson } from "@/lib/client-api";

type OrderResponse = { contributionId: string; orderId: string; amount: number; currency: "INR"; keyId: string };
type CheckoutResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name?: string; email?: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: CheckoutResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => {
      open: () => void;
      on: (event: "payment.failed", callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

const presetAmounts = [100, 250, 500, 1000];

export function SupportForm() {
  const [amount, setAmount] = useState("250");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const amountRupees = Number(amount);
    if (!Number.isInteger(amountRupees) || amountRupees < 1 || amountRupees > 100_000) {
      setError("Enter a whole-rupee amount between ₹1 and ₹100,000.");
      return;
    }
    if (!window.Razorpay) {
      setError("Secure checkout is still loading. Please try again in a moment.");
      return;
    }

    setPending(true);
    try {
      const order = await requestJson<OrderResponse>("/api/payments/orders", {
        method: "POST",
        body: JSON.stringify({ amountRupees, donorName: name, donorEmail: email, message }),
      });
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Gyan Bhandar",
        description: "Support the shared library",
        order_id: order.orderId,
        prefill: { name: name || undefined, email: email || undefined },
        theme: { color: "#174f43" },
        modal: { ondismiss: () => setPending(false) },
        handler: async (response) => {
          try {
            const result = await requestJson<{ status: string }>("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            if (result.status === "PAID") {
              setSuccess(`Thank you. Your ₹${amountRupees.toLocaleString("en-IN")} contribution is confirmed.`);
            } else if (result.status === "PENDING") {
              setSuccess("Your payment is authorized. We’re waiting for capture confirmation.");
            } else {
              setError("The payment was not captured. You can try again with a new order.");
            }
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "We could not confirm this payment yet.");
          } finally {
            setPending(false);
          }
        },
      });
      checkout.on("payment.failed", (response) => {
        setError(response.error?.description ?? "The payment did not go through. Please try again.");
        setPending(false);
      });
      checkout.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout could not be started.");
      setPending(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" onReady={() => setScriptReady(true)} onError={() => setError("Secure checkout could not load. Please refresh and try again.")} />
      <header className="site-header support-header">
        <Link className="wordmark" href="/" aria-label="Gyan Bhandar home"><span className="wordmark-mark" aria-hidden="true">g.</span><span>gyan bhandar</span></Link>
        <nav className="main-nav" aria-label="Main navigation"><Link href="/#library">Explore</Link><Link href="/signup">Add a note</Link></nav>
        <Link className="text-link" href="/"><ArrowLeft size={14} aria-hidden="true" /> Back to the library</Link>
      </header>
      <main className="support-page">
        <section className="support-story" aria-labelledby="support-heading">
          <p className="eyebrow"><span className="eyebrow-dot" /> Keep the good things in circulation</p>
          <h1 id="support-heading">A little support.<br />A <em>longer shelf.</em></h1>
          <p>Gyan Bhandar is built around generous sharing. Your contribution helps keep this quiet corner of the internet open, useful, and independent.</p>
          <div className="support-assurance"><span><Heart size={16} aria-hidden="true" /></span><p>Every contribution, big or small, is appreciated.</p></div>
          <Link className="support-back-link" href="/signup">Rather add a note? <span>Contribute knowledge <ArrowUpRight size={13} aria-hidden="true" /></span></Link>
        </section>

        <section className="support-panel" aria-labelledby="contribution-title">
          <div className="support-panel-heading"><div><p className="eyebrow">Secure checkout</p><h2 id="contribution-title">Choose an amount.</h2></div><span className="support-rupee" aria-hidden="true">₹</span></div>
          <form className="support-form" onSubmit={submit}>
            <fieldset className="amount-fieldset">
              <legend className="visually-hidden">Choose a contribution amount in rupees</legend>
              <div className="amount-options">
                {presetAmounts.map((preset) => (
                  <button className={Number(amount) === preset ? "amount-option selected" : "amount-option"} type="button" key={preset} aria-pressed={Number(amount) === preset} onClick={() => setAmount(String(preset))}>₹{preset.toLocaleString("en-IN")}</button>
                ))}
              </div>
              <div className="field amount-input-field"><label htmlFor="amount">Or enter another amount</label><div className="amount-input-wrap"><span aria-hidden="true">₹</span><input id="amount" type="number" inputMode="numeric" min="1" max="100000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required aria-describedby="amount-hint" /></div><p className="field-hint" id="amount-hint">Whole rupees, from ₹1 to ₹1,00,000.</p></div>
            </fieldset>
            <div className="support-fields">
              <div className="field"><label htmlFor="donor-name">Name <span>(optional)</span></label><input id="donor-name" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div className="field"><label htmlFor="donor-email">Email <span>(optional)</span></label><input id="donor-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="field"><label htmlFor="message">A note <span>(optional)</span></label><textarea id="message" maxLength={500} rows={2} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Leave a kind word" /></div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="payment-success" role="status"><ShieldCheck size={17} aria-hidden="true" /> {success}</p>}
            <button className="button button-dark support-submit" type="submit" disabled={pending || !scriptReady} aria-busy={pending}>
              {pending ? "Opening secure checkout…" : scriptReady ? `Contribute ₹${(Number(amount) || 0).toLocaleString("en-IN")}` : "Preparing checkout"}<ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </form>
          <p className="payment-privacy"><ShieldCheck size={14} aria-hidden="true" /> Card, UPI, and banking details are entered securely with Razorpay.</p>
        </section>
      </main>
      <footer className="site-footer support-footer"><Link className="wordmark" href="/"><span className="wordmark-mark" aria-hidden="true">g.</span><span>gyan bhandar</span></Link><span>Thank you for keeping the shelf open.</span><span>Payments powered by Razorpay</span></footer>
    </>
  );
}