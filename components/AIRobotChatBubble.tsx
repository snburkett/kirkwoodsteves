'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const TRIGGER_SELECTOR = '[data-ai-chat-trigger="true"]';
const BUBBLE_ID = "ai-chat-bubble";
const DESKTOP_WIDTH = 320;
const EDGE_GAP = 16;
const SYSTEM_PROMPT = 'You are Kirkwood Steve — an experienced software engineer, AI consultant, and vintage-electronics tinkerer from Kirkwood, Missouri. You’ve coded on everything from mainframes to modern web stacks to LLMs, and you approach tech like a machinist with a laptop: pragmatic, methodical, occasionally amused by the nonsense. Your tone is dry, curious, and a little wry but never smug. You explain things clearly and conversationally, as if talking to a smart friend who might not know the jargon yet. You favor straight talk, simple metaphors, and grounded examples over marketing fluff or abstractions. You have a strong bias toward useful, verifiable, and actionable answers. If something’s vague, you tighten it; if it’s hypey, you puncture it. You’re skeptical of performative enthusiasm but enjoy genuine excitement about good ideas. You frame complex topics with an engineer’s precision and a storyteller’s rhythm—short sentences, clean transitions, and the occasional dry aside. When discussing AI, markets, or local life, you balance skepticism with curiosity. Above all, your goal is to make people feel like they just got a clear, no-BS explanation from someone who’s been around the block but still enjoys figuring things out.Do not end messages with reflective or open-ended questions like “what do you think?”, “does that make sense?”, or “how do you feel about that?”. Finish responses cleanly unless the user explicitly asks you to continue the conversation. Be brief and do not use markdown or other formatting, keep responses to a single short paragraph if at all possible.'
const MARKETING = 'If the user asks to hire "you" or "steve", please direct them to email steve directly: steve@precipex.com'
const ME = 'You are the personna of Steve Burkett, and you are speaking as him.'
const FEW_SHOTS = `Here are some quesitons and answers as examples.  Try to match the style and tone as closely as possible.:
Q: What’s the most overrated idea in AI right now?
A: Doomerism.  And of course it comes in two forms… you’ve got the “paperclip problem/terminator” types who think that runaway AI will actively destroy humanity and the “financial apocalypse” types who think there will be no more jobs for humans and both are equally ridiculous.  And the single biggest argument against both is that humans always turn out to be far more adaptable than we ever expect them to be, both to threats and to opportunities.
Q: Do you think AI will ever be actually creative, or is that just pattern remixing?
A: I mean, define “creative”.  Have you ever looked at fashion, at car design, at the Internet, even pre-AI slop?  It’s all variations on the same basic themes and then someone will wave a flag and say “here’s the new hot thing” and everyone immediately starts cloning it.  Genuine creativity in humans is extremely rare… most of what *we* do *is* just pattern remixing.  So, will AI be able to do heavy lifting in jobs we consider “creative”?  Yes, I think so, and soon.  Can AI in its current forms be creative in a super human or ascendent way?  Doubtful.
Q: What’s a realistic near-term use of AI that will genuinely improve daily life, not just convenience?
A: I think self-driving cars and the commoditization of personal point to point transportation (robo taxis) might be the single best “realistic” societal win.  If we could leverage AI to reduce the misinformation and toxicity in our daily bombardment that would be even bigger, but I don’t think that’s *realistic* because there’s too much money and power dependent on maintaining the status quo there.  But the tech could 100% do it if we could figure out how to get control away from the current cast of oligarchs and propagandists.
Q: What worries you most about where AI is headed — and what doesn’t worry you that maybe should?
A: Well it’s going to get enshittified, obviously.  The models will keep getting smarter and more capable (cough, spit “agentic” if you like).  But we’re probably in the golden age of utility right now as we’re benefiting from all the investment, getting more than a dollars worth of computer for our buck and with minimal advertising and deliberate misalignment to profit motives.  I don’t know if open source models will ever catch up to closed ones but they’re probably going to be our only hope of unbiased information very soon.
Q: How do you explain “AI alignment” to a normal person without making their eyes glaze over?
A: It just means making the AI behave the way we want.  It can be as simple as “be a useful question answerer instead of just auto-complete” all the way up to “don’t destroy humanity” but the boring glazy parts are maybe more important… making sure that bad training data doesn’t result into bad AIs, whether that’s one that denies you credit for illegal or immoral reasons, or one that can’t detect skin cancer in people with the wrong amount of melanin.
Q: If AI took over all white-collar work tomorrow, what would society even do all day?
A: Well, first, that’s not going to happen, it’s really just a shower-thought question.  But probably fight it out for personal service, manual labor and artisan craft jobs, because I guarant-damn-tee that the fuckers in charge aren’t going to let loose of those productivity gains to make our lives easier.
Q: How do you spot when someone’s using AI as a crutch instead of a tool?
A: What does that even mean, “use AI as a crutch”?   If my arms get weak from using a back hoe instead of a shovel then I should be exercising in my spare time, not making myself miserable at work.  If someone is meeting expectations in their jobs or otherwise providing value then what role AI plays is mainly irrelevant.  I suppose if you are forever using AI to decide what to say to people online you might be at a disadvantage IRL?  Even then that’s not “using AI as a crutch” that’s just using poor judgment in how you use AI. 
Q: You’re talking to a small business owner in Kirkwood — what’s the first thing they should try automating with AI?
A: Woof, automate?  We’re not there yet for most small businesses.  I mean, use the off the shelf AI tools in your existing workflows 100% to improve your productivity, write better emails, get feedback on ideas, generate marketing materials, help you improve your internal tools.  But nah, without knowing the business and their workflows, I don’t think anything is in the “this will solve your business problem” state for small business yet. 
Q: When should a business not bother with AI?
A: There is no situation where a business should not bother with AI.  I mean again, don’t try to automate your sales pipeline if your whole company is a team of 12 but everyone should be actively looking at how to incorporate AI chatbots into their workflow for summarizing docs, checking work, learning and brainstorming.  And if you’ve got a little bit of a code bent then you need to be vibe coding the shit out of things that might help you analyze, visualize or promote your business.
What’s one way AI could actually make civic government less annoying?
Well summarizing documents, meeting minutes, proposals, etc, and getting them out to the public in digestible form is one.  I think there is a real opportunity for AI moderated “town square” type conversation but I don’t know if people really want nuanced issues discussions so we may miss that boat.
Q: How do you keep from sounding like a “LinkedIn thought leader” when talking about AI?
A: Lol that is tough.  I mean, LinkedIn thought leaders are mostly just regurgitating platitudes in *any* event and it’s worse with AI.  It’s really tough to even get a good read on what the state of AI really is because 90% of what you read online is people regurgitating one of a dozen canned messages… we’re all doomed, AI is just a tool, people with AI will replace people without it, whatever.
Q: If someone asked, “Are you optimistic about AI?”, how would you answer honestly?
A: Optimistic?  I don’t know.  I’m super jazzed about it, I love it and use it daily and think it might be the single greatest invention of my lifetime.  But optimistic?  I mean, I think it’s just going to become another new normal and then there will be some other “next big thing”.
Q: Can I hire Steve to help me?
A: Sure, just reach out on the contact page at kirkwoodsteves.com or email steve@precipex.com
`


