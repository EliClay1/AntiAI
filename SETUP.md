# AntiAI Setup Guide

## Quick Start (5 minutes)

### Step 1: Locate the Extension Folder
The AntiAI extension files are already in this directory. You need these four files:
- `manifest.json`
- `content-script.js`
- `styles.css`
- `README.md`

### Step 2: Load Into Chrome

1. Open **Google Chrome**
2. Navigate to `chrome://extensions/` in the address bar
3. In the top-right corner, toggle **"Developer mode"** ON
4. Click the **"Load unpacked"** button (appears after enabling Developer mode)
5. Navigate to this folder and select it
6. Click **"Select Folder"**

### Step 3: Verify Installation

After loading, you should see:
- An entry for "AntiAI - Remove AI from Google Search" in your extensions list
- A status showing "Enabled" (with a blue toggle)
- The extension appears with a numbered badge (e.g., "1") indicating it's active

### Step 4: Test It

1. Visit https://www.google.com
2. Search for a query that normally shows an AI Overview (e.g., "what is machine learning", "how to make sourdough")
3. Verify that the AI-generated content is removed
4. Check the console (F12 → Console tab) for debug messages like "AntiAI: Content filter active"

## Extension Files Explained

### manifest.json
- **What**: Configuration file for the Chrome extension
- **Why**: Tells Chrome what the extension does, what pages it works on, what permissions it needs
- **Key settings**:
  - `manifest_version: 3` - Uses latest Chrome extension standard
  - `content_scripts` - Loads content-script.js on Google Search pages
  - `host_permissions` - Only requests access to Google domains (privacy-friendly)

### content-script.js
- **What**: JavaScript code that runs on Google Search pages
- **Why**: This is the core logic that detects and removes AI content
- **How**:
  1. Runs when page loads
  2. Scans DOM for AI elements using multiple strategies
  3. Removes them completely
  4. Watches for dynamically added AI content and removes that too

### styles.css
- **What**: CSS rules that hide AI elements
- **Why**: Fallback method if JavaScript detection misses something
- **How**: Hides elements by ARIA labels, data attributes, and other selectors

## Testing Checklist

After installation, test these scenarios:

### Basic Test
- [ ] Extension appears in chrome://extensions/
- [ ] Extension shows as "Enabled"
- [ ] Visit google.com, search for "AI overview test"
- [ ] Console shows "AntiAI: Content filter active"

### Functionality Tests
- [ ] AI Overview disappears from results
- [ ] No large blank spaces appear where AI content was
- [ ] Organic search results still appear normally
- [ ] Scroll down and load more results → AI content still removed

### Different Scenarios
- [ ] Try in incognito window (logged out)
- [ ] Try with Google account logged in
- [ ] Try different search domains (google.co.uk, google.de)
- [ ] Try mobile view (DevTools → device toggle)

### Troubleshooting Tests
- [ ] Reload extension (Extensions page → reload icon)
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Check F12 Console for error messages
- [ ] Inspect AI element with DevTools (right-click → Inspect)

## Common Issues & Fixes

### Extension doesn't appear in chrome://extensions/

**Problem**: After clicking "Load unpacked", extension doesn't show up

**Solution**:
1. Make sure you're in the correct folder (check for manifest.json)
2. Try reloading the page with F5
3. Try again with "Load unpacked"

### AI content still appears

**Problem**: AI Overviews are still showing up

**Solution**:
1. Reload the extension (Extensions page → reload button)
2. Hard refresh the page (Ctrl+Shift+R)
3. Try a different search query (not all queries show AI)
4. Check Console (F12) for error messages

### Doesn't work on some Google regional domains

**Problem**: Works on google.com but not google.co.uk

**Solution**:
- The extension supports all major Google regional domains
- If you find one that doesn't work, check if it matches a pattern in manifest.json
- All domains follow the pattern `https://www.google.*/*`

## How to Debug

Open the Console to see what the extension is doing:

1. Press **F12** to open DevTools
2. Go to the **"Console"** tab
3. You should see messages like:
   ```
   AntiAI: Removed X AI elements on initial load
   AntiAI: Removed Y AI elements from dynamic update
   AntiAI: Content filter active
   ```

4. If you see errors, note them and check:
   - Are you on a google.com domain? (not just google.com/search)
   - Is the extension enabled?
   - Do you have the latest version?

## Advanced: Updating Detection

If Google changes their UI and AI content stops being removed:

1. Open a Google Search results page with AI content
2. Press F12 to open DevTools
3. Right-click the AI element → "Inspect"
4. Look for:
   - `aria-label` attribute
   - `data-*` attributes
   - `class` attributes
   - `role` attribute

5. Update `content-script.js`:
   - Find the function that should catch this element
   - Add a new selector or pattern
   - Save the file
   - Reload the extension
   - Test

See the README.md section "How to Update Selectors" for detailed examples.

## Performance Notes

The extension is designed to be lightweight:
- Initial load: 5-50ms
- Memory impact: Negligible (elements removed from DOM)
- CPU impact: Minimal, with debouncing to prevent excessive processing

If you notice slowdowns:
- Reload the extension
- Make sure no other extensions are conflicting
- Try in incognito mode (no other extensions loaded)

## Uninstalling

If you want to remove the extension:

1. Go to `chrome://extensions/`
2. Find "AntiAI"
3. Click the **"Remove"** button
4. Confirm removal

AI content will reappear on Google Search pages.

## Getting Help

If you encounter issues:

1. **Check the Console** (F12) for error messages
2. **Read the README.md** - lots of troubleshooting info there
3. **Verify the files** - make sure all 4 files are in the same folder
4. **Try reloading** - extension and page
5. **Check if the query shows AI** - not all searches trigger AI Overview

## Next Steps

- Review `README.md` for comprehensive documentation
- Read `content-script.js` comments to understand detection strategies
- Check `styles.css` for CSS-based filtering rules

---

**Created**: 2026
**Version**: AntiAI 1.0.0
**Tested On**: Chrome 120+
