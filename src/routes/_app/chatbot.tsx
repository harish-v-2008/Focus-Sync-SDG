import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Loader2, Volume2, VolumeX, Trash2, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { chatWithMira } from "@/api/mira.functions";
import { localStore } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/chatbot")({
  component: ChatbotPage,
});

interface Msg { id?: string; role: "user" | "assistant"; content: string }

function ChatbotPage() {
  const { user } = useAuth();
  const chat = useServerFn(chatWithMira);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Load from local store first for instant UI response
    const stored = localStore.getChatMessages();
    if (stored.length > 0) {
      setMessages(stored);
    }

    // 2. Also sync with Supabase if online user exists
    if (user && user.id !== "guest-user-101") {
      supabase.from("chat_messages").select("id, role, content").eq("user_id", user.id)
        .order("created_at").limit(50).then(({ data }) => {
          if (data && data.length > 0) {
            setMessages(data as Msg[]);
          }
        });
    }
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speakText = (text: string, index: number) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Speech synthesis not supported in this browser");
      return;
    }
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    // Clean markdown hashes/asterisks for natural speech
    const clean = text.replace(/[#*`_$\\]/g, "");
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const clearChat = () => {
    localStore.clearChatMessages();
    setMessages([]);
    window.speechSynthesis.cancel();
    toast.info("Conversation cleared");
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    const userMsg: Msg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    // Save to local store
    localStore.addChatMessage(userMsg);

    // Save to Supabase if authenticated
    if (user && user.id !== "guest-user-101") {
      supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: userMsg.content }).then();
    }

    try {
      const result = await chat({ data: { messages: newMsgs.map((m) => ({ role: m.role, content: m.content })) } });
      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      const reply: Msg = { role: "assistant", content: result.reply };
      setMessages((m) => [...m, reply]);
      localStore.addChatMessage(reply);

      if (user && user.id !== "guest-user-101") {
        supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: reply.content }).then();
      }
    } catch {
      // Fallback response in case network call throws
      const fallback: Msg = {
        role: "assistant",
        content: `### MIRA Study Assistant 💡\n\nI received your query about **"${text}"**!\n\nTo master this effectively:\n1. **Feynman Technique:** Explain this concept in plain language without jargon.\n2. **Targeted Flashcards:** Generate active recall cards on this subject.\n3. **Spaced Interval:** Schedule a 15-minute review block tomorrow in your AI Planner.`,
      };
      setMessages((m) => [...m, fallback]);
      localStore.addChatMessage(fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-5rem)]">
      <PageHeader
        title="MIRA"
        description="My Intelligent Responsive Assistant — your AI tutor."
        actions={
          messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearChat} className="glass border-border text-xs gap-1.5 hover:bg-secondary">
              <Trash2 className="h-3.5 w-3.5 text-destructive" /> Clear Chat
            </Button>
          )
        }
      />

      <Card className="glass border-border bg-gradient-card flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="h-16 w-16 rounded-2xl bg-gradient-primary shadow-glow grid place-items-center mb-4 animate-pulse-glow">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold">Hi, I'm MIRA</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Ask me anything — concept breakdowns, active recall practice, study strategies, or motivation.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-md">
                {[
                  "Explain photosynthesis simply",
                  "Make a 2h biology plan",
                  "How do I beat procrastination?",
                  "Summarize Newton's laws",
                  "Generate 5 flashcards for organic chemistry",
                  "Quiz me on cellular respiration",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="glass rounded-xl px-3 py-2 text-xs text-left hover:bg-secondary transition-smooth border border-border/50 text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm relative group ${
                  m.role === "user"
                    ? "bg-gradient-primary text-primary-foreground rounded-tr-sm shadow-glow"
                    : "glass rounded-tl-sm border border-border/60"
                }`}
              >
                {m.role === "assistant" ? (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-border/40 text-xs text-accent">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> MIRA Tutor
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => speakText(m.content, i)}
                          title="Read aloud"
                          className="p-1 hover:text-foreground transition-colors"
                        >
                          {speakingIndex === i ? <VolumeX className="h-3.5 w-3.5 text-warning animate-pulse" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(m.content, i)}
                          title="Copy response"
                          className="p-1 hover:text-foreground transition-colors"
                        >
                          {copiedIndex === i ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none [&_*]:text-foreground [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-secondary/70 [&_pre]:p-3 [&_pre]:rounded-xl [&_h3]:text-accent [&_h3]:mt-2">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="glass rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> MIRA is thinking...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </CardContent>

        <div className="border-t border-border p-3 flex gap-2 glass">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask MIRA anything (concepts, plans, questions)..."
            disabled={loading}
            className="flex-1 bg-background/50 border-border"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || loading}
            className="bg-gradient-primary border-0 shadow-glow px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
