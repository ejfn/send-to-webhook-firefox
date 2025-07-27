function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      clearTimeout(timeout);
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

const MATCH_PATTERNS_URL = 'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns';

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element not found');
    return;
  }

  let webhooks: WebHook[] = [];
  let saveStatus: string = '';
  let error: boolean = false;

  const loadConfig = async () => {
    const data: StoredData = {
      webhooks: '[]',
    };
    const items: StoredData = await browser.storage.sync.get(data) as StoredData;
    webhooks = JSON.parse(items.webhooks).map((wh: WebHook) => ({
      ...wh,
      action: {
        method: wh.action?.method || 'POST',
        url: wh.action?.url || '',
        payload: wh.action?.payload,
        headers: wh.action?.headers || {},
      }
    }));
    render();
  };

  const debouncedSave = debounce(() => {
    const data: Partial<StoredData> = {
      webhooks: JSON.stringify(webhooks)
    };

    browser.storage.sync.set({ webhooks: data.webhooks }).then(() => {
      saveStatus = 'Options saved.';
      error = false;
      render();
      setTimeout(() => {
        saveStatus = '';
        render();
      }, 750);
    });
  }, 500);

  const addWebhook = () => {
    webhooks.push({
      name: '',
      action: { url: '', method: 'POST', headers: {} }
    });
    render();
  };

  const removeWebhook = (index: number) => {
    webhooks.splice(index, 1);
    render();
  };

  const addHeader = (webhookIndex: number) => {
    if (!webhooks[webhookIndex].action.headers) {
      webhooks[webhookIndex].action.headers = {};
    }
    // Add a dummy key to trigger re-render and new input fields
    const newKey = `new-header-${Date.now()}`;
    webhooks[webhookIndex].action.headers[newKey] = '';
    render();
  };

  const removeHeader = (webhookIndex: number, headerKey: string) => {
    if (webhooks[webhookIndex].action.headers) {
      delete webhooks[webhookIndex].action.headers[headerKey];
    }
    render();
  };

  const render = () => {
    // Clear existing content
    root.innerHTML = '';

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'options';
    root.appendChild(optionsDiv);

    const h3 = document.createElement('h3');
    h3.textContent = 'WebHooks Configuration';
    optionsDiv.appendChild(h3);

    const webhookListDiv = document.createElement('div');
    webhookListDiv.id = 'webhookList';
    optionsDiv.appendChild(webhookListDiv);

    webhooks.forEach((webhook, index) => {
      const webhookEntryDiv = document.createElement('div');
      webhookEntryDiv.className = 'webhook-entry';
      webhookListDiv.appendChild(webhookEntryDiv);

      const h4 = document.createElement('h4');
      h4.textContent = `Webhook ${index + 1}: ${webhook.name || '(New Webhook)'}`;
      webhookEntryDiv.appendChild(h4);

      // Webhook Name
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Webhook Name:';
      webhookEntryDiv.appendChild(nameLabel);
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'webhook-name';
      nameInput.value = webhook.name || '';
      nameInput.placeholder = 'e.g., My Slack Channel, Bitrise iOS Upload';
      nameInput.addEventListener('input', () => {
        webhooks[index].name = nameInput.value;
        h4.textContent = `Webhook ${index + 1}: ${nameInput.value || '(New Webhook)'}`;
      });
      webhookEntryDiv.appendChild(nameInput);

      // Document URL Patterns
      const docPatternsLabel = document.createElement('label');
      docPatternsLabel.textContent = 'Document URL Patterns: ';
      const docPatternsLink = document.createElement('a');
      docPatternsLink.href = MATCH_PATTERNS_URL;
      docPatternsLink.target = '_blank';
      docPatternsLink.textContent = '(Match Patterns)';
      docPatternsLabel.appendChild(docPatternsLink);
      webhookEntryDiv.appendChild(docPatternsLabel);
      const docPatternsTextarea = document.createElement('textarea');
      docPatternsTextarea.className = 'document-url-patterns';
      docPatternsTextarea.placeholder = 'One pattern per line. Webhook appears on pages matching these URLs.';
      docPatternsTextarea.value = (webhook.documentUrlPatterns || []).join('\n');
      docPatternsTextarea.addEventListener('input', () => {
        webhooks[index].documentUrlPatterns = docPatternsTextarea.value.split('\n').filter(p => p.trim() !== '');
      });
      webhookEntryDiv.appendChild(docPatternsTextarea);

      // Target URL Patterns
      const targetPatternsLabel = document.createElement('label');
      targetPatternsLabel.textContent = 'Target URL Patterns: ';
      const targetPatternsLink = document.createElement('a');
      targetPatternsLink.href = MATCH_PATTERNS_URL;
      targetPatternsLink.target = '_blank';
      targetPatternsLink.textContent = '(Match Patterns)';
      targetPatternsLabel.appendChild(targetPatternsLink);
      webhookEntryDiv.appendChild(targetPatternsLabel);
      const targetPatternsTextarea = document.createElement('textarea');
      targetPatternsTextarea.className = 'target-url-patterns';
      targetPatternsTextarea.placeholder = 'One pattern per line. Webhook applies to links/images matching these URLs.';
      targetPatternsTextarea.value = (webhook.targetUrlPatterns || []).join('\n');
      targetPatternsTextarea.addEventListener('input', () => {
        webhooks[index].targetUrlPatterns = targetPatternsTextarea.value.split('\n').filter(p => p.trim() !== '');
      });
      webhookEntryDiv.appendChild(targetPatternsTextarea);

      // HTTP Method
      const methodLabel = document.createElement('label');
      methodLabel.textContent = 'HTTP Method:';
      webhookEntryDiv.appendChild(methodLabel);
      const methodSelect = document.createElement('select');
      methodSelect.className = 'action-method';
      methodSelect.addEventListener('input', () => {
        webhooks[index].action.method = methodSelect.value as 'GET' | 'POST';
      });
      webhookEntryDiv.appendChild(methodSelect);
      const postOption = document.createElement('option');
      postOption.value = 'POST';
      postOption.textContent = 'POST';
      postOption.selected = webhook.action?.method === 'POST';
      methodSelect.appendChild(postOption);
      const getOption = document.createElement('option');
      getOption.value = 'GET';
      getOption.textContent = 'GET';
      getOption.selected = webhook.action?.method === 'GET';
      methodSelect.appendChild(getOption);

      // Webhook Endpoint URL
      const urlLabel = document.createElement('label');
      urlLabel.textContent = 'Webhook Endpoint URL:';
      webhookEntryDiv.appendChild(urlLabel);
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.className = 'action-url';
      urlInput.value = webhook.action?.url || '';
      urlInput.placeholder = 'e.g., https://hooks.slack.com/services/...';
      urlInput.addEventListener('input', () => {
        webhooks[index].action.url = urlInput.value;
      });
      webhookEntryDiv.appendChild(urlInput);

      // Request Body
      const payloadLabel = document.createElement('label');
      payloadLabel.textContent = 'Request Body (JSON):';
      webhookEntryDiv.appendChild(payloadLabel);
      const payloadTextarea = document.createElement('textarea');
      payloadTextarea.className = 'action-payload';
      payloadTextarea.placeholder = 'JSON payload. {{content}}, {{isoDateTime}}, {{localDateTime}} are supported.';
      payloadTextarea.value = webhook.action?.payload ? JSON.stringify(webhook.action.payload, null, 2) : '';
      payloadTextarea.addEventListener('input', () => {
        try {
          webhooks[index].action.payload = payloadTextarea.value ? JSON.parse(payloadTextarea.value) : undefined;
        } catch (e) {
          console.warn('Invalid JSON payload during input', e);
        }
      });
      webhookEntryDiv.appendChild(payloadTextarea);

      // Request Headers
      const headersLabel = document.createElement('label');
      headersLabel.textContent = 'Request Headers:';
      webhookEntryDiv.appendChild(headersLabel);
      const headersContainer = document.createElement('div');
      headersContainer.className = 'headers-container';
      webhookEntryDiv.appendChild(headersContainer);

      const renderHeaders = () => {
        headersContainer.innerHTML = '';
        Object.entries(webhook.action?.headers || {}).forEach(([key, value]) => {
          const headerEntryDiv = document.createElement('div');
          headerEntryDiv.className = 'header-entry';
          headersContainer.appendChild(headerEntryDiv);

          const keyInput = document.createElement('input');
          keyInput.type = 'text';
          keyInput.className = 'header-key';
          keyInput.value = key;
          keyInput.placeholder = 'Header Name';
          headerEntryDiv.appendChild(keyInput);

          const valueInput = document.createElement('input');
          valueInput.type = 'text';
          valueInput.className = 'header-value';
          valueInput.value = value as string;
          valueInput.placeholder = 'Header Value';
          headerEntryDiv.appendChild(valueInput);
          
          const removeHeaderButton = document.createElement('button');
          removeHeaderButton.className = 'remove-header';
          removeHeaderButton.textContent = 'Remove';
          removeHeaderButton.addEventListener('click', () => {
            if (webhooks[index].action.headers) {
              delete webhooks[index].action.headers[key];
            }
            renderHeaders();
          });
          headerEntryDiv.appendChild(removeHeaderButton);
          
          keyInput.addEventListener('input', () => {
            const newKey = keyInput.value;
            const headers = webhooks[index].action.headers;
            if (headers && newKey !== key) {
              headers[newKey] = headers[key];
              delete headers[key];
              renderHeaders();
            }
          });

          valueInput.addEventListener('input', () => {
            if (webhooks[index].action.headers) {
              webhooks[index].action.headers[key] = valueInput.value;
            }
          });
        });

        const addHeaderButton = document.createElement('button');
        addHeaderButton.className = 'add-header';
        addHeaderButton.textContent = 'Add Header';
        addHeaderButton.addEventListener('click', () => {
          if (!webhooks[index].action.headers) {
            webhooks[index].action.headers = {};
          }
          const newKey = `new-header-${Date.now()}`;
          webhooks[index].action.headers[newKey] = '';
          renderHeaders();
        });
        headersContainer.appendChild(addHeaderButton);
      };
      renderHeaders();

      // Remove Webhook Button
      const removeWebhookButton = document.createElement('button');
      removeWebhookButton.className = 'remove-webhook';
      removeWebhookButton.textContent = 'Remove Webhook';
      removeWebhookButton.addEventListener('click', () => removeWebhook(index));
      webhookEntryDiv.appendChild(removeWebhookButton);
    });

    const bottomButtonsDiv = document.createElement('div');
    bottomButtonsDiv.className = 'bottom-buttons';
    optionsDiv.appendChild(bottomButtonsDiv);

    const addWebhookButton = document.createElement('button');
    addWebhookButton.id = 'addWebhook';
    addWebhookButton.textContent = 'Add New Webhook';
    bottomButtonsDiv.appendChild(addWebhookButton);

    const saveStatusDiv = document.createElement('div');
    saveStatusDiv.id = 'saveStatus';
    saveStatusDiv.className = error ? 'error' : '';
    saveStatusDiv.textContent = saveStatus;
    bottomButtonsDiv.appendChild(saveStatusDiv);

    const saveOptionsButton = document.createElement('button');
    saveOptionsButton.id = 'saveOptions';
    saveOptionsButton.textContent = 'Save Options';
    bottomButtonsDiv.appendChild(saveOptionsButton);

    // Event Listeners
    addWebhookButton.addEventListener('click', addWebhook);
    saveOptionsButton.addEventListener('click', debouncedSave);
  };

  await loadConfig();
});