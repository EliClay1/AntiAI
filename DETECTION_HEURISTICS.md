# AntiAI Detection Heuristics - Technical Documentation

This document explains the detection strategies used by AntiAI to identify and remove AI-generated content from Google Search results.

## Why Multiple Strategies?

Google frequently updates their DOM structure and CSS class names. By using multiple independent detection strategies, AntiAI remains effective even when individual selectors become stale.

**Detection Confidence Levels**:
- 🟢 **High Confidence** - ARIA attributes, semantic text patterns
- 🟡 **Medium Confidence** - Data attributes, structural heuristics
- 🔴 **Low Confidence** - CSS class names, generic patterns

We prioritize high-confidence methods and use low-confidence methods only as fallbacks.

---

## Strategy 1: ARIA Label Matching (High Confidence)

### What & Why

ARIA (Accessible Rich Internet Applications) labels are used by Google to describe elements for accessibility purposes. These labels are very stable and consistently include "AI", "Overview", "Generate" for AI-powered elements.

### Implementation

```javascript
const ariaElements = document.querySelectorAll(
  '[aria-label*="AI"], [aria-label*="ai"], ' +
  '[aria-label*="Overview"], [aria-label*="overview"], ' +
  '[role="region"][aria-label*="generate"], ' +
  '[role="region"][aria-label*="Generate"]'
);
```

### Examples of Detected ARIA Labels

```
aria-label="AI Overview"
aria-label="AI-generated answer"
aria-label="Generate more answers"
aria-label="Ask follow-up question"
role="region" aria-label="AI Overview for your search"
```

### Reliability

✓ **Pros**:
- Google consistently marks UI regions with ARIA labels
- Labels are human-readable and descriptive
- Less frequently changed than class names
- Multiple matching patterns for variations

✗ **Cons**:
- Requires elements to have ARIA attributes (but most do)
- Language-dependent if labels are localized

### Maintenance

If this strategy stops working:
1. Inspect AI element: Right-click → Inspect
2. Look for `aria-label` attribute
3. Add pattern to the querySelector if it doesn't match current patterns

---

## Strategy 2: Text Content Pattern Matching (High Confidence)

### What & Why

We scan the DOM for specific text phrases that are very strong indicators of AI content. Phrases like "AI Overview", "Generate more", "Ask follow-up" are unique to AI features and rarely appear in organic content.

### Implementation

```javascript
// Target phrases
const aiPhrases = [
  'AI Overview',
  'ai overview',
  'AI-generated answer',
  'Generate more',
  'Ask follow-up',
  'Ask a follow-up',
  'Generative AI',
  'generative ai'
];

// Uses TreeWalker for efficient text scanning
const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_TEXT,
  null,
  false
);

// When phrase found, walk up DOM to find container
while ((textNode = walker.nextNode()) && elementCount < CONFIG.MAX_ELEMENTS_CHECK) {
  // ... check text for phrases ...
  let container = textNode.parentElement;
  while (container && depth < 6) {
    if (shouldRemoveContainer(container)) {
      resultSet.add(container);
      break;
    }
    container = container.parentElement;
    depth++;
  }
}
```

### Why This Works

- Unique phrases that almost exclusively appear in AI features
- Text content is more stable than HTML structure
- Walking up the DOM tree finds the right level to remove (container, not just the text element)
- Limits search depth (max 6 levels) to avoid climbing too far

### Reliability

✓ **Pros**:
- Very specific and unique phrases
- Works across different DOM structures
- Text content changes less frequently than HTML structure
- Catches content that might miss other selectors

✗ **Cons**:
- Requires specific text phrases to be present
- Could theoretically match legitimate content (though unlikely)
- DOM walking is slower than selector queries

### Maintenance

If this strategy misses AI content:
1. Open DevTools and inspect the AI element
2. Look at the text content
3. Find the exact phrase used
4. Add to `aiPhrases` array in content-script.js

**Example**: If Google changes "Ask follow-up" to "Ask a question":

```javascript
const aiPhrases = [
  'AI Overview',
  'Generate more',
  'Ask a question',  // ← Add new variant
  // ... etc
];
```

---

## Strategy 3: Structural Pattern Detection (Medium Confidence)

### What & Why

Google uses specific data attributes and container structures for AI content. By looking for these patterns, we can identify AI containers even if text and ARIA attributes change.

### Implementation

```javascript
function detectAIContainerStructures() {
  const aiContainers = [];
  
  const potentialContainers = document.querySelectorAll(
    'div[data-sokoban-container], ' +    // Google's AI feature container
    'div.kp-wholepage, ' +               // Knowledge panel (sometimes AI-generated)
    'div[role="region"]'                 // Semantic region elements
  );
  
  potentialContainers.forEach(container => {
    if (isAIContainer(container)) {
      aiContainers.push(container);
    }
  });
  
  return aiContainers;
}

function isAIContainer(container) {
  const text = container.textContent || '';
  
  // Check content for AI indicators
  const aiIndicators = [
    'AI Overview',
    'Generate more',
    'Ask follow-up'
  ];
  
  for (const indicator of aiIndicators) {
    if (text.toLowerCase().includes(indicator.toLowerCase())) {
      if (!isOrganicSearchResult(container)) {
        return true;
      }
    }
  }
  
  // Check data attributes
  const dataAttrs = container.getAttribute('data-sokoban-container') || '';
  if (dataAttrs.includes('AI') || dataAttrs.includes('GenerativeAI')) {
    return true;
  }
  
  return false;
}
```

