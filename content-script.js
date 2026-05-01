/**
 * AntiAI - Chrome Extension to Remove AI Content from Google Search
 * 
 * This script detects and removes AI-generated content from Google Search results pages.
 * Detection uses multiple strategies to be robust against DOM structure changes.
 */

// Configuration for detection selectors and patterns
const CONFIG = {
  // Debounce delay for MutationObserver callbacks (ms)
  DEBOUNCE_DELAY: 300,
  
  // Maximum time to scan DOM when looking for AI elements (ms)
  MAX_SCAN_TIME: 2000,
  
  // Maximum number of elements to check per scan (performance limit)
  MAX_ELEMENTS_CHECK: 500
};

/**
 * Detects AI elements using multiple strategies.
 * Returns array of DOM nodes suspected to be AI-generated content.
 */
function detectAIElements() {
  const aiElements = new Set();
  
  // Strategy 1: Look for ARIA labels and roles mentioning AI, Overview, or Generate
  const ariaElements = document.querySelectorAll(
    '[aria-label*="AI"], [aria-label*="ai"], ' +
    '[aria-label*="Overview"], [aria-label*="overview"], ' +
    '[role="region"][aria-label*="generate"], ' +
    '[role="region"][aria-label*="Generate"]'
  );
  ariaElements.forEach(el => aiElements.add(el));
  
  // Strategy 2: Look for elements with text content containing AI-related phrases
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
  
  scanDOMForPhrases(aiPhrases, aiElements);
  
  // Strategy 3: Look for specific structural patterns Google uses for AI containers
  const aiContainers = detectAIContainerStructures();
  aiContainers.forEach(el => aiElements.add(el));
  
  // Strategy 4: Remove discovered AI elements and related UI
  cleanupRelatedElements(aiElements);
  
  return Array.from(aiElements);
}

/**
 * Scans DOM for specific text phrases and collects parent containers
 * as these are likely AI content sections.
 */
function scanDOMForPhrases(phrases, resultSet) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let textNode;
  let elementCount = 0;
  const startTime = performance.now();
  
  while ((textNode = walker.nextNode()) && elementCount < CONFIG.MAX_ELEMENTS_CHECK) {
    // Timeout protection
    if (performance.now() - startTime > CONFIG.MAX_SCAN_TIME) {
      break;
    }
    
    const text = textNode.textContent;
    for (const phrase of phrases) {
      if (text.includes(phrase)) {
        // Found AI-related text, collect the containing element and its parent
        let container = textNode.parentElement;
        
        // Walk up the DOM to find the likely AI section container
        // Typically 2-4 levels up from text node
        let depth = 0;
        while (container && depth < 6) {
          // Stop if we hit major layout boundaries (main results area)
          if (container.tagName === 'MAIN' || 
              container.id === 'rso' ||
              container.classList.contains('v5gf2b')) {
            // Found a major container; the AI element is likely the child before main results
            break;
          }
          
          // Check if this container looks like it's meant to be removed
          if (shouldRemoveContainer(container)) {
            resultSet.add(container);
            break;
          }
          
          container = container.parentElement;
          depth++;
        }
        break; // Only process first matching phrase in this text node
      }
    }
    elementCount++;
  }
}

/**
 * Detects AI containers based on structural patterns.
 * Google typically places AI content in specific semantic containers.
 */
function detectAIContainerStructures() {
  const aiContainers = [];
  
  // Look for sections or divs that appear to be AI content based on their
  // position, structure, and relation to organic results
  const potentialContainers = document.querySelectorAll(
    'div[data-sokoban-container], ' +
    'div.kp-wholepage, ' +
    'div[role="region"]'
  );
  
  potentialContainers.forEach(container => {
    if (isAIContainer(container)) {
      aiContainers.push(container);
    }
  });
  
  return aiContainers;
}

/**
 * Determines if a container is likely AI-generated based on heuristics.
 */
