import type { Ref } from "react";

interface Props {
  count: number;
  filled: boolean[];
  mask: boolean[] | null;
  revealedThrough: number;
  activeIndex: number;
  variant: "hud" | "hero";
  tapeRef?: Ref<HTMLDivElement>;
  /** First index of endless (base board length). Gold instead of teal. */
  bonusFrom?: number;
}

export function DotGraph({
  count,
  filled,
  mask,
  revealedThrough,
  activeIndex,
  variant,
  tapeRef,
  bonusFrom,
}: Props) {
  const dots = [];
  for (let i = 0; i < count; i++) {
    const revealed = revealedThrough >= i;
    const isBonus = bonusFrom != null && i >= bonusFrom;
    const ok = revealed && Boolean(mask?.[i]);
    const bad = !isBonus && revealed && mask !== null && !mask[i];
    const cls = [
      filled[i] ? "filled" : "",
      isBonus && ok ? "bonus" : "",
      isBonus && !ok ? "bonus-wait" : "",
      !isBonus && ok ? "ok" : "",
      bad ? "bad" : "",
      i === activeIndex ? "here" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const title =
      variant === "hero" && revealed
        ? `Q${i + 1} ${isBonus ? "bonus" : ok ? "correct" : "wrong"}`
        : variant === "hero"
          ? `Q${i + 1}`
          : undefined;
    dots.push(<i key={i} className={cls} title={title} />);
  }

  return (
    <div
      ref={tapeRef}
      className={`tape tape-${variant}`}
      role={variant === "hero" ? "img" : undefined}
      aria-label={variant === "hero" ? "Run graph, one dot per question" : undefined}
      aria-hidden={variant === "hud"}
    >
      {dots}
    </div>
  );
}
