function escapeJsonValue(value: string | undefined) {
  const o: string[] = [value || ''];
  const str = JSON.stringify(o);
  return str.substring(2, str.length - 2);
}

// src/background.ts
console.log('Bare-bones service worker loaded.');

// Function to create or update context menus
async function updateContextMenus() {
  await browser.contextMenus.removeAll(); // Clear existing menus

  const data: StoredData = {
    webhooks: '[]'
  };
  const items: StoredData = await browser.storage.sync.get(data) as StoredData;
  const webhooks: WebHook[] = JSON.parse(items.webhooks);

  for (const webhook of webhooks) {
    const { name, documentUrlPatterns, targetUrlPatterns } = webhook;

    const contexts: browser.contextMenus.ContextType[] = [];
    if (targetUrlPatterns && targetUrlPatterns.length > 0) {
      contexts.push("link", "image");
    } else {
      contexts.push("selection");
    }

    browser.contextMenus.create({
      id: name,
      title: name,
      contexts: contexts,
      documentUrlPatterns: documentUrlPatterns && documentUrlPatterns.length > 0 ? documentUrlPatterns : undefined,
      targetUrlPatterns: targetUrlPatterns && targetUrlPatterns.length > 0 ? targetUrlPatterns : undefined
    });
  }
}

browser.runtime.onInstalled.addListener(() => {
  console.log('Service worker installed.');
  updateContextMenus();
});

browser.runtime.onStartup.addListener(() => {
  console.log('Browser startup.');
  updateContextMenus();
});

// Also, listen for storage changes to update menus dynamically
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.webhooks) {
    console.log('Webhooks changed, updating context menus.');
    updateContextMenus();
  }
});

// Function to set the browser action icon and text (from original background.ts)
function setBrowserIcon(status: 'Default' | 'OK' | 'Error' | 'Sending', title?: string) {
  switch (status) {
    case 'OK':
      browser.action.setBadgeText({ text: '✓' });
      browser.action.setBadgeBackgroundColor({ color: '#00C851' });
      browser.action.setTitle({ title: title || 'Sent.' });
      break;
    case 'Error':
      browser.action.setBadgeText({ text: '!' });
      browser.action.setBadgeBackgroundColor({ color: '#ff4444' });
      browser.action.setTitle({ title: title || 'Error' });
      break;
    case 'Sending':
      browser.action.setBadgeText({ text: '…' });
      browser.action.setBadgeBackgroundColor({ color: '#ffbb33' });
      browser.action.setTitle({ title: title || 'Sending...' });
      break;
    default:
      browser.action.setBadgeText({ text: '' });
      browser.action.setTitle({ title: '' });
      break;
  }
}

// Listen for clicks on the extension icon
browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});

// Listen for context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const data: StoredData = {
    webhooks: '[]'
  };
  const items: StoredData = await browser.storage.sync.get(data) as StoredData;
  const webhooks: WebHook[] = JSON.parse(items.webhooks);

  const clickedWebhook = webhooks.find(wh => wh.name === info.menuItemId);

  if (clickedWebhook && clickedWebhook.action) {
    let content = '';
    if (info.selectionText) {
      content = info.selectionText;
    } else if (info.linkUrl) {
      content = info.linkUrl;
    } else if (info.srcUrl) {
      content = info.srcUrl;
    }

    await sendWebhook(clickedWebhook.action, content);
  }
});

// Listen for messages from popup/options page to set browser icon (from original background.ts)
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_BROWSER_ICON') {
    setBrowserIcon(message.status, message.title);
  }
});

// Function to send the webhook request (from original background.ts)
async function sendWebhook(action: WebHookAction, content: string) {
  const { method, url, payload, headers } = action;
  let body;

  if (payload !== undefined) {
    const now = new Date();
    const isoDateTime = now.toISOString();
    const localDateTime = now.toLocaleString();
    body = JSON.stringify(payload)
      .replace('{{content}}', escapeJsonValue(content))
      .replace('{{isoDateTime}}', isoDateTime)
      .replace('{{localDateTime}}', localDateTime);
  }

  setBrowserIcon('Sending');

  try {
    const resp = await fetch(url, {
      method: method || 'POST',
      headers: headers || {},
      body,
      mode: 'no-cors' // Consider changing this to 'cors' if you control the webhook endpoint and want to handle errors
    });

    if (resp.status >= 400) {
      setBrowserIcon('Error', `Error: ${resp.status}`);
    } else {
      setBrowserIcon('OK');
      setTimeout(() => {
        setBrowserIcon('Default');
      }, 750);
    }
  } catch (err: any) {
    setBrowserIcon('Error', `Error: ${err.message}`);
  }
}