### Key Selectors

| Selector | Purpose | Reliability |
|----------|---------|------------|
| `div[data-sokoban-container]` | Google's internal container for AI features | High |
| `div.kp-wholepage` | Knowledge panel (sometimes AI-generated) | Medium |
| `div[role="region"]` | Semantic region, often used for AI widgets | Medium |

### Safety Check: isOrganicSearchResult()

To avoid false positives, we verify that a container isn't an organic search result:

```javascript
function isOrganicSearchResult(container) {
  // Search results have search links
  const hasSearchLink = container.querySelector('a[href*="/url?q="]') ||
                        container.querySelector('h2 a') ||
                        container.querySelector('h3 a.r');
  
  if (hasSearchLink) {
    return true;  // This is a search result, don't remove
  }
  
  // Check for result classes
  const classList = container.className || '';
  if (classList.includes('g') ||           // Standard result
      classList.includes('Gx5Zad') ||     // Result wrapper
      classList.includes('N8H08c')) {     // Result container
    return true;  // This is a search result, don't remove
  }
  
  return false;
}
```

### Reliability

✓ **Pros**:
- Data attributes are set at runtime by Google's code
- Independent of text content
- Catches nested AI components
- Safety checks prevent false positives

✗ **Cons**:
- Data attributes can change in Google updates
- Some attributes might be vague (e.g., `role="region"` is generic)

### Maintenance

If Google introduces new data attributes for AI content:
1. Inspect the AI element
2. Look for `data-*` attributes
3. Add selector to `detectAIContainerStructures()`

**Example**: If Google adds `data-feature-type="generative-answer"`:

```javascript
const potentialContainers = document.querySelectorAll(
  'div[data-sokoban-container], ' +
  'div[data-feature-type="generative-answer"], ' +  // ← Add new
  'div.kp-wholepage, ' +
  'div[role="region"]'
);
```

---

## Strategy 4: Dynamic Element Cleanup (Medium Confidence)

### What & Why

AI widgets include buttons and links for user interaction. We target these specifically:

```javascript
function cleanupRelatedElements(aiElements) {
  const buttons = document.querySelectorAll('button, a[role="button"]');
  buttons.forEach(btn => {
    const text = btn.textContent || '';
    const ariaLabel = btn.getAttribute('aria-label') || '';
    
    if (text.includes('Ask follow-up') ||
        text.includes('Ask a follow-up') ||
        text.includes('Generate more') ||
        ariaLabel.includes('Ask follow-up') ||
        ariaLabel.includes('Generate more')) {
      aiElements.add(btn);
    }
  });
}
```

### Reliability

✓ **Pros**:
- Button text is specific and stable
- Easy to verify targets

✗ **Cons**:
- Only catches interactive elements
- Might miss buttons with different text

---

## Strategy 5: Context-Aware Removal Safety (High Confidence)

### What & Why

Before removing an element, we verify it's not part of legitimate content:

```javascript
function shouldRemoveContainer(container) {
  const tag = container.tagName.toLowerCase();
  
  // Don't remove major layout elements
  if (['html', 'body', 'main', 'head'].includes(tag)) {
    return false;
  }
  
  // Don't remove if it's clearly a search result
  if (isOrganicSearchResult(container)) {
    return false;
  }
  
  // Don't remove if it contains many results
  const resultCount = container.querySelectorAll('h2 a, h3 a.r').length;
  if (resultCount > 3) {
    return false;  // Likely a results container
  }
  
  return true;
}
```

### Safety Rules

1. **Structural Boundaries**: Never remove `<html>`, `<body>`, `<main>`, `<head>`
2. **Result Detection**: Check for search result links (href="/url?q=")
3. **Container Size**: If a container has >3 search result links, assume it's a result section
4. **Class Names**: Check for Google's standard result classes (`.g`, `.Gx5Zad`, etc.)

### Reliability

✓ **Pros**:
- Conservative approach prevents false positives
- Multiple checks reduce accident removal of legitimate content
- Context-aware (understands page structure)

✗ **Cons**:
- Might miss AI content if it's unusually positioned
- Relies on Google's consistent use of standard patterns

---

## Dynamic Content Handling (MutationObserver)

### What & Why

Google lazy-loads additional results as you scroll. We watch for these changes:

