## Send To WebHook

A Firefox add‑on to send links, images, or selected text to configurable webhooks.
### How to Configure
Configure your webhooks to quickly send page information to predefined endpoints. Each webhook configuration includes the following fields:
*   **Webhook Name**: A descriptive name for your webhook (e.g., "My Slack Channel", "Bitrise iOS Upload"). This name will appear in the extension's popup menu.

*   **Document URL Patterns**: (Optional) One pattern per line. Use this to restrict when the webhook appears. The webhook will only be available on pages whose URLs match one of these patterns. For details on pattern format, refer to [Match Patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns).

*   **Target URL Patterns**: (Optional) One pattern per line. Similar to Document URL Patterns, but applies when you right-click on a link or image. The webhook will only be available for links or images whose URLs match one of these patterns. If not provided, the webhook will apply to selected text. For details on pattern format, refer to [Match Patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns).

*   **HTTP Method**: Choose the HTTP method for the request: `POST` (for sending data) or `GET` (for retrieving data). Defaults to `POST`.

*   **Webhook Endpoint URL**: The full URL of the target endpoint where the data will be sent (e.g., `https://hooks.slack.com/services/...`).

*   **Request Body (JSON)**: (Optional) Define the request body as a JSON object or a plain string. You can use the following placeholders to dynamically insert content:
    *   `{{content}}`: Inserts the selected text, link URL, or image URL depending on the context.
    *   `{{isoDateTime}}`: Inserts the current date and time in ISO format.
    *   `{{localDateTime}}`: Inserts the current date and time in locale format.

    Example JSON body with templates:
    ```json
    {
      "content": "{{content}}",
      "isoDate": "{{isoDateTime}}",
      "localeDate": "{{localDateTime}}"
    }
    ```

*   **Request Headers**: (Optional) Add custom HTTP headers as key-value pairs. Click "Add Header" to add new fields, and "Remove" to delete them.





### Examples



#### Example 1: Send selected text to Slack

*   **Webhook Name**: MySlack#random
*   **Document URL Patterns**: (empty)
*   **Target URL Patterns**: (empty)
*   **HTTP Method**: POST
*   **Webhook Endpoint URL**: `<YOUR-SLACK-CHANNELS-INCOMING-WEBHOOK-URL>`
*   **Request Body (JSON)**:
    ```json
    {
      "selectedText": "{{content}}"
    }
    ```
*   **Request Headers**: (empty)

#### Example 2: Bitrise iOS Upload

*   **Webhook Name**: Bitrise iOS Upload
*   **Document URL Patterns**: (empty)
*   **Target URL Patterns**: `https://*.amazonaws.com/ios%2F%40username%2Ftestapp-*-archive.ipa`
*   **HTTP Method**: POST
*   **Webhook Endpoint URL**: `https://app.bitrise.io/app/xxxxxxxxxx/build/start.json`
*   **Request Body (JSON)**:
    ```json
    {
      "hook_info": {
        "type": "bitrise",
        "api_token": "<BITRISE_API_TOKEN>"
      },
      "build_params": {
        "workflow_id": "ios"
      },
      "environments": [
        {
          "mapped_to": "IPA_URL",
          "value": "{{content}}",
          "is_expand": true
        }
      ],
      "triggered_by": "send-to-webhook"
    }
    ```
*   **Request Headers**: (empty)

### Change History
- **2025-07-27:** Converted from a Chrome extension to a Firefox add-on, including updating to Manifest V3, improving the UI, and removing all Chrome-specific dependencies and APIs.
