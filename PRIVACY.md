# Privacy Policy — Article Overload

**Last updated:** February 21, 2026

Article Overload is a Chrome extension that analyzes long-form X articles using the Anthropic API. This policy explains how your data is handled.

## Data Collection

Article Overload does **not** collect, store, or transmit any personal data to the developer or any third-party server controlled by the developer. There is no analytics, telemetry, or tracking of any kind.

## Anthropic API

When you visit an X post, the text of that post is sent directly to the Anthropic Messages API (`api.anthropic.com`) for analysis. This request is made using **your own API key**, which you provide. The developer never has access to your API key or the content of your API requests.

Your use of the Anthropic API is governed by [Anthropic's Usage Policy](https://www.anthropic.com/policies) and [Privacy Policy](https://www.anthropic.com/privacy).

## Local Storage

The extension uses `chrome.storage.local` (on your device only) to store:

- Your Anthropic API key
- Cached analysis results for previously visited posts

This data never leaves your browser except for API requests sent directly to Anthropic as described above.

## Permissions

- **storage** — Save your API key and cached results locally
- **contextMenus** — Provide a right-click option to remove your API key
- **host_permissions (`api.anthropic.com`)** — Send post text to the Anthropic API for analysis

## Contact

If you have questions about this policy, open an issue on the [GitHub repository](https://github.com/gwintrob/article-overload).

## Changes

Any updates to this policy will be reflected in this file with an updated date.
