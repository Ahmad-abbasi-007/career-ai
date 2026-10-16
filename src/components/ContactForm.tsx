"use client";

import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitContactForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });
      const result: { error?: string; success?: boolean } =
        await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Your message could not be sent.");
      }

      form.reset();
      setMessage("Thanks for reaching out. Your message has been sent.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Your message could not be sent. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-24">
      <h2 className="text-xl font-bold text-white">Contact us</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">
        Have a question or feedback? Send us a message and we&apos;ll get back
        to you.
      </p>
      <form onSubmit={submitContactForm} className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className="sr-only">
              Your name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={100}
              placeholder="Your name"
              className="w-full rounded-lg border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="sr-only">
              Your email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="Your email"
              className="w-full rounded-lg border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="contact-website">Leave this field empty</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="contact-message" className="sr-only">
            Your message
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={4}
            maxLength={3000}
            placeholder="How can we help?"
            className="w-full resize-y rounded-lg border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
          />
        </div>
        {message && (
          <p role="status" className="text-sm text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send message"}
        </button>
      </form>
    </section>
  );
}
