"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";

export default function ChatBat() {
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerAnimation = useCallback(() => {
    if (!isAnimating) {
      setIsAnimating(true);
    }
  }, [isAnimating]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerAnimation();
      }
    },
    [triggerAnimation],
  );

  const handleAnimationEnd = useCallback(() => {
    setIsAnimating(false);
  }, []);

  return (
    <div
      className="chat-bat-trigger"
      role="button"
      tabIndex={0}
      aria-label="Summon the chat bat"
      onMouseEnter={triggerAnimation}
      onFocus={triggerAnimation}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`chat-bat-shell${isAnimating ? " chat-bat-shell--animating" : ""}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <Image
          src="/images/chatbat/bat.png"
          alt="Chat bat"
          width={220}
          height={220}
          priority
          className={`chat-bat-image chat-bat-image--closed${
            isAnimating ? " chat-bat-image--closed-animating" : ""
          }`}
        />
        <Image
          src="/images/chatbat/openWings.png"
          alt=""
          width={220}
          height={220}
          aria-hidden="true"
          className={`chat-bat-image chat-bat-image--open${
            isAnimating ? " chat-bat-image--open-animating" : ""
          }`}
        />
        <Image
          src="/images/chatbat/openMouth.png"
          alt=""
          width={220}
          height={220}
          aria-hidden="true"
          className={`chat-bat-image chat-bat-image--mouth${
            isAnimating ? " chat-bat-image--mouth-animating" : ""
          }`}
        />
      </div>
    </div>
  );
}
