import Link from "next/link";
import ContactForm from "@/components/ContactForm";

export default function Footer() {
  return (
    <footer id="about" className="scroll-mt-20 border-t border-white/10 px-6">
      <div className="mx-auto grid max-w-7xl gap-12 py-14 md:grid-cols-2 md:py-16">
        <div className="flex flex-col items-start">
          <Link href="/" className="text-2xl font-bold text-white">
            Career<span className="text-blue-500">AI</span>
          </Link>
          <p className="mt-3 max-w-md leading-7 text-gray-400">
            Helping students discover opportunities and take the next step in
            their careers.
          </p>
          <nav aria-label="Footer navigation" className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-300">
            <Link href="/jobs" className="hover:text-white">
              Browse jobs
            </Link>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-white">
              Create account
            </Link>
          </nav>
        </div>

        <ContactForm />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 border-t border-white/10 py-6 text-sm text-gray-500 sm:flex-row">
        <p>© {new Date().getFullYear()} CareerAI. All rights reserved.</p>
        <p>Built to help you find your next opportunity.</p>
      </div>
    </footer>
  );
}
