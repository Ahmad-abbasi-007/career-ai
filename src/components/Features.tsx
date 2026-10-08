import Link from "next/link";

type Feature = {
  icon: string;
  title: string;
  description: string;
  href?: string;
};

const features: Feature[] = [
  {
    icon: "📄",
    title: "AI Resume Analysis",
    description:
      "Upload your resume and get an AI-powered analysis with scores, strengths, weaknesses, and improvement suggestions.",
  },
  {
    icon: "🤖",
    title: "Smart Job Search",
    description:
      "Search and filter job opportunities, then discover positions that match your career goals.",
    href: "/jobs",
  },
  {
    icon: "🎯",
    title: "AI Interview Preparation",
    description:
      "Generate technical and HR interview questions tailored to your target job.",
  },
  {
    icon: "📊",
    title: "Application Tracking",
    description:
      "Track your job applications from application to interview and final result.",
  },
];

export default function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
            Powerful Features
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            Everything You Need For Your Career
          </h2>

          <p className="mt-4 text-gray-400">
            CareerAI combines job searching and artificial intelligence
            into one powerful platform.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-blue-500/40"
            >
              <div className="text-4xl">{feature.icon}</div>

              <h3 className="mt-5 text-xl font-bold">
                {feature.title}
              </h3>

              <p className="mt-3 leading-7 text-gray-400">
                {feature.description}
              </p>

              {feature.href && (
                <Link
                  href={feature.href}
                  className="mt-5 inline-block text-blue-400 hover:text-blue-300"
                >
                  Explore Jobs →
                </Link>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}