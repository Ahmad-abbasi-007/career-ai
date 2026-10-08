"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-gray-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        <Link href="/" className="text-2xl font-bold">
          Career<span className="text-blue-500">AI</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-gray-300 hover:text-white">
            Home
          </Link>

          <Link href="/job-match" className="text-gray-300 hover:text-white">
            AI Job Match
          </Link>

          <Link href="/jobs" className="text-gray-300 hover:text-white">
            Jobs
          </Link>

          <Link href="#features" className="text-gray-300 hover:text-white">
            Features
          </Link>

          <Link href="#about" className="text-gray-300 hover:text-white">
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-2 text-gray-300 hover:text-white sm:block"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-5 py-2 font-semibold hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>

      </div>
    </nav>
  );
}