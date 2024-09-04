chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url === "https://gw.si-analytics.ai/gw/bizbox.do") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["scripts/genPopup.js"],
    })
  }
})
