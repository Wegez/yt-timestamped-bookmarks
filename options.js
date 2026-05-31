const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', restoreOptions);
$('saveBtn').addEventListener('click', saveOptions);

// Listeners for UI toggles
$('truncateType').addEventListener('change', toggleTruncateUI);
$('iconAction').addEventListener('change', toggleActionUI);
$('doubleClickDelete').addEventListener('change', toggleActionUI);

$('quickBookmarkBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'trigger_bookmark_now' });
  window.close();
});

$('deleteBookmarkBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'trigger_delete_now' });
  window.close();
});

$('manageShortcutsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'about:addons' });
});

function toggleTruncateUI() {
  $('truncateLengthGroup').style.display = $('truncateType').value === 'none' ? 'none' : 'block';
}

function toggleActionUI() {
  // Show the double click options ONLY if 'Action Mode' is selected
  const isActionMode = $('iconAction').value === 'bookmark';
  $('actionSettings').style.display = isActionMode ? 'block' : 'none';
  
  // Show the ms delay box ONLY if the double click checkbox is checked
  const isDoubleClickEnabled = $('doubleClickDelete').checked;
  $('doubleClickSettings').style.display = isDoubleClickEnabled ? 'block' : 'none';
}

function saveOptions() {
  chrome.storage.sync.set({
    replaceExisting: $('replaceExisting').checked,
    titlePattern: $('titlePattern').value || '{title} [{time}]',
    iconAction: $('iconAction').value,
    doubleClickDelete: $('doubleClickDelete').checked,
    doubleClickDelay: parseInt($('doubleClickDelay').value, 10) || 300,
    truncateType: $('truncateType').value,
    truncateLength: parseInt($('truncateLength').value, 10) || 50
  }, () => {
    $('status').textContent = 'Preferences saved!';
    setTimeout(() => $('status').textContent = '', 2000);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    replaceExisting: true, titlePattern: '{title} [{time}]',
    iconAction: 'menu', doubleClickDelete: false, doubleClickDelay: 300,
    truncateType: 'none', truncateLength: 50
  }, (items) => {
    $('replaceExisting').checked = items.replaceExisting;
    $('titlePattern').value = items.titlePattern;
    $('iconAction').value = items.iconAction;
    $('doubleClickDelete').checked = items.doubleClickDelete;
    $('doubleClickDelay').value = items.doubleClickDelay;
    $('truncateType').value = items.truncateType;
    $('truncateLength').value = items.truncateLength;
    
    toggleTruncateUI();
    toggleActionUI(); // Ensure UI matches loaded settings
  });
}