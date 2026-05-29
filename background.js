// --- DYNAMIC ICON BEHAVIOR SETUP ---
// Set popup state based on preference when the background script wakes up
chrome.storage.sync.get({ iconAction: 'bookmark' }).then(prefs => {
  if (prefs.iconAction === 'menu') {
    chrome.action.setPopup({ popup: 'options.html' });
  } else {
    chrome.action.setPopup({ popup: '' });
  }
});

// Listen for live preference changes to update the click behavior immediately
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.iconAction) {
    if (changes.iconAction.newValue === 'menu') {
      chrome.action.setPopup({ popup: 'options.html' });
    } else {
      chrome.action.setPopup({ popup: '' });
    }
  }
});

// Listen for clicks on the extension icon 
// (This event ONLY fires when the popup is set to empty string '')
chrome.action.onClicked.addListener((tab) => {
  triggerBookmark();
});

// --- EXISTING LISTENERS ---

// Listen for keyboard shortcut (Alt+Shift+S)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'bookmark_video') {
    triggerBookmark();
  }
});

// Listen for requests from the floating popup menu
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trigger_bookmark_now') {
    triggerBookmark();
  }
});

// --- CORE BOOKMARK LOGIC ---

async function triggerBookmark() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || !tab.url.includes("youtube.com/watch")) {
    console.log("Not a YouTube watch page.");
    return;
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const video = document.querySelector('video');
        if (!video) return null;
        // Clean up standard YT title artifacts like "(2) " notification counts
        return {
          time: Math.floor(video.currentTime),
          title: document.title.replace(/^(\(\d+\)\s)?/, '').replace(' - YouTube', '')
        };
      }
    });

    if (result) {
      handleBookmark(tab, result.time, result.title);
    }
  } catch (e) {
    console.error("Failed to inject script", e);
  }
}

async function handleBookmark(tab, timeInSeconds, defaultTitle) {
  const urlObj = new URL(tab.url);
  const videoId = urlObj.searchParams.get('v');
  if (!videoId) return;

  // Set the time parameter
  urlObj.searchParams.set('t', timeInSeconds + 's');
  const newUrl = urlObj.toString();

  // Get user preferences
  const prefs = await chrome.storage.sync.get({
    replaceExisting: true,
    titlePattern: '{title}'
  });

  // Format time for Title pattern (HH:MM:SS)
  const formattedTime = formatTime(timeInSeconds);
  const finalTitle = prefs.titlePattern
    .replace('{title}', defaultTitle)
    .replace('{time}', formattedTime);

  // Find existing bookmarks
  const searchResults = await chrome.bookmarks.search({});
  const existingBookmarks = searchResults.filter(bm => bm.url && bm.url.includes(`youtube.com/watch`) && bm.url.includes(`v=${videoId}`));

  if (prefs.replaceExisting && existingBookmarks.length > 0) {
    // Update the existing bookmark
    await chrome.bookmarks.update(existingBookmarks[0].id, {
      title: finalTitle,
      url: newUrl
    });
  } else {
    // Create new bookmark in the Firefox Bookmark Toolbar ('toolbar_____')
    await chrome.bookmarks.create({
      parentId: 'toolbar_____', 
      title: finalTitle,
      url: newUrl
    });
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}