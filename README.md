# Position — Trading PnL Calculator

A responsive, dependency-free calculator for linear USDT-margined futures. English interface, dark/light themes, three modes, editable presets, optional fees, and quantity or margin sizing.

## Run locally

Open `index.html` in a modern browser. Keep `index.html`, `style.css`, and `app.js` together. All calculations work offline; no market data, fonts, libraries, or APIs are downloaded. Node is only needed to run tests, not the app.

For the live preview in this session, visit http://127.0.0.1:4173/ while the preview server is running.

Inputs, settings, and presets save in localStorage. Storage belongs to each browser and origin: local files, localhost, and deployed sites do not share settings. Some browsers restrict storage or clipboard access for local files; an on-screen message reports unavailable storage/copy support.

## Use

- **Price change:** enter signed market movement. Negative movement means a falling market regardless of direction.
- **Target ROI:** enter the desired return **before fees**. Short positions reverse the required market movement. Net ROI reflects enabled fees.
- **Entry / Exit:** enter actual prices to derive movement and returns.
- Disable leverage for 1× sizing. Supported leverage is 1–1,000×.
- Under Advanced settings, select asset quantity sizing, enable entry/exit trading fees, or manage presets. Presets can be added, edited, deleted, and reordered independently for leverage, price change, and target ROI. At most 20 values per group.
- Reset restores calculator defaults while retaining custom presets and theme.

## Calculation model

Entry notional = margin × leverage. Quantity = entry notional / entry price. In quantity sizing, margin = quantity × entry price / leverage.

Gross PnL = quantity × (exit − entry) for Long, with the sign reversed for Short. Fees = (entry notional + exit notional) × fee rate / 100. Net PnL = gross PnL − fees. Net ROI = net PnL / initial margin × 100. Target movement = target ROI / leverage, with direction applied to exit price.

Results are theoretical estimates. Funding, slippage, inverse contracts, tiered fees, and exchange-specific maintenance margins are excluded. Losses reaching or exceeding isolated margin are explicitly flagged as non-executable scenarios. Actual liquidation may occur earlier; no exact liquidation price is claimed. Financial values display two decimals; prices and asset quantity display up to eight. Calculations use JavaScript floating-point numbers and reject non-finite results.

## Verification

Run `node test.js`. Tests cover all numerical cases in the brief, Long and Short ROI targets, quantity sizing, entry/exit mode, invalid inputs, overflow, and liquidation at or beyond margin.

Browser verification: default result +$20 / +40%; added 25× preset survived reload; desktop two-column layout and 390px mobile one-column layout reviewed, with no horizontal overflow. Keyboard focus and native controls are available throughout. Preset editor supports Escape to close.

## Deploy to GitHub Pages

1. Commit the project files and push to a GitHub repository.
2. Open repository **Settings → Pages**.
3. Select **Deploy from a branch**, choose your branch and **/(root)**, then save.
4. Open the published URL after deployment completes.

All asset paths are relative, including under repository subpaths. See [GitHub's publishing-source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Deploy to Cloudflare Pages

Create a Pages project and connect the Git repository. Select no framework, leave the build command empty, and set the output directory to the repository root (`.`). Deploy. Alternatively upload a directory containing the static runtime files through Pages Direct Upload. No secrets or environment variables are required. See [Cloudflare's static HTML guide](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/).

## Offline behavior

A local copy works completely offline. A hosted page already loaded also continues calculating without a connection. No service worker is installed: a hosted URL cannot guarantee a fresh offline navigation. Save the runtime files locally for reliable offline access.

## Files

- `index.html`: semantic interface and controls
- `style.css`: responsive styling and themes
- `app.js`: pure calculator plus UI/persistence/preset handling
- `test.js`: dependency-free numerical tests
- `AGENTS.md`: maintenance instructions

Quick-action rows include Customize buttons that open the matching preset group directly. Empty leverage and values below 1 automatically become 1× while typing and when restoring saved inputs.