function isAIContainer(container) {
  const text = container.textContent || '';
  
  // Check for AI-related keywords
  const aiIndicators = [
    'AI Overview',
    'ai overview',
    'AI Overview for this query',
    'people also ask',
    'generate',
    'Generate more',
    'Ask follow-up'
  ];
  
  for (const indicator of aiIndicators) {
    if (text.toLowerCase().includes(indicator.toLowerCase())) {
      // Additional check: ensure this isn't part of a regular search result
      if (!isOrganicSearchResult(container)) {
        return true;
      }
    }
  }
  
  // Check for data attributes that might indicate AI content
  const dataAttrs = container.getAttribute('data-sokoban-container') || '';
  if (dataAttrs.includes('AI') || dataAttrs.includes('GenerativeAI')) {
    return true;
  }
  
  return false;
}

/**
 * Checks if a container appears to be a standard organic search result.
 * We want to preserve these and only remove AI content.
 */
function isOrganicSearchResult(container) {
  // Search results typically have links (h2/h3 with href or a.r tag)
  const hasSearchLink = container.querySelector('a[href*="/url?q="]') ||
                        container.querySelector('h2 a') ||
                        container.querySelector('h3 a.r');
  
  if (hasSearchLink) {
    return true;
  }
  
  // Check for typical search result classes
  const classList = container.className || '';
  if (classList.includes('g') || // Standard Google result class
      classList.includes('Gx5Zad') || // Result wrapper
      classList.includes('N8H08c')) { // Result container
    return true;
  }
  
  return false;
}

/**
 * Determines if a container should be removed based on content and context.
 */
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
  
  // Don't remove if it contains primarily search results
  const resultCount = container.querySelectorAll('h2 a, h3 a.r, a[href*="/url?q="]').length;
  if (resultCount > 3) {
    return false;
  }
  
  return true;
}

/**
 * Finds and removes UI elements related to detected AI content,
 * such as "Ask follow-up" buttons and "Generate more" links.
 */
function cleanupRelatedElements(aiElements) {
  // Buttons and links to remove
  const relatedSelectors = [
    'button:has-text("Ask follow-up")',
    'button:has-text("Generate more")',
    'button:has-text("Ask a follow-up")',
    'a:has-text("Ask follow-up")',
    'a:has-text("Generate more")',
    '[aria-label*="Ask follow-up"]',
    '[aria-label*="Generate more"]'
  ];
  
  // More robust text matching
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

/**
 * Removes all detected AI elements from the DOM.
 */
function removeAIElements() {
  const elementsToRemove = detectAIElements();
  
  elementsToRemove.forEach(element => {
    try {
      // Use a parent removal to avoid partial DOM states
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    } catch (error) {
      // Silently skip if removal fails (element might already be gone)
      console.debug('Could not remove element:', error);
    }
  });
  
  return elementsToRemove.length;
}

/**
 * Creates and configures a MutationObserver to watch for dynamically injected AI content.
 */
function observeDynamicContent() {
  let debounceTimer;
  
  const observer = new MutationObserver((mutations) => {
    // Debounce to avoid excessive processing
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Check if any mutations might contain AI content
      const hasRelevantChanges = mutations.some(mutation => {
        // Check added nodes
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
      
      // Only process if we detected potentially relevant changes
      if (hasRelevantChanges) {
        const removed = removeAIElements();
        if (removed > 0) {
          console.debug(`AntiAI: Removed ${removed} AI elements from dynamic update`);
        }
      }
    }, CONFIG.DEBOUNCE_DELAY);
  });
  
  // Configure observer to watch for subtree changes and added nodes
  const observerConfig = {
    childList: true,
    subtree: true,
    // Don't observe character data to reduce overhead
    characterData: false,
    // Don't observe existing attributes
    attributes: false
  };
  
  // Start observing the main content area
  const mainElement = document.querySelector('main') || document.body;
  observer.observe(mainElement, observerConfig);
  
  return observer;
}

/**
 * Main initialization function that runs when the content script loads.
 */
function initialize() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performInitialCleanup();
    });
  } else {
    performInitialCleanup();
  }
}

/**
 * Performs the initial cleanup and sets up observers.
 */
function performInitialCleanup() {
  try {
    // Initial pass: remove AI content
    const removed = removeAIElements();
    if (removed > 0) {
      console.debug(`AntiAI: Removed ${removed} AI elements on initial load`);
    }
    
    // Set up dynamic observer for lazy-loaded content
    observeDynamicContent();
    
    console.debug('AntiAI: Content filter active');
  } catch (error) {
    console.error('AntiAI: Error during initialization:', error);
  }
}

// Start the extension
initialize();
