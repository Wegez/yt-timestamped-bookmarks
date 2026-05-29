const updatePopup = (action) => chrome.action.setPopup({ popup: action === 'menu' ? 'options.html' : '' });

// --- DYNAMIC ICON BEHAVIOR SETUP ---
chrome.storage.sync.get({ iconAction: 'menu' }).then(prefs => updatePopup(prefs.iconAction));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.iconAction) updatePopup(changes.iconAction.newValue);
});

// --- LISTENERS ---
chrome.action.onClicked.addListener(triggerBookmark);
chrome.commands.onCommand.addListener(cmd => cmd === 'bookmark_video' && triggerBookmark());
chrome.runtime.onMessage.addListener(req => req.action === 'trigger_bookmark_now' && triggerBookmark());

// --- CORE BOOKMARK LOGIC ---
async function triggerBookmark() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes("youtube.com/watch")) return;

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const video = document.querySelector('video');
        return video ? {
          time: Math.floor(video.currentTime),
          title: document.title.replace(/^(\(\d+\)\s)?/, '').replace(' - YouTube', '')
        } : null;
      }
    });

    if (result) await handleBookmark(tab, result.time, result.title);
  } catch (e) {
    console.error("Failed to inject script", e);
  }
}

async function handleBookmark(tab, time, defaultTitle) {
  const urlObj = new URL(tab.url);
  const videoId = urlObj.searchParams.get('v');
  if (!videoId) return;

  urlObj.searchParams.set('t', `${time}s`);
  const newUrl = urlObj.toString();

  const prefs = await chrome.storage.sync.get({
    replaceExisting: true, titlePattern: '{title} [{time}]',
    truncateType: 'none', truncateLength: 50
  });

  let title = defaultTitle;
  const limit = parseInt(prefs.truncateLength, 10) || 50;

  if (prefs.truncateType === 'characters' && title.length > limit) {
    title = `${title.substring(0, limit).trim()}...`;
  } else if (prefs.truncateType === 'words') {
    const words = title.split(/\s+/);
    if (words.length > limit) title = `${words.slice(0, limit).join(" ")}...`;
  }

  const finalTitle = prefs.titlePattern
    .replace('{title}', title)
    .replace('{time}', formatTime(time));

  // Optimization: Search only by videoId instead of fetching all bookmarks
  const searchResults = await chrome.bookmarks.search(videoId);
  const existing = searchResults.find(bm => bm.url?.includes(`v=${videoId}`));
  const isUpdate = prefs.replaceExisting && existing;

  if (isUpdate) {
    await chrome.bookmarks.update(existing.id, { title: finalTitle, url: newUrl });
  } else {
    await chrome.bookmarks.create({ parentId: 'toolbar_____', title: finalTitle, url: newUrl });
  }

  // Inject visual overlay
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (msg) => {
      const toast = document.createElement('div');
      toast.textContent = msg;
      
      Object.assign(toast.style, {
        position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: '#fff', color: '#000', border: '3px solid black',
        padding: '15px 30px', fontSize: '18px', fontFamily: 'system-ui, Arial, sans-serif',
        fontWeight: 'bold', zIndex: '9999999', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        opacity: '0', transition: 'opacity 0.2s ease-in-out', pointerEvents: 'none', textAlign: 'center'
      });

      document.body.appendChild(toast);
      setTimeout(() => toast.style.opacity = '1', 10);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },
    args: [isUpdate ? "Bookmark edited!" : "Bookmark created!"]
  });
}

function formatTime(s) {
  const pad = n => n.toString().padStart(2, '0');
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}