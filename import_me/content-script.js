/**
 * AntiAI - Safe + Reliable Version
 */

const CONFIG = {
  DEBOUNCE_DELAY: 100,
  MAX_SCAN_TIME: 1500,
  MAX_ELEMENTS_CHECK: 1000
};

const removedContainers = new WeakSet();

/**
 * Strong AI signal check
 */
function hasStrongAISignal(text) {
  text = text.toLowerCase();

  return (
    text.includes("ai overview") ||
    text.includes("ai-generated") ||
    text.includes("generative ai") ||
    text.includes("ask follow-up") ||
    text.includes("generate more")
  );
}

/**
 * Weak signals (used only for narrowing, not removal)
 */
function hasWeakSignal(text) {
  text = text.toLowerCase();

  return (
    text.includes("overview") ||
    text.includes("ai")
  );
}

/**
 * Detect AI elements
 */
function detectAIElements() {
  const results = new Set();

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  let count = 0;
  const start = performance.now();

  while ((node = walker.nextNode()) && count < CONFIG.MAX_ELEMENTS_CHECK) {
    if (performance.now() - start > CONFIG.MAX_SCAN_TIME) break;

    const text = node.textContent || "";

    if (!hasStrongAISignal(text)) {
      count++;
      continue;
    }

    let el = node.parentElement;
    let best = null;

    while (el && !["MAIN", "BODY", "HTML"].includes(el.tagName)) {
      const containerText = el.textContent || "";

      if (
        hasStrongAISignal(containerText) &&
        !isProtectedContainer(el)
      ) {
        best = el;
      }

      el = el.parentElement;
    }

    if (best) results.add(best);

    count++;
  }

  return Array.from(results);
}

/**
 * Protect real search content
 */
function isProtectedContainer(el) {
  if (!el) return true;

  const text = (el.textContent || "").toLowerCase();

  // If it looks like real results, protect it
  const hasSearchLinks =
    el.querySelector('a[href*="/url?q="]') ||
    el.querySelector("h3 a");

  if (hasSearchLinks && !text.includes("ai overview")) {
    return true;
  }

  // If it has lots of links, it's probably the main results
  const linkCount = el.querySelectorAll("a").length;
  if (linkCount > 8) return true;

  return false;
}

/**
 * Remove elements
 */
function removeAIElements() {
  const elements = detectAIElements();
  let removed = 0;

  elements.forEach(el => {
    if (!el || removedContainers.has(el)) return;

    try {
      el.remove();
      removedContainers.add(el);
      removed++;
    } catch {}
  });

  return removed;
}

/**
 * Observer
 */
function observeDynamicContent() {
  let timer;

  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      removeAIElements();
    }, CONFIG.DEBOUNCE_DELAY);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Init
 */
function init() {
  const run = () => {
    removeAIElements();

    setTimeout(removeAIElements, 300);
    setTimeout(removeAIElements, 800);
    setTimeout(removeAIElements, 1500);

    observeDynamicContent();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}

init();