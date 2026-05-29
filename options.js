document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);
document.getElementById('quickBookmarkBtn').addEventListener('click', executeQuickBookmark);
document.getElementById('manageShortcutsLink').addEventListener('click', openAddonsManager);

function executeQuickBookmark() {
  chrome.runtime.sendMessage({ action: 'trigger_bookmark_now' });
  window.close(); // Closes the floating panel automatically upon click
}

function openAddonsManager(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'about:addons' });
}

function saveOptions() {
  const replace = document.getElementById('replaceExisting').checked;
  const pattern = document.getElementById('titlePattern').value || '{title}';
  const iconAction = document.getElementById('iconAction').value;

  chrome.storage.sync.set({
    replaceExisting: replace,
    titlePattern: pattern,
    iconAction: iconAction
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Preferences saved!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    replaceExisting: true,
    titlePattern: '{title}',
    iconAction: 'bookmark'
  }, (items) => {
    document.getElementById('replaceExisting').checked = items.replaceExisting;
    document.getElementById('titlePattern').value = items.titlePattern;
    document.getElementById('iconAction').value = items.iconAction;
  });
}