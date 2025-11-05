document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ["scripts/open-popover.js"],
    })
  } catch (e) {
    console.error(e)

    const content = document.getElementById("content")
    if (content) {
      content.innerHTML = `<span style="color: red;">에러 발생!</span>\n<code>message: ${e?.message}</code>`
    }
  }
})
