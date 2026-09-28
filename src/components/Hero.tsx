export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-40">
      <div className="mx-auto max-w-5xl text-center">

        <div className="mb-6 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
          🤖 AI-Powered Career Assistant
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Build Your Career
          <span className="block text-blue-500">
            With AI
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
          Find the right jobs, improve your resume, prepare for interviews,
          and take control of your career with the power of artificial intelligence.
        </p>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:flex-row">

          <input
            type="text"
            placeholder="Job title, skills, or keywords..."
            className="flex-1 rounded-xl bg-gray-900 px-5 py-3 text-white outline-none placeholder:text-gray-500"
          />

          <input
            type="text"
            placeholder="Location"
            className="rounded-xl bg-gray-900 px-5 py-3 text-white outline-none placeholder:text-gray-500 sm:w-40"
          />

          <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700">
            Search Jobs
          </button>

        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button className="rounded-xl bg-white px-6 py-3 font-semibold text-gray-950 hover:bg-gray-200">
            Analyze My Resume
          </button>

          <button className="rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/10">
            Explore Jobs →
          </button>
        </div>

      </div>
    </section>
  );
}