/**
 * Inline pre-hydration script: applies the saved theme class to <html>
 * before React paints, preventing FOUC. Runs from a cookie set by ThemeToggle
 * (or defaults to "dark"). Kept as a raw string so it can be injected in <head>
 * via dangerouslySetInnerHTML without becoming a client component.
 */
export const THEME_COOKIE = "finsim-theme";
export type Theme = "dark" | "light";

export const themeInitScript = `
(function() {
  try {
    var m = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]+)/);
    var t = m ? decodeURIComponent(m[1]) : "dark";
    if (t !== "dark" && t !== "light") t = "dark";
    var el = document.documentElement;
    el.classList.remove("dark", "light");
    el.classList.add(t);
    el.style.colorScheme = t;
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;
