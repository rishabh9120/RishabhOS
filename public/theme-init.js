/*
 * Anti-flash-of-wrong-theme script, loaded from a real file (rather than an
 * inline <script> in index.html) so the site's Content-Security-Policy can
 * require script-src 'self' without needing 'unsafe-inline'.
 *
 * Runs before React or the stylesheet finish loading, so the very first
 * paint already has the right data-theme instead of flashing dark-then-
 * light (or vice versa). Mirrors the "stored choice, else OS preference"
 * logic in getPreferredTheme() in src/main.jsx - keep the two in sync if
 * this logic ever changes.
 */
(function () {
  try {
    var stored = localStorage.getItem('rishabh-theme');
    var theme = (stored === 'light' || stored === 'dark')
      ? stored
      : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    /* localStorage/matchMedia unavailable - CSS default theme still applies */
  }
})();
