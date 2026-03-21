import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  Mic,
  Search,
  Shield,
  Smartphone,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const testimonials = [
  {
    quote:
      "Pack Voice has transformed how our team stays aligned. Everyone submits their daily update in under two minutes — with voice!",
    name: "Sarah Chen",
    title: "Engineering Manager, Stackly",
    avatar: "SC",
  },
  {
    quote:
      "As an admin, I love being able to see who's submitted at a glance. No more chasing people for updates over Slack.",
    name: "Marcus Rivera",
    title: "Head of Operations, Nudge",
    avatar: "MR",
  },
  {
    quote:
      "The voice transcription is shockingly accurate. I submit my daily report on my commute and it's perfect every time.",
    name: "Priya Kapoor",
    title: "Product Lead, Forma",
    avatar: "PK",
  },
];

const features = [
  {
    icon: Mic,
    title: "Voice Input",
    desc: "Dictate your daily report using your browser's built-in speech recognition — no installs needed.",
  },
  {
    icon: LayoutDashboard,
    title: "Team Dashboard",
    desc: "Admins get a real-time overview of who has submitted today and who is still pending.",
  },
  {
    icon: History,
    title: "Daily History",
    desc: "Browse your team's report archive by date. Never lose context again.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "Members see their own reports; admins see everything. Simple, secure permissions.",
  },
  {
    icon: Search,
    title: "Instant Search",
    desc: "Find any report across your team's history in seconds with full-text search.",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    desc: "Submit your daily update from any device, anywhere, including on the go.",
  },
];

const steps = [
  {
    step: "01",
    title: "Record or Type",
    desc: "Use the microphone button to dictate your daily update or simply type it in the text area.",
  },
  {
    step: "02",
    title: "Submit Your Report",
    desc: "Hit submit and your report is instantly saved and timestamped for your team to see.",
  },
  {
    step: "03",
    title: "Review as a Team",
    desc: "Your admin reviews all submissions on the dashboard and can filter by date or team member.",
  },
];

export default function LandingPage() {
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  const prev = () =>
    setTestimonialIdx(
      (i) => (i - 1 + testimonials.length) % testimonials.length,
    );
  const next = () => setTestimonialIdx((i) => (i + 1) % testimonials.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">
              Pack Voice
            </span>
          </div>
          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Main navigation"
          >
            {[
              "Dashboard",
              "Reports",
              "Team",
              "Integrations",
              "Pricing",
              "Help",
            ].map((item) => (
              <a
                key={item}
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
          <Link to="/login">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-ocid="nav.login.button"
            >
              Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Dot grid decoration */}
        <div className="dot-grid absolute right-0 top-0 w-80 h-80 opacity-60 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-block bg-accent/40 text-foreground text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
              Daily Team Reports, Reimagined
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Your team's daily voice,
              <br />
              <span className="text-primary">every single day.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Pack Voice makes daily team stand-ups effortless. Record or type
              your update in seconds, let your manager stay in the loop without
              a meeting.
            </p>
            <Link to="/login">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 shadow-hero"
                data-ocid="hero.primary_button"
              >
                Get Started Free
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-16 rounded-2xl overflow-hidden shadow-hero border border-border bg-white"
          >
            <img
              src="/assets/generated/hero-illustration.dim_900x400.png"
              alt="Pack Voice app illustration"
              className="w-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              How Pack Voice Works
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Three simple steps to keep your whole team connected and
              accountable.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <Card className="border-border shadow-card h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <span className="text-primary font-extrabold text-lg">
                        {s.step}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{s.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Key Features
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Everything you need for frictionless daily team reporting.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex gap-4 p-6 bg-white rounded-xl border border-border shadow-soft"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/40 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Screenshot Band */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              A clear view of your entire team
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              The admin dashboard shows you exactly who's checked in — at a
              glance.
            </p>
          </motion.div>
          <div className="relative flex items-center justify-center">
            {/* Decorative teal blobs */}
            <div className="blob-left absolute -left-16 top-8 w-56 h-56 pointer-events-none" />
            <div className="blob-right absolute -right-16 bottom-8 w-64 h-48 pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative z-10 rounded-2xl overflow-hidden shadow-hero border border-border w-full max-w-4xl"
            >
              <img
                src="/assets/generated/dashboard-screenshot.dim_1200x700.png"
                alt="Pack Voice admin dashboard"
                className="w-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              What teams are saying
            </h2>
          </motion.div>
          <div className="relative flex items-center gap-4">
            <button
              type="button"
              onClick={prev}
              className="flex-shrink-0 w-10 h-10 rounded-full border border-border bg-white shadow-soft flex items-center justify-center hover:bg-secondary transition-colors"
              data-ocid="testimonials.pagination_prev"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${testimonialIdx * 100}%)` }}
              >
                {testimonials.map((t) => (
                  <div key={t.name} className="min-w-full px-2">
                    <Card className="border-border shadow-card">
                      <CardContent className="pt-8 pb-6">
                        <div className="flex gap-1 mb-4">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className="w-4 h-4 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>
                        <p className="text-foreground text-base italic mb-6">
                          "{t.quote}"
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                            {t.avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {t.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {t.title}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={next}
              className="flex-shrink-0 w-10 h-10 rounded-full border border-border bg-white shadow-soft flex items-center justify-center hover:bg-secondary transition-colors"
              data-ocid="testimonials.pagination_next"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((t, i) => (
              <button
                type="button"
                key={t.name}
                onClick={() => setTestimonialIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === testimonialIdx ? "bg-primary" : "bg-border"}`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Mic className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg text-foreground">
                  Pack Voice
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Daily voice reports for modern teams.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Sitemap</h4>
              <ul className="space-y-2">
                {["Home", "Dashboard", "Reports", "Pricing"].map((l) => (
                  <li key={l}>
                    <a
                      href="/"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Company</h4>
              <ul className="space-y-2">
                {["About", "Blog", "Careers", "Contact"].map((l) => (
                  <li key={l}>
                    <a
                      href="/"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Follow Us</h4>
              <div className="flex gap-3">
                {["X", "Li", "Gh"].map((s) => (
                  <a
                    key={s}
                    href="/"
                    className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()}. Built with ❤️ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                className="underline hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                caffeine.ai
              </a>
            </p>
            <p className="text-xs text-muted-foreground">hello@packvoice.app</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