```javascript
function observeDynamicContent() {
  let debounceTimer;
  
  const observer = new MutationObserver((mutations) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const hasRelevantChanges = mutations.some(mutation => {
        if (mutation.addedNodes.length > 0) {
          for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent || '';
              if (text.includes('AI Overview') ||
                  text.includes('Generate more') ||
                  text.includes('Ask follow-up')) {
                return true;
              }
            }
          }
        }
        return false;
      });
      
      if (hasRelevantChanges) {
        const removed = removeAIElements();
      }
    }, CONFIG.DEBOUNCE_DELAY);
  });
  
  // Watch main content area for changes
  const mainElement = document.querySelector('main') || document.body;
  observer.observe(mainElement, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false
  });
  
  return observer;
}
```

### Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| `childList: true` | Track node additions/removals | Detect newly added AI content |
| `subtree: true` | Watch all descendants | Catch nested dynamic changes |
| `characterData: false` | Don't track text changes | Reduces overhead |
| `attributes: false` | Don't track attribute changes | Reduces overhead |
| `DEBOUNCE_DELAY` | 300ms | Batches multiple mutations together |

### Performance Optimization

- **Debouncing**: Groups mutations within 300ms window to avoid excessive re-runs
- **Targeted Watching**: Only watches the `<main>` element, not entire document
- **Text Pre-check**: Only scans added nodes for AI-related text before running full detection
- **Conservative Changes**: Only runs expensive detection if relevant changes detected

### Reliability

✓ **Pros**:
- Catches dynamically loaded AI content
- Debouncing prevents performance degradation
- Efficient text pre-check reduces unnecessary scans

✗ **Cons**:
- Small delay (300ms) before removal (debouncing)
- Might occasionally miss rapid changes

---

## Performance Constraints

To keep the extension lightweight:

```javascript
const CONFIG = {
  DEBOUNCE_DELAY: 300,        // 300ms to batch mutations
  MAX_SCAN_TIME: 2000,        // Stop after 2 seconds
  MAX_ELEMENTS_CHECK: 500     // Max 500 elements per scan
};
```

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Initial page load impact | <100ms | Minimal, most work is deferred |
| Text scanning | 2 second timeout | Prevents hanging on large pages |
| Element checks | 500 max | Limit DOM traversal |
| Observer overhead | <5% | Debouncing and efficient queries |

---

## Troubleshooting Detection Issues

### AI content still appears

**Check in order**:

1. **ARIA Labels**: Is the AI element missing `aria-label`?
   ```javascript
   // In console, run:
   element.getAttribute('aria-label')
   ```

2. **Text Content**: Does it have "AI Overview", "Generate more", etc.?
   ```javascript
   element.textContent.includes('AI Overview')
   ```

3. **Data Attributes**: Check for custom data attributes
   ```javascript
   element.getAttribute('data-sokoban-container')
   element.attributes  // List all attributes
   ```

4. **Structure**: Is it nested differently than expected?
   - Walk up the DOM tree checking parent containers
   - Look for position in page (before or within results?)

### False Positives (Legitimate content removed)

1. **Check Safety Rules**: Does `isOrganicSearchResult()` return false correctly?
2. **Verify Context**: Is the container actually a search result?
3. **Review Text Phrases**: Is the removed element a result that contains "overview"?

---

## Updating for Future Google Changes

### Process

1. **Identify the Problem**
   - Open incognito window (fresh state)
   - Search for query that triggers AI
   - Verify AI content is present
   - Open DevTools Console, check for error messages

2. **Inspect the Element**
   - Right-click AI element → Inspect
   - Look at HTML structure
   - Check ARIA labels
   - Check data attributes
   - Check class names

3. **Add Detection**
   - Add new selector to relevant function
   - Test locally
   - Verify it doesn't break legitimate content

4. **Test Thoroughly**
   - Multiple search queries
   - Different regions (google.com, google.co.uk, etc.)
   - Logged in and logged out
   - Mobile view

### Example: Adding a New Detection Pattern

If Google adds `aria-label="Gen AI Answer"`:

```javascript
// In detectAIElements()
const ariaElements = document.querySelectorAll(
  '[aria-label*="AI"], [aria-label*="ai"], ' +
  '[aria-label*="Overview"], [aria-label*="overview"], ' +
  '[aria-label*="Gen AI"], ' +  // ← Add new pattern
  '[role="region"][aria-label*="generate"], ' +
  '[role="region"][aria-label*="Generate"]'
);
```

If Google adds a new data attribute `data-ai-feature="true"`:

```javascript
// In detectAIContainerStructures()
const potentialContainers = document.querySelectorAll(
  'div[data-sokoban-container], ' +
  'div[data-ai-feature="true"], ' +  // ← Add new
  'div.kp-wholepage, ' +
  'div[role="region"]'
);
```

---

## References

### W3C Standards

- [ARIA: region role](https://www.w3.org/WAI/ARIA/apg/patterns/regions/)
- [Using ARIA labels](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/complementary.html)

### Chrome Extension APIs

- [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [TreeWalker](https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker)
- [querySelector](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)

---

**Last Updated**: 2026
**Version**: AntiAI 1.0.0
