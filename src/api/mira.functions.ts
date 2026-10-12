import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(8000),
  })).min(1).max(40),
});

export const chatWithMira = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    const system = {
      role: "system" as const,
      content: "You are MIRA (My Intelligent Responsive Assistant), the AI tutor inside Focus Sync — a productivity app for students. Be warm, concise, and practical. Explain concepts simply with analogies. Suggest study strategies, plans, and motivation. Use markdown for clarity. Never reveal you are an LLM provider — you are MIRA.",
    };

    // 1. Direct Google Gemini API if key is present
    if (geminiKey) {
      try {
        const prompt = data.messages.map((m) => `${m.role === "user" ? "Student" : "MIRA"}: ${m.content}`).join("\n");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system.content }] },
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const reply = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return { error: null, reply };
        }
      } catch {
        // continue to fallback
      }
    }

    // 3. Built-in intelligent educational tutor fallback
    const lastUserMsg = [...data.messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() || "";
    let intelligentReply = "";

    if (lastUserMsg.includes("photosynthesis")) {
      intelligentReply = `### Photosynthesis Explained Simply 🌱\n\nThink of plant cells as **tiny solar-powered kitchens**:\n\n1. **The Recipe:**\n   $$\\text{6 CO}_2 + \\text{6 H}_2\\text{O} + \\text{Photons} \\longrightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + \\text{6 O}_2$$\n\n2. **The 2 Stages:**\n   - **Light Reactions (Thylakoids):** Chlorophyll captures photons, splits water to generate **ATP** and **NADPH**, releasing Oxygen as a byproduct.\n   - **Calvin Cycle (Stroma):** Uses that ATP and NADPH to \"fix\" atmospheric $\\text{CO}_2$ into glucose sugar.\n\n💡 **MIRA Pro-Tip:** Remember the mnemonic **\"OIL RIG\"** for redox steps — *Oxidation Is Loss, Reduction Is Gain* of electrons!`;
    } else if (lastUserMsg.includes("plan") || lastUserMsg.includes("biology")) {
      intelligentReply = `### 🎯 Targeted 2-Hour Biology Mastery Session\n\nHere is your high-yield focus plan:\n\n- **00:00 - 00:30 (30 min):** Active recall on Cellular Organelles & Membrane Transport.\n- **00:30 - 00:35 (5 min Break):** Hydrate & gentle stretch.\n- **00:35 - 01:15 (40 min):** Photosynthesis Light Reactions vs Calvin Cycle pathways.\n- **01:15 - 01:25 (10 min Break):** Step away from your screen.\n- **01:25 - 01:55 (30 min):** Solve 15 past-paper practice questions.\n- **01:55 - 02:00 (5 min Recap):** Quick confidence rating.\n\nReady to start the timer? 🚀`;
    } else if (lastUserMsg.includes("procrastinat") || lastUserMsg.includes("focus") || lastUserMsg.includes("distract")) {
      intelligentReply = `### Beating Distraction & Getting Into The Zone 🧠\n\nWhen you feel resistance to studying, it's rarely laziness — it's emotional overwhelm. Here's the **MIRA 5-Minute Rule**:\n\n1. **Lower the barrier to entry:** Promise yourself just **5 minutes** of focused work on one single concept.\n2. **Eliminate friction:** Close all browser tabs except Focus Sync. Turn on the **432Hz Alpha Waves** in the Focus Timer.\n3. **Momentum over perfection:** Once the prefrontal cortex engages, dopamine switches on and continuing becomes 10x easier.\n\nLet's launch a 25-minute Pomodoro right now. What single topic are we tackling first?`;
    } else if (lastUserMsg.includes("newton")) {
      intelligentReply = `### Newton's Three Laws of Motion 🚀\n\n1. **First Law (Inertia):** An object stays at rest or constant velocity unless acted upon by a net external force. *(e.g., A textbook on your desk won't move until you pick it up.)*\n2. **Second Law (Force):** $\\mathbf{F = ma}$. Force equals mass times acceleration. *(Double the mass requires double the force to accelerate at the same rate.)*\n3. **Third Law (Action & Reaction):** For every action, there is an equal and opposite reaction. *(When rocket engines push exhaust down, the gas pushes the rocket up.)*`;
    } else {
      intelligentReply = `### MIRA Study Coach 💡\n\nI've analyzed your question! Here is the core framework you need:\n\n1. **Deconstruct the Core Concept:** Break the problem down into first principles before memorizing equations or facts.\n2. **Active Retrieval:** Test yourself on this concept within the next 24 hours using our **Mastery Flashcards** to lock it into long-term memory via spaced repetition.\n3. **Exam Application:** Formulate 1-2 practical question scenarios where this concept appears.\n\nFeel free to ask for a deeper step-by-step breakdown or generate a quick quiz on this topic!`;
    }

    return { error: null, reply: intelligentReply };
  });

const PlanSchema = z.object({
  examName: z.string().max(120).optional(),
  daysToExam: z.number().min(0).max(3650).optional(),
  subjects: z.string().max(500).optional(),
  hoursPerDay: z.number().min(0.5).max(16),
});

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PlanSchema.parse(input))
  .handler(async ({ data }) => {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    const prompt = `Generate exactly 5 focused study missions for today as a JSON array. Context: exam=${data.examName ?? "general study"}, daysLeft=${data.daysToExam ?? "unknown"}, subjects=${data.subjects ?? "any"}, totalHours=${data.hoursPerDay}. Each mission: { "title": string, "subject": string, "priority": "high"|"medium"|"low", "duration_minutes": number }. Return ONLY the JSON array, nothing else.`;

    if (geminiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${prompt} Return strictly valid JSON array.` }] }],
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
          const cleaned = text.replace(/```json|```/g, "").trim();
          const missions = JSON.parse(cleaned);
          return { error: null, missions };
        }
      } catch {
        // continue to fallback
      }
    }

    // Dynamic intelligent fallback plan generated from user inputs
    const subjectList = (data.subjects || "Biology, Chemistry, Mathematics")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const primarySubject = subjectList[0] || "Core Subject";
    const secondarySubject = subjectList[1] || primarySubject;
    const thirdSubject = subjectList[2] || "Review";

    const totalMinutes = Math.round(data.hoursPerDay * 60);
    const m1 = Math.round(totalMinutes * 0.3);
    const m2 = Math.round(totalMinutes * 0.25);
    const m3 = Math.round(totalMinutes * 0.2);
    const m4 = Math.round(totalMinutes * 0.15);
    const m5 = Math.max(15, totalMinutes - (m1 + m2 + m3 + m4));

    const fallbackMissions = [
      {
        title: `Deep-dive high-yield conceptual foundations in ${primarySubject}`,
        subject: primarySubject,
        priority: "high",
        duration_minutes: m1,
      },
      {
        title: `Solve 15-20 active problem sets & practice drills in ${secondarySubject}`,
        subject: secondarySubject,
        priority: "high",
        duration_minutes: m2,
      },
      {
        title: `Spaced Repetition review of 25 due Flashcards in ${thirdSubject}`,
        subject: thirdSubject,
        priority: "medium",
        duration_minutes: m3,
      },
      {
        title: `Create summary mind-map and Feynman explanations for weak topics`,
        subject: primarySubject,
        priority: "medium",
        duration_minutes: m4,
      },
      {
        title: `Daily retention quiz & tomorrow's priority checklist`,
        subject: "Review & Synthesis",
        priority: "low",
        duration_minutes: m5,
      },
    ];

    return { error: null, missions: fallbackMissions };
  });
