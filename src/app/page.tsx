export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl font-bold">
          Career<span className="text-blue-500">AI</span>
        </h1>

        <p className="mt-6 max-w-2xl text-xl text-gray-400">
          Your AI-powered career assistant for finding jobs,
          improving your resume, and preparing for interviews.
        </p>

        <div className="mt-8 flex gap-4">
          <button className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700">
            Find Jobs
          </button>

          <button className="rounded-lg border border-gray-700 px-6 py-3 font-semibold hover:bg-gray-800">
            Analyze Resume
          </button>
        </div>
      </section>
    </main>
  );
}