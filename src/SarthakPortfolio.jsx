import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * SarthakPortfolio.jsx
 * Dark, physics-animated portfolio. Tailwind v4 friendly.
 * Visible fixes:
 *  - Canvas runs behind all content (no overlap).
 *  - CMU/GT shown as logo pills beside buttons.
 *  - Physics glows removed (particles only).
 *  - Resume Mode (light/printable) with Download PDF.
 */

/* =============================
   🔭 Physics Background Canvas
   ============================= */
function PhysicsBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());
  const wellsRef = useRef([
    { strength: 1.35, color: "#ef4444", x: 0, y: 0 }, // CMU well (no visible glow)
    { strength: 1.15, color: "#f59e0b", x: 0, y: 0 }, // GT well (no visible glow)
  ]);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false, timer: null });

  const resize = () => {
    const c = canvasRef.current;
    if (!c) return;
    const pr = Math.min(2, window.devicePixelRatio || 1);
    const { clientWidth: w, clientHeight: h } = c.parentElement;
    c.width = Math.floor(w * pr);
    c.height = Math.floor(h * pr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
  };

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: true });

    // Seed particles
    const spawn = () => {
      const N = 260;
      particlesRef.current = Array.from({ length: N }, () => ({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * 60, // px/s
        vy: (Math.random() - 0.5) * 60, // px/s
        size: 1.2 + Math.random() * 2.2,
      }));
    };
    spawn();

    const tick = (ts) => {
      const W = c.width,
        H = c.height;
      const dt = Math.min(0.033, (ts - lastRef.current) / 1000); // seconds
      lastRef.current = ts;

      // Dark trails background
      ctx.fillStyle = "rgba(2,6,23,0.2)";
      ctx.fillRect(0, 0, W, H);

      // Animate gravity wells (centered near top hero area)
      const time = ts * 0.001;
      const cx = 0.5 * W,
        cy = 0.32 * H;
      const cmu = { r: 0.22, speed: 0.12, phase: 0 };
      const gt = { r: 0.28, speed: -0.09, phase: Math.PI / 3 };
      const ax =
        cx + Math.cos(time * cmu.speed * Math.PI * 2 + cmu.phase) * (W * cmu.r);
      const ay =
        cy + Math.sin(time * cmu.speed * Math.PI * 2 + cmu.phase) * (H * cmu.r);
      const bx =
        cx + Math.cos(time * gt.speed * Math.PI * 2 + gt.phase) * (W * gt.r);
      const by =
        cy + Math.sin(time * gt.speed * Math.PI * 2 + gt.phase) * (H * gt.r);
      wellsRef.current[0].x = ax;
      wellsRef.current[0].y = ay;
      wellsRef.current[1].x = bx;
      wellsRef.current[1].y = by;

      // NOTE: glows intentionally disabled (too distracting)
      // const glow = (x, y, color) => {...}; glow(ax,ay,...); glow(bx,by,...);

      // Update particles with gravity + mouse repulsion
      particlesRef.current.forEach((p) => {
        wellsRef.current.forEach((w) => {
          const dx = w.x - p.x,
            dy = w.y - p.y;
          const d2 = Math.max(120, dx * dx + dy * dy);
          const invd = 1 / Math.sqrt(d2);
          const force = (w.strength * 9000) / d2; // px/s^2
          p.vx += dx * invd * force * dt;
          p.vy += dy * invd * force * dt;
        });
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x,
            dy = mouseRef.current.y - p.y;
          const d2 = Math.max(100, dx * dx + dy * dy);
          const inv = 1 / Math.sqrt(d2);
          const repulse = -14000 / d2;
          p.vx += dx * inv * repulse * dt;
          p.vy += dy * inv * repulse * dt;
        }
        // Integrate
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Wrap
        if (p.x < 0) p.x += W;
        else if (p.x > W) p.x -= W;
        if (p.y < 0) p.y += H;
        else if (p.y > H) p.y -= H;
        // Draw
        ctx.beginPath();
        ctx.fillStyle = "#e2e8f0";
        ctx.globalAlpha = 0.9;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // Window mouse events so canvas behind content still reacts
    const onMove = (e) => {
      const pr = Math.min(2, window.devicePixelRatio || 1);
      mouseRef.current.x = e.clientX * pr;
      mouseRef.current.y = e.clientY * pr;
      mouseRef.current.active = true;
      if (mouseRef.current.timer) clearTimeout(mouseRef.current.timer);
      mouseRef.current.timer = setTimeout(() => {
        mouseRef.current.active = false;
      }, 400);
    };
    const onOut = () => {
      mouseRef.current.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onOut);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onOut);
    };
  }, []);

  // IMPORTANT: this canvas will be placed inside a fixed wrapper,
  // so here we only need it to be absolute to fill that wrapper.
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden
    />
  );
}

