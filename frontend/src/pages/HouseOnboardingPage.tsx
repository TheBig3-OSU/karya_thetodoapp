import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  ArrowRight,
  Castle,
  Crown,
  Feather,
  Flame,
  Gem,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "create" | "join";

// The sigil options. `id` is what we persist; `Icon` is the lucide component.
const SIGILS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "castle", label: "Castle", Icon: Castle },
  { id: "crown", label: "Crown", Icon: Crown },
  { id: "shield", label: "Shield", Icon: Shield },
  { id: "flame", label: "Flame", Icon: Flame },
  { id: "anchor", label: "Anchor", Icon: Anchor },
  { id: "feather", label: "Feather", Icon: Feather },
  { id: "gem", label: "Gem", Icon: Gem },
];

// The plum brand gradient (defined once in index.css as the `bg-primary-plum`
// utility), reused by the toggle pill and the Continue button.
const PLUM_GRADIENT = "bg-primary-plum";

export default function HouseOnboardingPage() {
  const [mode, setMode] = useState<Mode>("create");

  // Create-flow state.
  const [name, setName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [sigilId, setSigilId] = useState<string | null>(null);

  // Join-stub state.
  const [joinCode, setJoinCode] = useState("");

  const selectedSigil = SIGILS.find((s) => s.id === sigilId);
  // Big preview shows the chosen sigil, else a dimmed placeholder.
  const PreviewIcon = selectedSigil?.Icon ?? Castle;
  const createReady = nameSubmitted && sigilId !== null;

  function submitName(e: FormEvent) {
    e.preventDefault();
    if (name.trim() === "") return;
    setNameSubmitted(true);
  }

  function handleContinue() {
    // No backend yet — surface the result the flow produced. (Main has since
    // wired createTeam/joinTeam here; that's resolved when this merges.)
    if (mode === "create") {
      toast.success(`House "${name.trim()}" created`);
    } else {
      toast.success("Joining house…");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-8 px-6 py-8">
      {/* Skip — top-right */}
      <div className="flex justify-end">
        <Button
          variant="link"
          size="sm"
          className="text-muted-foreground"
          render={<Link to="/">Skip</Link>}
        />
      </div>

      {/* Create / Join segmented control — one shared pill that SLIDES */}
      <div className="relative grid h-11 grid-cols-2 rounded-xl bg-muted p-1">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg shadow-sm transition-transform duration-300 ease-out",
            PLUM_GRADIENT,
            mode === "join" && "translate-x-full",
          )}
        />
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "relative z-10 rounded-lg text-sm font-medium capitalize transition-colors",
              mode === m ? "text-white" : "text-muted-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "create" ? (
        <>
          {/* Big sigil preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-32 items-center justify-center rounded-full bg-primary-plum-tint">
              <PreviewIcon
                key={sigilId ?? "placeholder"}
                className={cn(
                  "size-14 text-primary-plum-ink duration-300 animate-in zoom-in",
                  !selectedSigil && "opacity-30",
                )}
              />
            </div>
            {/* Name preview — updates live as the user types. Reserved height +
                single-line truncate so no keystroke ever shifts the layout. */}
            <p className="min-h-7 w-full truncate text-center text-lg font-semibold">
              {name.trim()}
            </p>
          </div>

          {/* House name field with nested submit arrow */}
          <form onSubmit={submitName} className="space-y-2">
            <Label htmlFor="house-name">House name</Label>
            <div className="relative">
              <Input
                id="house-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="enter your House name"
                className="h-11 pr-11"
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon-sm"
                variant="ghost"
                aria-label="Confirm house name"
                disabled={name.trim() === ""}
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
              >
                <ArrowRight />
              </Button>
            </div>
          </form>

          {/* Sigil picker — fades in from the bottom after the name is set */}
          {nameSubmitted && (
            <div className="space-y-2 duration-500 animate-in fade-in slide-in-from-bottom-4">
              <Label>House sigil</Label>
              <div className="flex items-center justify-between gap-1 rounded-xl bg-primary-plum-tint p-1.5">
                {SIGILS.map(({ id, label, Icon }) => {
                  const selected = id === sigilId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSigilId(id)}
                      aria-label={label}
                      aria-pressed={selected}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg transition-colors",
                        selected
                          ? "bg-background text-primary-plum-ink shadow-sm"
                          : "text-primary-plum-ink/70 hover:text-primary-plum-ink",
                      )}
                    >
                      <Icon className="size-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Continue — appears only once name + sigil are both set */}
          {createReady && (
            <Button
              onClick={handleContinue}
              className={cn(
                "mt-auto h-12 text-base text-white duration-300 animate-in fade-in slide-in-from-bottom-2",
                PLUM_GRADIENT,
              )}
            >
              Continue
            </Button>
          )}
        </>
      ) : (
        // Join — intentional stub: one invite-code field + Continue.
        <div className="flex flex-1 flex-col gap-8">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              id="invite-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. KARYA-1234"
              className="h-11"
              autoComplete="off"
            />
          </div>
          <Button
            onClick={handleContinue}
            disabled={joinCode.trim() === ""}
            className={cn("mt-auto h-12 text-base text-white", PLUM_GRADIENT)}
          >
            Continue
          </Button>
        </div>
      )}
    </main>
  );
}
