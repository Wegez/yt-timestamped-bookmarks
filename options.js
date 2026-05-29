const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', restoreOptions);
$('saveBtn').addEventListener('click', saveOptions);
$('truncateType').addEventListener('change', toggleTruncateUI);

$('quickBookmarkBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'trigger_bookmark_now' });
  window.close();
});

$('manageShortcutsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'about:addons' });
});

function toggleTruncateUI() {
  $('truncateLengthGroup').style.display = $('truncateType').value === 'none' ? 'none' : 'block';
}

function saveOptions() {
  chrome.storage.sync.set({
    replaceExisting: $('replaceExisting').checked,
    titlePattern: $('titlePattern').value || '{title} [{time}]',
    iconAction: $('iconAction').value,
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
    iconAction: 'menu', truncateType: 'none', truncateLength: 50
  }, (items) => {
    $('replaceExisting').checked = items.replaceExisting;
    $('titlePattern').value = items.titlePattern;
    $('iconAction').value = items.iconAction;
    $('truncateType').value = items.truncateType;
    $('truncateLength').value = items.truncateLength;
    toggleTruncateUI();
  });
}