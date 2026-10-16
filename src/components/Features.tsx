import Link from "next/link";

const features = [
  {
    icon: "💼",
    title: "Browse opportunities",
    description:
      "Explore job details, locations, skills, and compensation before creating an account.",
  },
  {
    icon: "🔎",
    title: "Find a better fit",
    description:
      "Search open roles by title, company, skills, location, and job type.",
  },
  {
    icon: "📌",
    title: "Keep applications organized",
    description:
      "Create an account to apply and keep track of your applications in one place.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            A simpler job search
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Make your next move with confidence
          </h2>
          <p className="mt-4 text-gray-400">
            Find relevant opportunities and manage your applications with
            CareerAI.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div aria-hidden="true" className="text-3xl">
                {feature.icon}
              </div>
              <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-gray-400">
                {feature.description}
              </p>
              {feature.title === "Browse opportunities" && (
                <Link
                  href="/jobs"
                  className="mt-5 inline-block font-medium text-blue-300 hover:text-blue-200"
                >
                  Explore jobs →
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
