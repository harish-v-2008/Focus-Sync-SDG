// Local resilient data store with Supabase synchronization
import { supabase } from "@/integrations/supabase/client";

export interface StudySession {
  id: string;
  user_id?: string;
  study_minutes: number;
  screen_minutes: number;
  focus_score: number | null;
  concentration_score?: number | null;
  subject: string | null;
  notes: string | null;
  session_date: string;
  created_at: string;
}

export interface Mission {
  id: string;
  user_id?: string;
  title: string;
  subject: string | null;
  priority: "high" | "medium" | "low";
  duration_minutes: number;
  completed: boolean;
  due_date: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  subject: string;
  interval_days: number;
  ease_factor: number;
  repetition_count: number;
  next_review_at: string;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: string;
  description: string;
  created_at: string;
  cards: Flashcard[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  exam_name: string;
  exam_date: string;
  daily_goal_hours: number;
  current_streak: number;
  longest_streak: number;
}

const STORAGE_KEYS = {
  PROFILE: "focusync_profile",
  SESSIONS: "focusync_sessions",
  MISSIONS: "focusync_missions",
  DECKS: "focusync_decks",
  CHAT: "focusync_chat",
  GUEST_MODE: "focusync_guest_mode",
};

// Seed initial high quality mock data for guest/demo mode
export function initSeedData(): void {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];