/* =============================
   🧼 Tiny, reusable logo pill
   ============================= */
function LogoPill({ src, label, border = "border-slate-600/40", size = "md" }) {
  const SIZES = {
    md: { pad: "px-3 py-1", text: "text-[11px]", img: "h-4 w-4" },
    lg: { pad: "px-4 py-2", text: "text-sm", img: "h-6 w-6" },
    xl: { pad: "px-5 py-2.5", text: "text-base", img: "h-7 w-7" },
  };
  const s = SIZES[size] || SIZES.md;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${s.pad} ${s.text} font-semibold bg-slate-800/50 ${border}`}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          className={`${s.img} object-contain`}
          loading="lazy"
        />
      ) : null}
      <span className="text-slate-200/90">{label}</span>
    </span>
  );
}

/* =============================
   🧱 Reusable Card (light/dark aware)
   ============================= */
function Card({ children, className = "", resumeMode = false }) {
  return (
    <div
      className={`card rounded-2xl border shadow-xl hover:shadow-2xl transition-shadow ${
        resumeMode ? "bg-white border-slate-200 shadow-none" : "bg-slate-900/60 border-slate-800"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({ title, subtitle, resumeMode = false }) {
  return (
    <div className="mb-6">
      <h2
        className={`text-2xl md:text-3xl font-bold ${
          resumeMode ? "text-slate-900" : "text-slate-100"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-1 text-sm md:text-base ${
            resumeMode ? "text-slate-700" : "text-slate-300"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* =============================
   🏗️ Data (from resume)
   ============================= */
const PROJECTS = [
  {
    title: "Secure RISC-V Emulation (CMU)",
    tags: ["Renode", "Murax SoC", "ECC", "Linux/Unix"],
    metrics: ["+75% perf", "-15% memory", "+83% resilience"],
    blurb:
      "Built a secure Renode environment for Murax RISC-V; optimized crypto path and memory usage.",
  },
  {
    title: "Legal NLP Pipelines (GT VIP)",
    tags: ["spaCy", "pandas", "NumPy", "JSON"],
    metrics: ["410K+ claims", "100K+ dockets"],
    blurb:
      "Extracted entities and normalized messy legal text; powered downstream models and dashboards.",
  },
  {
    title: "NBA Statistics Application",
    tags: ["Python", "Distributed", "API", "Realtime", "Django"],
    metrics: ["500+ players", "30 teams"],
    blurb:
      "Full-stack Python app fetching live NBA stats and managing data for players and teams.",
    link: "https://github.com/Skenix64",
  },
  {
    title: "FinTech Sentiment (BERT)",
    tags: ["BERT", "NLP", "Scraping", "ML"],
    metrics: ["85% accuracy", "100K+ entries"],
    blurb:
      "Predictive models over carbon news for risk assessment; secure scraping pipelines.",
  },
  {
    title: "GT Movie Store (Django)",
    tags: ["Django", "Auth", "CRUD", "Security"],
    metrics: ["20+ user stories"],
    blurb:
      "Full CRUD with authentication, permissions, and secure review workflows.",
    link: "https://github.com/Skenix64",
  },
];

const EXPERIENCE = [
  {
    role: "Embedded Systems Research Intern",
    org: "Carnegie Mellon University",
    time: "May 2025 – Present",
    pts: [
      "Renode emulation on Murax RISC-V for secure, real-time workloads",
      "Optimized ECC path (↑ 75% perf), memory (↓ 15%), resilience (↑ 83%)",
      "Implemented Elliptic Curve DSA operations on Murax using Renode on Linux and Unix OS",
      "Analyzed system metrics to detect performance bottlenecks and optimize memory usage by 15%",
    ],
  },
  {
    role: "Undergraduate Researcher (Law, Data & Design)",
    org: "Georgia Tech VIP",
    time: "Jun 2025 – Present",
    pts: [
      "Analyzed 410K+ claims and 100K+ dockets; spaCy+pandas entity extraction",
      "Built scalable, modular data pipelines using Python (pandas, NumPy, regex, JSON libraries) to clean, structure, and validate unstandardized court records, enabling downstream classification models and dashboard visualizations for justice system research",
    ],
  },
  {
    role: "Consultant",
    org: "Westlake Corporation",
    time: "Jun 2025 – Present",
    pts: [
      "Engineered a scalable Python-based data processing tool to securely aggregate product intelligence across 500+ SKUs, enabling risk-aware pricing decisions and improving enterprise efficiency by 10%",
    ],
  },
  {
    role: "Research Intern",
    org: "University of Nebraska",
    time: "Jun 2023 – Aug 2023",
    pts: [
      "Developed a Python script to automate the recalibration of 1000+ different recharge rates for MODFLOW simulations, resulting in a 90% increase in efficiency and achieving 100% accuracy",
    ],
  },
];

const SKILLS = [
  "Java",
  "C",
  "C++",
  "C#",
  "Rust",
  "Python",
  "JavaScript",
  "R",
  "HTML",
  "CSS",
  "Django",
  "Jupyter",
  "JUnit",
  "Apache",
  "TensorFlow",
  "Docker",
  "Renode",
  "LC3Tools",
  "CircuitSim",
  "Ubuntu",
  "WSL",
  "Unix",
  "Linux",
  "RISC-V",
  "MySQL",
  "SQL",
  "Git",
  "GitHub",
  "Jira",
  "Agile",
  "Azure",
  "React",
];

/* =============================
   🕹️ Konami Code Easter Egg
   ============================= */
function useKonami(callback) {
  useEffect(() => {
    const seq = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    let i = 0;
    const onKey = (e) => {
      const k = e.key;
      if (k === seq[i]) {
        i++;
        if (i === seq.length) {
          callback();
          i = 0;
        }
      } else {
        i = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [callback]);
}

function NBABall() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [vx] = useState(160 + Math.random() * 80);
  const [vy, setVy] = useState(-220 - Math.random() * 100);
  const [active, setActive] = useState(true);
  const ref = useRef({ last: performance.now() });
  useEffect(() => {
    const onFrame = (ts) => {
      const dt = Math.min(0.032, (ts - ref.current.last) / 1000);
      ref.current.last = ts;
      setVy((v) => v + 980 * dt);
      setX((x) => x + vx * dt);
      setY((y) => y + (ref.current.vy ?? -200) * dt);
      requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
  }, [vx]);
  useEffect(() => {
    ref.current.vy = vy;
  }, [vy]);
  useEffect(() => {
    const timer = setTimeout(() => setActive(false), 4000);
    return () => clearTimeout(timer);
  }, []);
  if (!active) return null;
  return (
    <motion.div
      className="fixed left-0 top-0 z-50"
      style={{ transform: `translate(${x}px, ${y}px)` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-10 h-10 rounded-full bg-orange-500 border border-orange-300 shadow-2xl" />
    </motion.div>
  );
}

/* =============================
   🏠 Main Portfolio Component
   ============================= */
export default function SarthakPortfolio() {
  const [easter, setEaster] = useState(false);
  useKonami(() => setEaster(true));

  // 🔽 Resume Mode (persisted)
  const [resumeMode, setResumeMode] = useState(() => {
    return localStorage.getItem("resumeMode") === "1";
  });
  useEffect(() => {
    localStorage.setItem("resumeMode", resumeMode ? "1" : "0");
    document.body.style.background = resumeMode ? "#ffffff" : "#020617";
    document.body.style.color = resumeMode ? "#0f172a" : "#e2e8f0";
  }, [resumeMode]);

  const scrollToId = (id) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

  return (
    <div className={`relative min-h-screen ${resumeMode ? "resume-mode bg-white text-slate-900" : "text-slate-200"}`}>
      {/* BACKGROUND: fixed layer behind everything (off in resume mode) */}
      {!resumeMode && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <PhysicsBackground />
        </div>
      )}

      {/* CONTENT: lives above the background */}
      <main className="relative z-10 w-full">
        {/* Nav */}
        <nav
          className={`sticky top-0 z-40 ${
            resumeMode
              ? "bg-white/80 border-b border-slate-200 backdrop-blur"
              : "backdrop-blur-md bg-slate-950/40 border-b border-slate-800"
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className={`${resumeMode ? "text-slate-900" : "text-slate-100"} font-extrabold tracking-wider`}>
              SD
            </div>
            <div className="hidden sm:flex gap-4 items-center text-sm">
              <button className="hover:text-sky-500" onClick={() => scrollToId("about")}>
                About
              </button>
              <button className="hover:text-sky-500" onClick={() => scrollToId("projects")}>
                Projects
              </button>
              <button className="hover:text-sky-500" onClick={() => scrollToId("experience")}>
                Experience
              </button>
              <button className="hover:text-sky-500" onClick={() => scrollToId("skills")}>
                Skills
              </button>
              <button className="hover:text-sky-500" onClick={() => scrollToId("contact")}>
                Contact
              </button>

              {/* Resume Mode Toggle */}
              <button
                onClick={() => setResumeMode((v) => !v)}
                className={`ml-3 px-3 py-1 rounded-lg border ${
                  resumeMode
                    ? "bg-slate-900 text-white border-slate-700"
                    : "bg-amber-500/20 text-amber-200 border-amber-400/30"
                }`}
                title="Toggle Resume Mode"
              >
                {resumeMode ? "Exit Resume Mode" : "Resume Mode"}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="relative max-w-6xl mx-auto px-4 pt-16 pb-24">
          <div className="relative grid md:grid-cols-2 gap-10">
            <div className="relative">
              <motion.h1
                className={`text-4xl md:text-6xl font-extrabold leading-tight ${
                  resumeMode ? "text-slate-900" : "text-slate-100"
                }`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                Sarthak Das
              </motion.h1>
              <motion.p
                className={`mt-4 text-base md:text-lg ${
                  resumeMode ? "text-slate-700" : "text-slate-300"
                }`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.05 }}
              >
                Embedded Systems Researcher @ CMU • AI & Full-Stack • Georgia Tech CS ’27
              </motion.p>

              {/* Buttons + Logo pills */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="https://github.com/Skenix64"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 rounded-xl border ${
                    resumeMode
                      ? "bg-white text-slate-900 border-slate-300"
                      : "bg-sky-500/20 text-sky-200 border-sky-400/30 hover:bg-sky-500/30"
                  }`}
                >
                  GitHub
                </a>
                <a
                  href="#projects"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId("projects");
                  }}
                  className={`px-4 py-2 rounded-xl border ${
                    resumeMode
                      ? "bg-white text-slate-900 border-slate-300"
                      : "bg-slate-800/70 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  Projects
                </a>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId("contact");
                  }}
                  className={`px-4 py-2 rounded-xl border ${
                    resumeMode
                      ? "bg-white text-slate-900 border-slate-300"
                      : "bg-emerald-500/20 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/30"
                  }`}
                >
                  Contact
                </a>

                {/* Official logo pills (SVG/PNG in public/logos) */}
                <LogoPill src="logos/cmu.png" label="CMU" border={resumeMode ? "border-slate-300" : "border-red-400/30"} size="lg" />
                <LogoPill src="logos/gt.png"  label="GT"  border={resumeMode ? "border-slate-300" : "border-amber-400/30"} size="lg" />

                {/* Download PDF button (only in Resume Mode) */}
                {resumeMode && (
                  <a
                    href="resume.pdf" // place your PDF at public/resume.pdf
                    className="ml-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                    download
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>

            <div className="relative">
              <Card resumeMode={resumeMode}>
                <div className="p-6">
                  <p className={`text-sm ${resumeMode ? "text-slate-500" : "text-slate-400"}`}>Profile</p>
                  <h3 className={`text-xl font-semibold mt-1 ${resumeMode ? "text-slate-900" : "text-slate-100"}`}>
                    I build real-world systems
                  </h3>
                  <p className={`${resumeMode ? "text-slate-700" : "text-slate-300"} mt-3`}>
                    From secure RISC-V emulation and cryptography to NLP pipelines decoding legal bias, I ship systems
                    that are fast, safe, and human-centered.
                  </p>
                  <ul className={`mt-4 grid grid-cols-2 gap-2 text-sm ${resumeMode ? "text-slate-700" : "text-slate-300"}`}>
                    <li>Renode • RISC-V • Emulation</li>
                    <li>Django • React • Node</li>
                    <li>BERT • spaCy • NLP</li>
                    <li>Docker • Azure • C, C#, C++</li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </header>

        {/* About */}
        <section id="about" className="max-w-6xl mx-auto px-4 pb-20 scroll-mt-24">
          <SectionHeading title="About" subtitle="Engineer • Researcher • Builder" resumeMode={resumeMode} />
          <div className="grid md:grid-cols-3 gap-6">
            <Card resumeMode={resumeMode}>
              <div className="p-6">
                <h4 className={`text-lg font-semibold ${resumeMode ? "text-slate-900" : "text-slate-100"}`}>Mission</h4>
                <p className={`${resumeMode ? "text-slate-700" : "text-slate-300"} mt-2`}>
                  I write code that matters—using systems thinking to make products faster, safer, and more useful. I
                  care about performance, correctness, and design.
                </p>
              </div>
            </Card>
            <Card resumeMode={resumeMode}>
              <div className="p-6">
                <h4 className={`text-lg font-semibold ${resumeMode ? "text-slate-900" : "text-slate-100"}`}>
                  Focus Areas
                </h4>
                <ul className={`mt-2 space-y-1 text-sm ${resumeMode ? "text-slate-700" : "text-slate-300"}`}>
                  <li>• Secure embedded systems & hardware testing</li>
                  <li>• NLP + data pipelines, fintech, AI + ML</li>
                  <li>• Full-stack applications</li>
                </ul>
              </div>
            </Card>
            <Card resumeMode={resumeMode}>
              <div className="p-6">
                <h4 className={`text-lg font-semibold ${resumeMode ? "text-slate-900" : "text-slate-100"}`}>Hobbies</h4>
                <p className={`${resumeMode ? "text-slate-700" : "text-slate-300"} mt-2`}>
                  Basketball, guitar, thrifting, cooking, traveling, video editing, public speaking.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className="max-w-6xl mx-auto px-4 pb-20 scroll-mt-24">
          <SectionHeading title="Projects" subtitle="A few things I’ve shipped and explored" resumeMode={resumeMode} />
          <div className="grid md:grid-cols-2 gap-6">
            {PROJECTS.map((p, idx) => (
              <Card key={idx} resumeMode={resumeMode}>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3
                      className={`text-lg md:text-xl font-semibold ${
                        resumeMode ? "text-slate-900" : "text-slate-100"
                      }`}
                    >
                      {p.title}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {p.metrics.map((m, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700 ${
                            resumeMode ? "text-slate-200" : "text-slate-300"
                          }`}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className={`${resumeMode ? "text-slate-700" : "text-slate-300"} mt-3`}>{p.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.tags.map((t, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded-md border ${
                          resumeMode
                            ? "bg-slate-100 border-slate-300 text-slate-700"
                            : "bg-slate-800/70 border-slate-700 text-slate-400"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  {p.link && (
                    <div className="mt-4">
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${resumeMode ? "text-slate-700" : "text-sky-300"} hover:underline`}
                      >
                        View on GitHub
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section id="experience" className="max-w-6xl mx-auto px-4 pb-20 scroll-mt-24">
          <SectionHeading
            title="Experience"
            subtitle="What I’ve learned by building in the real world"
            resumeMode={resumeMode}
          />
          <div className="space-y-4">
            {EXPERIENCE.map((e, idx) => (
              <Card key={idx} resumeMode={resumeMode}>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-lg font-semibold ${
                        resumeMode ? "text-slate-900" : "text-slate-100"
                      }`}
                    >
                      {e.role} • <span className={`${resumeMode ? "text-slate-700" : "text-slate-300"}`}>{e.org}</span>
                    </h4>
                    <span className={`text-xs ${resumeMode ? "text-slate-500" : "text-slate-400"}`}>{e.time}</span>
                  </div>
                  <ul
                    className={`mt-2 list-disc list-inside text-sm space-y-1 ${
                      resumeMode ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    {e.pts.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section id="skills" className="max-w-6xl mx-auto px-4 pb-20 scroll-mt-24">
          <SectionHeading title="Skills" subtitle="Tools I use to think and build" resumeMode={resumeMode} />
          <Card resumeMode={resumeMode}>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((s, i) => (
                  <span
                    key={i}
                    className={`text-xs px-3 py-1 rounded-full border ${
                      resumeMode
                        ? "bg-slate-100 border-slate-300 text-slate-700"
                        : "bg-slate-800/80 border-slate-700 text-slate-300"
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Contact */}
        <section id="contact" className="max-w-6xl mx-auto px-4 pb-24 scroll-mt-24">
          <SectionHeading title="Contact" subtitle="Let’s build something game-changing" resumeMode={resumeMode} />
          <Card resumeMode={resumeMode}>
            <div className="p-6 grid md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <p className={`${resumeMode ? "text-slate-700" : "text-slate-300"} text-sm md:text-base`}>
                  Based in Atlanta, GA. Open to internships and research collaborations in systems, AI, and product
                  engineering.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="mailto:sdas393@gatech.edu"
                    className={`px-4 py-2 rounded-xl border ${
                      resumeMode
                        ? "bg-white text-slate-900 border-slate-300"
                        : "bg-emerald-500/20 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/30"
                    }`}
                  >
                    Email
                  </a>
                  <a
                    href="https://github.com/Skenix64"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-4 py-2 rounded-xl border ${
                      resumeMode
                        ? "bg-white text-slate-900 border-slate-300"
                        : "bg-sky-500/20 text-sky-200 border-sky-400/30 hover:bg-sky-500/30"
                    }`}
                  >
                    GitHub
                  </a>
                  <button
                    onClick={() => setResumeMode((v) => !v)}
                    className={`px-4 py-2 rounded-xl border ${
                      resumeMode
                        ? "bg-slate-900 text-white border-slate-700"
                        : "bg-slate-800/70 border-slate-700 hover:bg-slate-800 text-slate-200"
                    }`}
                  >
                    {resumeMode ? "Exit Resume Mode" : "Resume Mode"}
                  </button>
                </div>
              </div>
              <div className="justify-self-center md:justify-self-end">
                <div
                  className={`w-28 h-28 rounded-2xl border shadow-inner flex items-center justify-center ${
                    resumeMode
                      ? "bg-white border-slate-200"
                      : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700"
                  }`}
                >
                  <span className={`${resumeMode ? "text-slate-700" : "text-slate-400"} text-xs text-center`}>
                    Georgia Tech
                    <br />&<br />
                    CMU
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <footer className={`pb-10 text-center text-xs ${resumeMode ? "text-slate-600" : "text-slate-500"}`}>
          © {new Date().getFullYear()} Sarthak Das · Built with React · {resumeMode ? "Resume Mode" : "Dark theme"} ·
          Physics-powered
        </footer>
      </main>

      {easter && !resumeMode && <NBABall />}
    </div>
  );
}
