const BG = "#222831";
const CAPTURE_PAD = 48;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("capture timed out")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function pageCss(): Promise<string> {
  const parts: string[] = [];
  for (const el of document.querySelectorAll("style")) {
    parts.push(el.textContent ?? "");
  }
  for (const link of document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']")) {
    if (!link.href || /fonts\.googleapis|fonts\.gstatic/.test(link.href)) continue;
    try {
      const res = await fetch(link.href);
      if (res.ok) parts.push(await res.text());
    } catch {
      /* skip remote/CORS sheets */
    }
  }
  return parts.join("\n");
}

function drawSvg(svg: string, width: number, height: number, scale: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No canvas context");
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((out) => {
          URL.revokeObjectURL(url);
          if (!out) reject(new Error("Could not encode PNG"));
          else resolve(out);
        }, "image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not render screenshot"));
    };
    img.src = url;
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** Wait until the trivia punchline is in the card and fonts have settled. */
export async function waitForTriviaPainted(node: HTMLElement): Promise<void> {
  await nextFrame();
  await nextFrame();
  const start = performance.now();
  while (performance.now() - start < 600) {
    if (node.querySelector(".trivia-target") && !node.querySelector(".trivia-wait")) break;
    await nextFrame();
  }
  if (typeof document.fonts !== "undefined") {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 400);
        }),
      ]);
    } catch {
      /* ignore font wait failures */
    }
  }
  await nextFrame();
}

export async function captureNodePng(node: HTMLElement, pad = CAPTURE_PAD): Promise<Blob> {
  if (node.querySelector(".trivia-wait") && !node.querySelector(".trivia-target")) {
    await waitForTriviaPainted(node);
  }
  const rect = node.getBoundingClientRect();
  const innerW = Math.max(1, Math.ceil(rect.width));
  const innerH = Math.max(1, Math.ceil(rect.height));
  const width = innerW + pad * 2;
  const height = innerH + pad * 2;
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const css = await pageCss();
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = `${innerW}px`;
  clone.style.maxWidth = `${innerW}px`;
  clone.style.background = BG;
  clone.style.overflow = "hidden";
  clone.style.boxSizing = "border-box";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${width}px;height:${height}px;padding:${pad}px;background:${BG};color:#eeeeee;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">` +
    `<style>${css}</style>${clone.outerHTML}</div></foreignObject></svg>`;
  return withTimeout(drawSvg(svg, width, height, scale), 8000);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyOrSavePng(
  blob: Blob,
  filename: string,
): Promise<"copied" | "shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });

  try {
    await withTimeout(
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]),
      1500,
    );
    return "copied";
  } catch {
    /* Safari sometimes wants a Promise */
  }

  try {
    await withTimeout(
      navigator.clipboard.write([
        new ClipboardItem({ "image/png": Promise.resolve(blob) }),
      ]),
      1500,
    );
    return "copied";
  } catch {
    /* fall through */
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "precisley" });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}
