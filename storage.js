// Storage helper to replace GM_* functions with chrome.storage.local
window.gmStorage = {
  async gmSet(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (e) {
      console.error('gmSet error:', e);
      return false;
    }
  },

  async gmGet(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } catch (e) {
      console.error('gmGet error:', e);
      return undefined;
    }
  },

  async gmDelete(key) {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (e) {
      console.error('gmDelete error:', e);
      return false;
    }
  },

  async gmListKeys(prefix = '') {
    try {
      const all = await chrome.storage.local.get(null);
      return Object.keys(all).filter(key => key.startsWith(prefix));
    } catch (e) {
      console.error('gmListKeys error:', e);
      return [];
    }
  }
};

// Synchronous versions for backwards compatibility (will return promises)
window.GM_setValue = window.gmStorage.gmSet;
window.GM_getValue = window.gmStorage.gmGet;
window.GM_deleteValue = window.gmStorage.gmDelete;
window.GM_listValues = window.gmStorage.gmListKeys;