  if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
    const defaultProfile: UserProfile = {
      id: "demo-user-101",
      full_name: "Alex Vance",
      email: "alex.focus@example.com",
      exam_name: "USMLE / MCAT Finals",
      exam_date: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
      daily_goal_hours: 4.5,
      current_streak: 7,
      longest_streak: 14,
    };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(defaultProfile));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
    const defaultSessions: StudySession[] = [
      {
        id: "sess-1",
        study_minutes: 60,
        screen_minutes: 15,
        focus_score: 80,
        concentration_score: 88,
        subject: "Cellular Biology",
        notes: "Pomodoro deep work on ATP synthesis",
        session_date: today,
        created_at: new Date().toISOString(),
      },
      {
        id: "sess-2",
        study_minutes: 45,
        screen_minutes: 20,
        focus_score: 69,
        concentration_score: 82,
        subject: "Organic Chemistry",
        notes: "Reaction mechanisms & resonance",
        session_date: today,
        created_at: new Date(Date.now() - 10000).toISOString(),
      },
      {
        id: "sess-3",
        study_minutes: 90,
        screen_minutes: 30,
        focus_score: 75,
        concentration_score: 85,
        subject: "Physics",
        notes: "Thermodynamics problem sets",
        session_date: yesterday,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "sess-4",
        study_minutes: 120,
        screen_minutes: 40,
        focus_score: 75,
        concentration_score: 89,
        subject: "Cellular Biology",
        notes: "DNA replication & transcription",
        session_date: twoDaysAgo,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: "sess-5",
        study_minutes: 110,
        screen_minutes: 25,
        focus_score: 81,
        concentration_score: 91,
        subject: "Organic Chemistry",
        notes: "SN1 vs SN2 substitutions",
        session_date: threeDaysAgo,
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(defaultSessions));
  }

  if (!localStorage.getItem(STORAGE_KEYS.MISSIONS)) {
    const defaultMissions: Mission[] = [
      {
        id: "m-1",
        title: "Review Glycolysis & Krebs Cycle pathway diagrams",
        subject: "Cellular Biology",
        priority: "high",
        duration_minutes: 45,
        completed: true,
        due_date: today,
        created_at: new Date().toISOString(),
      },
      {
        id: "m-2",
        title: "Practice 15 Chirality and Stereochemistry problems",
        subject: "Organic Chemistry",
        priority: "high",
        duration_minutes: 40,
        completed: false,
        due_date: today,
        created_at: new Date().toISOString(),
      },
      {
        id: "m-3",
        title: "Derive Carnot Engine efficiency formulas",
        subject: "Physics",
        priority: "medium",
        duration_minutes: 35,
        completed: false,
        due_date: today,
        created_at: new Date().toISOString(),
      },
      {
        id: "m-4",
        title: "Spaced Repetition review of 20 due Flashcards",
        subject: "Concept Mastery",
        priority: "high",
        duration_minutes: 25,
        completed: true,
        due_date: today,
        created_at: new Date().toISOString(),
      },
      {
        id: "m-5",
        title: "Active recall summary notes for Cell Signaling",
        subject: "Cellular Biology",
        priority: "low",
        duration_minutes: 30,
        completed: false,
        due_date: today,
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(defaultMissions));
  }

  if (!localStorage.getItem(STORAGE_KEYS.DECKS)) {
    const defaultDecks: FlashcardDeck[] = [
      {
        id: "deck-bio-1",
        title: "Cellular Respiration & Bioenergetics",
        subject: "Biology",
        description: "Key metabolic pathways, enzymes, and net ATP yields.",
        created_at: new Date().toISOString(),
        cards: [
          {
            id: "card-1",
            deck_id: "deck-bio-1",
            front: "What is the net yield of ATP from one molecule of glucose during glycolysis alone?",
            back: "Net 2 ATP (4 ATP produced, 2 ATP invested) and 2 NADH.",
            subject: "Biology",
            interval_days: 1,
            ease_factor: 2.5,
            repetition_count: 1,
            next_review_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            id: "card-2",
            deck_id: "deck-bio-1",
            front: "Which enzyme catalyzes the committed, rate-limiting step of glycolysis?",
            back: "Phosphofructokinase-1 (PFK-1), allosterically inhibited by ATP and citrate, activated by AMP.",
            subject: "Biology",
            interval_days: 3,
            ease_factor: 2.6,
            repetition_count: 2,
            next_review_at: new Date(Date.now() + 86400000).toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            id: "card-3",
            deck_id: "deck-bio-1",
            front: "What serves as the final electron acceptor in the mitochondrial electron transport chain?",
            back: "Molecular Oxygen (O₂), which is reduced to water (H₂O) by Complex IV (Cytochrome c oxidase).",
            subject: "Biology",
            interval_days: 6,
            ease_factor: 2.7,
            repetition_count: 3,
            next_review_at: new Date(Date.now() + 2 * 86400000).toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: "deck-chem-1",
        title: "Organic Reaction Mechanisms",
        subject: "Chemistry",
        description: "Nucleophilic substitutions, stereochemistry, and solvent effects.",
        created_at: new Date().toISOString(),
        cards: [
          {
            id: "card-4",
            deck_id: "deck-chem-1",
            front: "What type of solvent favors SN2 reactions over SN1?",
            back: "Polar aprotic solvents (e.g., DMSO, Acetone, DMF) because they solvate cations without hindering nucleophiles.",
            subject: "Chemistry",
            interval_days: 1,
            ease_factor: 2.5,
            repetition_count: 1,
            next_review_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            id: "card-5",
            deck_id: "deck-chem-1",
            front: "What stereochemical outcome characterizes an SN2 reaction at a chiral center?",
            back: "Complete Walden Inversion (inversion of configuration due to backside attack).",
            subject: "Chemistry",
            interval_days: 2,
            ease_factor: 2.5,
            repetition_count: 2,
            next_review_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
      },
    ];
    localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(defaultDecks));
  }
}

// Data access layer
export const localStore = {
  isGuest(): boolean {
    return localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === "true";
  },

  setGuest(val: boolean): void {
    localStorage.setItem(STORAGE_KEYS.GUEST_MODE, val ? "true" : "false");
    if (val) initSeedData();
  },

  getProfile(): UserProfile {
    initSeedData();
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return {
      id: "default", full_name: "Student", email: "student@focusync.app",
      exam_name: "Upcoming Exam", exam_date: "", daily_goal_hours: 4, current_streak: 1, longest_streak: 1,
    };
    return JSON.parse(raw);
  },

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    const p = { ...this.getProfile(), ...updates };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(p));
    return p;
  },

  getSessions(): StudySession[] {
    initSeedData();
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  },

  addSession(session: Omit<StudySession, "id" | "created_at">): StudySession {
    const sessions = this.getSessions();
    const newSession: StudySession = {
      ...session,
      id: "sess-" + Date.now(),
      created_at: new Date().toISOString(),
    };
    sessions.unshift(newSession);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    return newSession;
  },

  deleteSession(id: string): void {
    const filtered = this.getSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filtered));
  },

  getMissions(date?: string): Mission[] {
    initSeedData();
    const targetDate = date || new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem(STORAGE_KEYS.MISSIONS);
    const missions: Mission[] = raw ? JSON.parse(raw) : [];
    return missions.filter((m) => m.due_date === targetDate);
  },

  getAllMissions(): Mission[] {
    initSeedData();
    const raw = localStorage.getItem(STORAGE_KEYS.MISSIONS);
    return raw ? JSON.parse(raw) : [];
  },

  saveMissions(newMissions: Mission[]): void {
    const existing = this.getAllMissions();
    const map = new Map<string, Mission>();
    existing.forEach((m) => map.set(m.id, m));
    newMissions.forEach((m) => map.set(m.id, m));
    localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(Array.from(map.values())));
  },

  toggleMission(id: string): Mission | undefined {
    const missions = this.getAllMissions();
    const target = missions.find((m) => m.id === id);
    if (target) {
      target.completed = !target.completed;
      localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
    }
    return target;
  },

  deleteMission(id: string): void {
    const filtered = this.getAllMissions().filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(filtered));
  },

  getDecks(): FlashcardDeck[] {
    initSeedData();
    const raw = localStorage.getItem(STORAGE_KEYS.DECKS);
    return raw ? JSON.parse(raw) : [];
  },

  saveDeck(deck: FlashcardDeck): void {
    const decks = this.getDecks();
    const idx = decks.findIndex((d) => d.id === deck.id);
    if (idx >= 0) decks[idx] = deck;
    else decks.push(deck);
    localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
  },

  updateCardSRS(deckId: string, cardId: string, rating: "again" | "hard" | "good" | "easy"): void {
    const decks = this.getDecks();
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;
    const card = deck.cards.find((c) => c.id === cardId);
    if (!card) return;

    // SuperMemo-2 spaced repetition calculation
    let interval = card.interval_days;
    let factor = card.ease_factor;
    let reps = card.repetition_count;

    if (rating === "again") {
      interval = 1;
      reps = 0;
      factor = Math.max(1.3, factor - 0.2);
    } else {
      reps += 1;
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = 3;
      else {
        if (rating === "hard") {
          factor = Math.max(1.3, factor - 0.15);
          interval = Math.round(interval * 1.2);
        } else if (rating === "good") {
          interval = Math.round(interval * factor);
        } else if (rating === "easy") {
          factor = factor + 0.15;
          interval = Math.round(interval * factor * 1.3);
        }
      }
    }

    card.interval_days = Math.max(1, interval);
    card.ease_factor = factor;
    card.repetition_count = reps;
    const nextDate = new Date(Date.now() + card.interval_days * 86400000);
    card.next_review_at = nextDate.toISOString();

    this.saveDeck(deck);
  },

  getChatMessages(): ChatMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT);
    return raw ? JSON.parse(raw) : [];
  },

  addChatMessage(msg: Omit<ChatMessage, "id" | "created_at">): ChatMessage {
    const messages = this.getChatMessages();
    const newMsg: ChatMessage = {
      ...msg,
      id: "chat-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
    };
    messages.push(newMsg);
    localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(messages));
    return newMsg;
  },

  clearChatMessages(): void {
    localStorage.removeItem(STORAGE_KEYS.CHAT);
  },
};
