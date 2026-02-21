# Article Overload

Chrome extension that analyzes long-form X posts using the Anthropic API.

![Article Overload sidebar showing word count, Slop-o-Meter gauge, and key takeaways for an X post](screenshot.png)

When you visit a post, a sidebar slides in showing:

- **Word count & read time**
- **Slop-o-Meter** — animated gauge scoring 0–100 for how AI-generated the text appears
- **Key Takeaways** — 3–4 concise bullet points summarizing the post

## Install

1. Clone this repo
2. Open `chrome://extensions` and enable **Developer mode**
3. Click **Load unpacked** and select this directory
4. Click the extension icon on any X post to open the sidebar
5. Enter your [Anthropic API key](https://console.anthropic.com/) when prompted

## How It Works

Three files, no build step:

- **manifest.json** — MV3 manifest. Content script runs on x.com.
- **background.js** — Stores your API key in `chrome.storage.local` and proxies requests to the Anthropic Messages API.
- **content.js** — Injects a Shadow DOM sidebar, extracts the post text, calls Claude, and caches results per URL.

Posts under 100 words are skipped. Results are cached locally so revisiting a post won't use additional API credits.

## Removing Your API Key

Right-click the extension icon and select **Remove API Key**.

## Privacy

Your API key and cached results stay on your device. Post text is sent directly to the Anthropic API using your API key. No data is collected by the developer. See [PRIVACY.md](PRIVACY.md) for details.
