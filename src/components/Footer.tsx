export default function Footer() {
  return (
    <footer
      id="about"
      className="border-t border-white/10 px-6 py-10"
    >
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row">
        
        <div>
          <p className="text-xl font-bold">
            Career<span className="text-blue-500">AI</span>
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Your AI-powered career assistant.
          </p>
        </div>

        <p className="text-sm text-gray-500">
          © 2026 CareerAI. Built with Next.js & AI.
        </p>

      </div>
    </footer>
  );
}