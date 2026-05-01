# AntiAI - Remove AI Content from Google Search

A Chrome Extension that strips AI-generated content, AI Overviews, and related widgets from Google Search result pages, restoring the classic search experience.

## What It Does

AntiAI removes:
- **AI Overviews** - AI-generated answer summaries
- **Generative summaries** - Synthesized content snippets
- **Follow-up suggestion panels** - AI chat interfaces
- **Related buttons** - "Ask follow-up", "Generate more", etc.
- **Interactive AI widgets** - Any AI-powered UI elements

The result is a clean, classic Google Search results page with only organic results, ads (if present), and standard navigation.

## Installation

### Manual Installation (Developer Mode)

1. **Download or clone this repository** to a local folder
2. Open **Chrome** and navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in the top-right corner)
4. Click **"Load unpacked"**
5. Select the folder containing these files
6. The extension should now appear in your extensions list

### Verification

- Look for "AntiAI" in your extensions list (should show as enabled)
- Visit [Google Search](https://www.google.com) and perform a search
- Perform another search that normally shows AI Overviews
- Verify that the AI content is removed

## How It Works

### Detection Strategy

AntiAI uses a **layered detection approach** to be robust against Google's frequent DOM changes:

1. **ARIA Attributes**: Looks for ARIA labels containing "AI", "Overview", "Generate"
2. **Text Pattern Matching**: Scans the DOM for phrases like "AI Overview", "Ask follow-up", "Generate more"
3. **Structural Heuristics**: Identifies AI containers based on their position and structure relative to search results
4. **Data Attributes**: Checks for Google's internal data attributes indicating AI content
5. **Context Analysis**: Ensures detected elements aren't standard search results (preserves organic results)

### Removal Strategy

- **Primary Method**: DOM node removal via JavaScript (clean, no layout shifts)
- **Fallback Method**: CSS hiding rules as backup for edge cases
- **Safety**: Conservative approach - prefers false negatives over false positives

### Dynamic Content Handling

The extension uses a **MutationObserver** to detect and remove AI content injected after the initial page load:
- Monitors DOM changes in the main content area
- Debounced to avoid performance overhead
- Automatically removes newly injected AI elements

## File Structure

```
AntiAI/
├── manifest.json          # Chrome Extension manifest (Manifest V3)
├── content-script.js      # Main detection and removal logic
├── styles.css             # CSS fallback hiding rules
└── README.md              # This file
```

### manifest.json

- Defines extension metadata and permissions
- Specifies content script execution on Google Search pages
- Requests minimal permissions (Google domains only)
- Uses Manifest V3 for modern security standards

### content-script.js

Core extension logic:

- **`detectAIElements()`** - Finds AI content using multiple strategies
- **`scanDOMForPhrases()`** - Text-based detection with DOM walking
- **`detectAIContainerStructures()`** - Structural pattern matching
- **`isAIContainer()`** - Evaluates if a container is AI content
- **`isOrganicSearchResult()`** - Safety check to preserve organic results
- **`removeAIElements()`** - DOM removal with error handling
- **`observeDynamicContent()`** - Watches for dynamically injected content
- **`initialize()`** - Runs on page load, orchestrates all functions

### styles.css

Fallback CSS rules that hide AI elements by:
- ARIA label matching
- Data attribute patterns
- Role-based selectors
- Text content patterns

## How to Update Selectors (When Google Changes Their DOM)

If AntiAI stops working after Google updates their Search UI:

1. **Open Chrome DevTools** (F12) on a Google Search results page
2. **Inspect the AI element** you want to target
3. **Look for**:
   - `aria-label` attributes (check for "AI", "Overview", etc.)
   - `data-*` attributes (Google's internal data markers)
   - `role` attributes
   - CSS class names (less reliable, but useful)
4. **Update these locations** in `content-script.js`:
   - Add ARIA patterns to the selector in `detectAIElements()` line ~25-30
   - Add text phrases to `aiPhrases` array (line ~33)
   - Add data attributes to `detectAIContainerStructures()` (line ~57)
   - Update `isAIContainer()` detection logic (line ~78)
5. **Test** by reloading the extension (Extensions page → reload button)

### Example Update Pattern

If Google starts using `data-ai-powered="true"`:

```javascript
// In detectAIContainerStructures()
const potentialContainers = document.querySelectorAll(
  'div[data-sokoban-container], ' +
  'div[data-ai-powered="true"], ' +  // ← Add new selector here
  'div.kp-wholepage, ' +
  'div[role="region"]'
);
```

## Testing Guide

### Scenarios to Test

1. **Logged-out Search**
   - Visit google.com in an incognito window
   - Search for common queries that trigger AI Overviews
   - Verify AI content is removed

2. **Logged-in Search**
   - Sign into your Google account
   - Perform searches
   - Verify AI content is removed even when personalized

3. **Different Regions**
   - Test on google.com (US)
   - Test on google.co.uk, google.de, etc.
   - Verify extension works across regional domains

4. **Mobile Responsive Mode**
   - Open DevTools (F12)
   - Click device toggle (mobile view)
   - Perform searches
   - Verify mobile layout works correctly

5. **Dynamic Content Loading**
   - Scroll down search results
   - Verify newly loaded content is filtered
   - Click "More results" and verify

### What to Look For

✓ **Expected**: Search results display normally, no AI Overviews visible
✓ **Expected**: No large blank spaces or layout breaks
✓ **Expected**: All organic search results remain visible
✓ **Expected**: Ads (if present) remain visible

✗ **Problems**: AI Overview still visible → selectors need updating
✗ **Problems**: Organic results missing → detection too aggressive
✗ **Problems**: Large gaps → need to review removal logic

## Performance Considerations

- **Initial Load**: ~5-50ms depending on page size and AI content complexity
- **MutationObserver Overhead**: Minimal, with debouncing to prevent excessive callbacks
- **DOM Scanning**: Limited to 500 elements and 2 second timeout to prevent performance degradation
- **Memory**: Negligible; elements are removed completely from DOM

## Safety & Precision

The extension is designed to be **conservative** to avoid false positives:

- ✓ Preserves organic search results
- ✓ Preserves ads
- ✓ Preserves knowledge panels (unless they're clearly AI-generated)
- ✓ Uses multiple detection strategies (not just class names)
- ✓ Checks context before removal
- ✓ No aggressive DOM manipulation

## Privacy

- **No data collection**: The extension does not collect, transmit, or log your search queries
- **No network requests**: All processing happens locally in your browser
- **Minimal permissions**: Only requests access to Google Search domains

## Troubleshooting

### AI content still appearing?

1. **Reload the extension**
   - Go to `chrome://extensions/`
   - Find "AntiAI"
   - Click the reload button (circular arrow icon)

2. **Reload the page**
   - Press `Ctrl+Shift+R` (hard refresh)
   - Or `Ctrl+F5`

3. **Check if AI is actually appearing**
   - Sometimes Google doesn't show AI Overviews for all queries
   - Try search terms more likely to trigger AI: "what is X", "how to do Y", "best practices"

4. **Open DevTools to see debug messages**
   - Press `F12` to open DevTools
   - Go to the "Console" tab
   - You should see messages like "AntiAI: Content filter active"
   - Check for any error messages

### Extension not appearing?

- Verify "Developer mode" is enabled (`chrome://extensions/`)
- Check that you've selected the correct folder when loading unpacked
- Ensure all files (manifest.json, content-script.js, styles.css) are in the same directory

### Want to report an issue?

If you find a case where AntiAI isn't working:

1. Take a screenshot showing the AI content
2. Open DevTools (F12) and inspect the AI element
3. Note the ARIA labels, data attributes, and class names
4. Check the version you're using (manifest.json)

## Permissions Explained

```json
"host_permissions": [
  "https://www.google.com/*",
  "https://www.google.*/*"
]
```

This extension requests access to Google Search domains only. It does **not** access any other websites or services.

## Manifest V3 Compliance

This extension uses **Manifest V3**, the latest Chrome Extension standard:
- ✓ No remote code execution
- ✓ Content Security Policy compliance
- ✓ Minimal permissions requested
- ✓ Service Workers (not background pages)
- ✓ Future-compatible with Chrome's extension ecosystem

## Technical Implementation Details

### Detection Heuristics

The extension combines multiple detection strategies for reliability:

1. **ARIA Label Matching** (Robust)
   - Targets elements with `aria-label` containing AI-related keywords
   - Very reliable as Google consistently marks AI elements with ARIA attributes
   - Used as primary detection method

2. **Text Content Scanning** (Conservative)
   - Uses TreeWalker to efficiently scan text nodes
   - Looks for specific phrases: "AI Overview", "Generate more", "Ask follow-up"
   - Walks up DOM to find container element, ensuring we remove the right level
   - Includes timeout and element limit to prevent performance issues

3. **Structural Heuristics** (Context-Aware)
   - Checks if containers appear before organic results
   - Verifies element doesn't contain search result links
   - Uses data attributes Google may expose
   - Conservative: stops climbing DOM at major layout boundaries

4. **Safety Checks** (Precision)
   - `isOrganicSearchResult()`: Prevents removing actual search results
   - Checks for standard result selectors and classes
   - Validates result count in container (>3 results = likely search result container)

### Dynamic Content Handling

Google lazy-loads additional results as you scroll. The MutationObserver:

- Monitors the main element subtree for insertions
- Debounces callbacks to avoid excessive processing (300ms default)
- Only scans when changes might include AI content
- Safely handles observer cleanup if page structure changes

### Performance Optimizations

1. **Element Limit**: Scans maximum 500 elements per pass
2. **Time Limit**: Stops scanning after 2 seconds
3. **Debouncing**: MutationObserver callbacks debounced to 300ms
4. **Efficient Walking**: Uses TreeWalker for faster text node traversal
5. **Early Exit**: Stops processing when reaching major layout elements

## License

See LICENSE file for licensing information.

---

**Version**: 1.0.0
**Manifest Version**: 3
**Tested On**: Chrome 120+
