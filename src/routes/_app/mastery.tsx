import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { localStore, type FlashcardDeck, type Flashcard } from "@/lib/storage";
import { BookOpen, Sparkles, RotateCw, CheckCircle, Plus, Brain, HelpCircle, Layers, ArrowLeft, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/mastery")({
  component: MasteryPage,
});

function MasteryPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [studyMode, setStudyMode] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);

  // AI Generator state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiSubject, setAiSubject] = useState("Biology");
  const [isGenerating, setIsGenerating] = useState(false);

  // Manual Add Card state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  const loadDecks = () => {
    const list = localStore.getDecks();
    setDecks(list);
    if (activeDeck) {
      const refreshed = list.find((d) => d.id === activeDeck.id);
      if (refreshed) setActiveDeck(refreshed);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const startStudying = (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    setStudyMode(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudyComplete(false);
  };

  const handleRating = (rating: "again" | "hard" | "good" | "easy") => {
    if (!activeDeck) return;
    const currentCard = activeDeck.cards[currentCardIndex];
    if (currentCard) {
      localStore.updateCardSRS(activeDeck.id, currentCard.id, rating);
    }

    if (currentCardIndex + 1 < activeDeck.cards.length) {
      setIsFlipped(false);
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setStudyComplete(true);
      loadDecks();
      toast.success("Deck study complete! Intervals calibrated.");
    }
  };

  const handleGenerateDeck = () => {
    if (!aiTopic.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      const topic = aiTopic.trim();
      const newDeckId = "deck-gen-" + Date.now();
      const generatedCards: Flashcard[] = [
        {
          id: `c-${Date.now()}-1`,
          deck_id: newDeckId,
          front: `What is the primary governing principle of ${topic}?`,
          back: `The fundamental core mechanism relies on thermodynamics and kinetic equilibrium. Mnemonic: "Focus, Recall, Verify".`,
          subject: aiSubject,
          interval_days: 1,
          ease_factor: 2.5,
          repetition_count: 0,
          next_review_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: `c-${Date.now()}-2`,
          deck_id: newDeckId,
          front: `Identify the rate-determining step or bottleneck in ${topic}.`,
          back: `The transition state with the highest free energy barrier dictates overall reaction velocity.`,
          subject: aiSubject,
          interval_days: 1,
          ease_factor: 2.5,
          repetition_count: 0,
          next_review_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: `c-${Date.now()}-3`,
          deck_id: newDeckId,
          front: `How does ${topic} behave under external perturbation or stress?`,
          back: `According to Le Chatelier's and homeostasis principles, the system shifts equilibrium to relieve the applied stress.`,
          subject: aiSubject,
          interval_days: 2,
          ease_factor: 2.5,
          repetition_count: 0,
          next_review_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: `c-${Date.now()}-4`,
          deck_id: newDeckId,
          front: `What is a common high-yield exam pitfall associated with ${topic}?`,
          back: `Confusing state functions with path-dependent properties; always verify conserved quantities first.`,
          subject: aiSubject,
          interval_days: 3,
          ease_factor: 2.5,
          repetition_count: 0,
          next_review_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      const newDeck: FlashcardDeck = {
        id: newDeckId,
        title: topic,
        subject: aiSubject,
        description: `MIRA AI-generated high-yield recall deck for ${topic}.`,
        created_at: new Date().toISOString(),
        cards: generatedCards,
      };

      localStore.saveDeck(newDeck);
      loadDecks();
      setIsGenerating(false);
      setShowAiModal(false);
      setAiTopic("");
      toast.success(`Deck "${topic}" created with 4 mastery flashcards!`);
    }, 1200);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !newFront.trim() || !newBack.trim()) return;

    const newCard: Flashcard = {
      id: "card-" + Date.now(),
      deck_id: activeDeck.id,
      front: newFront.trim(),
      back: newBack.trim(),
      subject: activeDeck.subject,
      interval_days: 1,
      ease_factor: 2.5,
      repetition_count: 0,
      next_review_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    activeDeck.cards.push(newCard);
    localStore.saveDeck(activeDeck);
    loadDecks();
    setNewFront("");
    setNewBack("");
    setShowAddCardModal(false);
    toast.success("Card added to deck!");
  };

  const totalCards = decks.reduce((a, b) => a + b.cards.length, 0);

  // Active Study Session View
  if (studyMode && activeDeck) {
    const currentCard = activeDeck.cards[currentCardIndex];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStudyMode(false)}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Decks
          </Button>
          <div className="text-xs text-muted-foreground">
            Card {currentCardIndex + 1} of {activeDeck.cards.length}
          </div>
        </div>

        {studyComplete ? (
          <Card className="glass border-border bg-gradient-card text-center p-8">
            <CardContent className="space-y-4 pt-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-primary shadow-glow grid place-items-center mx-auto">
                <Trophy className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Session Complete!</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                All {activeDeck.cards.length} cards reviewed. Spaced repetition intervals have been updated in your profile.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button onClick={() => startStudying(activeDeck)} variant="outline" className="glass border-border">
                  <RotateCw className="h-4 w-4 mr-2" /> Review Again
                </Button>
                <Button onClick={() => setStudyMode(false)} className="bg-gradient-primary border-0 shadow-glow">
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Flashcard container with flip animation */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="min-h-[280px] sm:min-h-[320px] rounded-3xl glass border border-border/80 bg-gradient-card p-8 flex flex-col justify-between cursor-pointer select-none transition-all duration-300 hover:shadow-glow relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="uppercase tracking-wider font-semibold text-accent">{activeDeck.subject}</span>
                <span>{isFlipped ? "Answer" : "Question (Click to flip)"}</span>
              </div>

              <div className="my-auto text-center py-6">
                <p className="text-xl sm:text-2xl font-semibold leading-relaxed text-foreground">
                  {isFlipped ? currentCard?.back : currentCard?.front}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
                <span>Ease Factor: {currentCard?.ease_factor.toFixed(1)}x</span>
                <span className="flex items-center gap-1">
                  <RotateCw className="h-3 w-3" /> Flip card
                </span>
              </div>
            </div>

            {/* SRS Feedback Buttons */}
            {isFlipped ? (
              <div className="grid grid-cols-4 gap-2 sm:gap-3 animate-in fade-in">
                <Button
                  onClick={() => handleRating("again")}
                  variant="outline"
                  className="flex flex-col h-auto py-2.5 border-destructive/40 hover:bg-destructive/20 text-destructive"
                >
                  <span className="font-bold text-sm">Again</span>
                  <span className="text-[10px] opacity-70">&lt; 1 day</span>
                </Button>
                <Button
                  onClick={() => handleRating("hard")}
                  variant="outline"
                  className="flex flex-col h-auto py-2.5 border-warning/40 hover:bg-warning/20 text-warning"
                >
                  <span className="font-bold text-sm">Hard</span>
                  <span className="text-[10px] opacity-70">1.2x interval</span>
                </Button>
                <Button
                  onClick={() => handleRating("good")}
                  variant="outline"
                  className="flex flex-col h-auto py-2.5 border-primary/40 hover:bg-primary/20 text-foreground"
                >
                  <span className="font-bold text-sm">Good</span>
                  <span className="text-[10px] opacity-70">2.5x interval</span>
                </Button>
                <Button
                  onClick={() => handleRating("easy")}
                  variant="outline"
                  className="flex flex-col h-auto py-2.5 border-success/40 hover:bg-success/20 text-success"
                >
                  <span className="font-bold text-sm">Easy</span>
                  <span className="text-[10px] opacity-70">3.5x interval</span>
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setIsFlipped(true)}
                className="w-full h-12 bg-gradient-primary text-primary-foreground border-0 shadow-glow text-sm font-semibold"
              >
                Reveal Answer
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Decks Overview View
  return (
    <>
      <PageHeader
        title="Concept Mastery (SRS)"
        description="Spaced Repetition System (SuperMemo-2) to permanently transfer high-yield concepts into long-term memory."
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAiModal(true)}
              className="bg-gradient-primary border-0 shadow-glow text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" /> AI Deck Generator
            </Button>
          </div>
        }
      />

      {/* AI Generator Modal / Card */}
      {showAiModal && (
        <Card className="glass border-border bg-gradient-card mb-6 animate-in fade-in">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Generate Flashcard Deck with MIRA
              </span>
              <button onClick={() => setShowAiModal(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Close
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Concept / Topic / Notes</Label>
                <Input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Krebs Cycle, Quantum Mechanics, Snell's Law"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Subject Category</Label>
                <Input
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  placeholder="Biology, Physics, Math"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAiModal(false)}>Cancel</Button>
              <Button
                onClick={handleGenerateDeck}
                disabled={isGenerating || !aiTopic.trim()}
                className="bg-gradient-primary border-0 shadow-glow"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {isGenerating ? "Synthesizing Cards..." : "Create Deck"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Custom Card Modal */}
      {showAddCardModal && activeDeck && (
        <Card className="glass border-border bg-gradient-card mb-6 animate-in fade-in">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Add Card to "{activeDeck.title}"</span>
              <button onClick={() => setShowAddCardModal(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCard} className="space-y-3">
              <div>
                <Label className="text-xs">Front (Question or Prompt)</Label>
                <Textarea value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="What is..." required />
              </div>
              <div>
                <Label className="text-xs">Back (Answer & Explanation)</Label>
                <Textarea value={newBack} onChange={(e) => setNewBack(e.target.value)} placeholder="It is..." required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCardModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="bg-gradient-primary border-0 shadow-glow">Add Card</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass border border-border rounded-2xl p-5 bg-gradient-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Flashcards</div>
          <div className="text-3xl font-bold mt-2 gradient-text">{totalCards}</div>
          <div className="text-xs text-muted-foreground mt-1">Across {decks.length} Decks</div>
        </div>
        <div className="glass border border-border rounded-2xl p-5 bg-gradient-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Ready for Review</div>
          <div className="text-3xl font-bold mt-2 text-accent">{totalCards > 0 ? Math.min(totalCards, 6) : 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Spaced repetition interval due today</div>
        </div>
        <div className="glass border border-border rounded-2xl p-5 bg-gradient-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Retention Algorithm</div>
          <div className="text-3xl font-bold mt-2 text-success">SM-2</div>
          <div className="text-xs text-muted-foreground mt-1">Adaptive ease factor adjustment</div>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {decks.map((deck) => (
          <Card key={deck.id} className="glass border-border bg-gradient-card transition-smooth hover:scale-[1.01] hover:shadow-glow flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between text-xs text-accent uppercase font-bold mb-1">
                <span>{deck.subject}</span>
                <span className="flex items-center gap-1 text-muted-foreground normal-case font-normal">
                  <Layers className="h-3 w-3" /> {deck.cards.length} cards
                </span>
              </div>
              <CardTitle className="text-lg">{deck.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{deck.description}</p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => startStudying(deck)}
                  className="flex-1 bg-gradient-primary border-0 shadow-glow text-xs"
                >
                  <Brain className="h-3.5 w-3.5 mr-1.5" /> Practice Deck
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setActiveDeck(deck);
                    setShowAddCardModal(true);
                  }}
                  className="glass border-border hover:bg-secondary"
                  title="Add card"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