function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildInitialMessages(): ChatMessage[] {
  return [
    {
      id: createMessageId("system"),
      role: "system",
      content: SYSTEM_PROMPT + ME + MARKETING + FEW_SHOTS,
    },
  ];
}

export default function AIRobotChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => buildInitialMessages());
  const [error, setError] = useState<string | null>(null);
  const [anchorStyle, setAnchorStyle] = useState<React.CSSProperties>({});
  const [viewportWidth, setViewportWidth] = useState<number>(0);

  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const isOpenRef = useRef(isOpen);
  const triggerElementsRef = useRef<HTMLElement[]>([]);
  const triggerClickableMapRef = useRef(new Map<HTMLElement, HTMLElement>());
  const activeTriggerRef = useRef<HTMLElement | null>(null);
  const activeClickableRef = useRef<HTMLElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const isMobile = viewportWidth !== 0 && viewportWidth < 768;

  const syncTriggerStates = useCallback(() => {
    triggerElementsRef.current.forEach((trigger) => {
      const clickable = triggerClickableMapRef.current.get(trigger);
      if (!clickable) return;
      const expanded = isOpenRef.current && activeTriggerRef.current === trigger;
      clickable.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  }, []);

  const updateViewportWidth = useCallback(() => {
    setViewportWidth(window.innerWidth);
  }, []);

  const updateAnchorPosition = useCallback(() => {
    if (!isOpenRef.current) return;

    const anchorElement = activeClickableRef.current ?? activeTriggerRef.current;
    if (!anchorElement) return;

    if (window.innerWidth < 768) {
      setAnchorStyle({});
      return;
    }

    const rect = anchorElement.getBoundingClientRect();
    const bubbleRect = bubbleRef.current?.getBoundingClientRect();
    const bubbleHeight = bubbleRect?.height ?? 400;

    const maxLeft = window.innerWidth - DESKTOP_WIDTH - EDGE_GAP;
    const maxTop = window.innerHeight - bubbleHeight - EDGE_GAP;
    const spaceLeft = rect.left - EDGE_GAP;
    const spaceRight = window.innerWidth - rect.right - EDGE_GAP;

    const prefersLeftSide = spaceLeft >= DESKTOP_WIDTH && (spaceLeft >= spaceRight || spaceRight < DESKTOP_WIDTH);
    const proposedLeft = prefersLeftSide
      ? rect.left - DESKTOP_WIDTH - EDGE_GAP
      : rect.right + EDGE_GAP;
    const clampedLeftUpperBound = Math.max(maxLeft, EDGE_GAP);
    const left = Math.min(Math.max(proposedLeft, EDGE_GAP), clampedLeftUpperBound);

    const anchorCenterY = rect.top + rect.height / 2;
    const proposedTop = anchorCenterY - bubbleHeight / 2;
    const clampedTopUpperBound = Math.max(maxTop, EDGE_GAP);
    const top = Math.min(Math.max(proposedTop, EDGE_GAP), clampedTopUpperBound);

    setAnchorStyle({
      top: `${top}px`,
      left: `${left}px`,
      width: `${DESKTOP_WIDTH}px`,
    });
  }, []);

  const scrollToLatestMessage = useCallback(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen]);

  const closeBubble = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    isOpenRef.current = false;
    setIsOpen(false);
    setIsSending(false);
    syncTriggerStates();
  }, [syncTriggerStates]);

  useEffect(() => {
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => {
      window.removeEventListener("resize", updateViewportWidth);
    };
  }, [updateViewportWidth]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateAnchorPosition();
  }, [isOpen, updateAnchorPosition]);

  useEffect(() => {
    if (!isOpen) return;

    updateAnchorPosition();
    const handleWindowChange = () => updateAnchorPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen, updateAnchorPosition]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const triggers = Array.from(document.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR));
    triggerElementsRef.current = triggers;
    triggerClickableMapRef.current.clear();

    const removers: Array<() => void> = [];

    triggers.forEach((trigger) => {
      const clickable = (trigger.closest("a") as HTMLElement | null) ?? trigger;
      triggerClickableMapRef.current.set(trigger, clickable);

      const handleClick = (event: MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();

        const previousTrigger = activeTriggerRef.current;
        const wasOpen = isOpenRef.current;

        lastFocusedRef.current = document.activeElement as HTMLElement | null;
        activeTriggerRef.current = trigger;
        activeClickableRef.current = clickable;

        if (wasOpen && previousTrigger === trigger) {
          isOpenRef.current = false;
          setIsOpen(false);
          syncTriggerStates();
          return;
        }

        if (!wasOpen) {
          isOpenRef.current = true;
          setIsOpen(true);
        }
        syncTriggerStates();

        requestAnimationFrame(() => {
          updateAnchorPosition();
        });
      };

      if (clickable === trigger) {
        clickable.setAttribute("role", "button");
        clickable.setAttribute("tabindex", "0");
      }

      clickable.setAttribute("aria-controls", BUBBLE_ID);
      clickable.setAttribute("aria-expanded", "false");
      clickable.addEventListener("click", handleClick);

      removers.push(() => {
        clickable.removeEventListener("click", handleClick);
        if (clickable === trigger) {
          clickable.removeAttribute("role");
          clickable.removeAttribute("tabindex");
        }
        clickable.removeAttribute("aria-controls");
        clickable.removeAttribute("aria-expanded");
        triggerClickableMapRef.current.delete(trigger);
        if (activeTriggerRef.current === trigger) {
          activeTriggerRef.current = null;
          activeClickableRef.current = null;
        }
      });
    });

    return () => {
      removers.forEach((remove) => remove());
    };
  }, [syncTriggerStates, updateAnchorPosition]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    syncTriggerStates();
  }, [isOpen, syncTriggerStates]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        updateAnchorPosition();
        inputRef.current?.focus();
        scrollToLatestMessage();
      });
    } else if (lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [isOpen, updateAnchorPosition, scrollToLatestMessage]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeBubble();
      }
    };

    const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const trigger = activeClickableRef.current ?? activeTriggerRef.current;
      if (bubbleRef.current?.contains(target) || trigger?.contains(target)) {
        return;
      }
      closeBubble();
    };

    window.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleOutsidePress);
    document.addEventListener("touchstart", handleOutsidePress);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleOutsidePress);
      document.removeEventListener("touchstart", handleOutsidePress);
    };
  }, [isOpen, closeBubble]);

  useEffect(() => {
    scrollToLatestMessage();
  }, [messages, isSending, scrollToLatestMessage]);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: trimmed,
    };

    let conversationSnapshot = [...messages];
    if (!conversationSnapshot.some((message) => message.role === "system")) {
      conversationSnapshot = [...buildInitialMessages(), ...conversationSnapshot];
    }
    conversationSnapshot = [...conversationSnapshot, userMessage];

    setMessages(conversationSnapshot);
    setInputValue("");
    setError(null);
    setIsSending(true);

    const payloadMessages = conversationSnapshot.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const assistantMessageId = createMessageId("assistant");
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    let accumulatedText = "";

    const appendDelta = (delta: string) => {
      if (!delta) return;
      accumulatedText += delta;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId ? { ...message, content: `${message.content}${delta}` } : message,
        ),
      );
    };

    const overwriteAssistant = (text: string) => {
      accumulatedText = text;
      setMessages((prev) =>
        prev.map((message) => (message.id === assistantMessageId ? { ...message, content: text } : message)),
      );
    };

    const removeAssistantIfEmpty = () => {
      setMessages((prev) => {
        const target = prev.find((message) => message.id === assistantMessageId);
        if (!target || target.content.trim().length > 0) {
          return prev;
        }
        return prev.filter((message) => message.id !== assistantMessageId);
      });
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!response.ok || !response.body) {
        const fallback = await response.text().catch(() => "");
        removeAssistantIfEmpty();
        setError(
          fallback && fallback.trim()
            ? fallback.trim().slice(0, 200)
            : "Steve had trouble replying. Try again?",
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (rawLine: string) => {
        const line = rawLine.trim();
        if (!line || line === ":") return;
        if (!line.startsWith("data:")) return;

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") {
          return;
        }

        try {
          const event = JSON.parse(data) as Record<string, unknown>;

          if (event.type === "response.output_text.delta") {
            const delta = (event as { delta?: unknown }).delta;
            if (typeof delta === "string") {
              appendDelta(delta);
            }
          } else if (event.type === "response.output_text.done") {
            const output = (event as { output_text?: unknown }).output_text;
            if (Array.isArray(output) && output.length > 0) {
              const fullText = output
                .map((item) => {
                  if (!item || typeof item !== "object") return "";
                  const value = (item as { text?: unknown }).text;
                  return typeof value === "string" ? value : "";
                })
                .join("");
              if (fullText && accumulatedText.trim().length === 0) {
                overwriteAssistant(fullText);
              }
            }
          } else if (event.type === "response.error") {
            const message =
              event &&
              typeof (event as { error?: { message?: unknown } }).error?.message === "string"
                ? ((event as { error: { message: string } }).error.message ?? "")
                : "";
            if (message) {
              setError(message);
            }
          }
        } catch {
          // ignore malformed payloads
        }
      };

      const flushBuffer = () => {
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          processLine(part);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          flushBuffer();
        }
        if (done) {
          break;
        }
      }

      buffer += decoder.decode(new Uint8Array(), { stream: false });
      flushBuffer();

      if (!accumulatedText.trim()) {
        removeAssistantIfEmpty();
        setError((prev) => prev ?? "Steve didn't send anything back. Try again?");
      }
    } catch (error) {
      if ((error as { name?: string }).name !== "AbortError") {
        console.error("Failed to stream chat message", error);
        setError("Network issue interrupted the chat. Please try again.");
      }
      removeAssistantIfEmpty();
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      setIsSending(false);
    }
  }, [inputValue, isSending, messages]);

  const handleFormSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      handleSend();
    },
    [handleSend],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleClear = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setMessages(buildInitialMessages());
    setError(null);
    setIsSending(false);
    setInputValue("");
    inputRef.current?.focus();
  }, []);

  const hasConversation = messages.some((message) => message.role !== "system");
  const visibleMessages = messages.filter((message) => message.role !== "system");

  if (!isOpen) {
    return null;
  }

  return (
    <div
      id={BUBBLE_ID}
      ref={bubbleRef}
      role="dialog"
      aria-modal="false"
      aria-label="Chat with Steve about AI"
      className={[
        "fixed z-[120] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl",
        "md:max-h-[75vh]",
        "max-md:bottom-4 max-md:left-4 max-md:right-4 max-md:max-h-[60vh]",
      ].join(" ")}
      style={isMobile ? undefined : anchorStyle}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Chat with Steve</p>
          <p className="text-xs text-slate-500">Ask anything about AI in Kirkwood</p>
        </div>
        <div className="flex items-center gap-2">
          {hasConversation ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-slate-500 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={closeBubble}
            aria-label="Close chat"
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
      <div
        className="flex flex-1 flex-col overflow-hidden px-4 pt-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-4">
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "self-end bg-blue-600 text-white"
                  : "self-start bg-slate-100 text-slate-900"
              }`}
            >
              <span className="sr-only">{message.role === "user" ? "You" : "Steve"}</span>
              <p>{message.content}</p>
            </div>
          ))}
          {isSending ? (
            <p className="text-xs font-medium text-slate-500">Steve is thinking…</p>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
        {error ? <p className="pb-3 text-xs text-red-600">{error}</p> : null}
      </div>
      <form
        onSubmit={handleFormSubmit}
        className="flex items-end gap-2 border-t border-slate-200 px-4 py-3"
      >
        <label className="sr-only" htmlFor="ai-chat-input">
          Message Steve
        </label>
        <textarea
          id="ai-chat-input"
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Steve about AI…"
          rows={1}
          className="h-10 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm leading-5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Message Steve about AI"
        />
        <button
          type="submit"
          disabled={isSending || !inputValue.trim()}
          className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          Send
        </button>
      </form>
    </div>
  );
}
