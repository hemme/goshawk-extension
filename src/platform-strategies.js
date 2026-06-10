/*
 * Platform strategies for detecting whether analysis/capture should be
 * disabled on a given Go server. Each strategy defines:
 *
 *   name             — Human-readable platform name
 *   match(url)       — Returns true when the strategy handles the given URL
 *   detectDisabled(tabId)
 *                    — Returns { disabled, reason? } by injecting a content
 *                      script into the tab and inspecting server-specific state
 */
window.PLATFORM_STRATEGIES = [
  {
    name: 'OGS',
    match: (url) => url.hostname === 'online-go.com',
    detectDisabled: async (tabId) => {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          const onGameRoute = window.location.pathname.includes('/game');
          const hasGameId = !!document.querySelector('[data-game-id]');
          const phase = window.global_goban?.engine?.phase;
          const analysisIsDisabled = window.global_goban?.engine?.disable_analysis;
          return onGameRoute && hasGameId && phase === 'play' && analysisIsDisabled;
        }
      });
      return {
        disabled: !!result?.result,
        reason: 'Analysis disabled during this match'
      };
    }
  },
  {
    name: 'ShinKGS',
    match: (url) => url.hostname === 'shinkgs.com' || url.hostname.endsWith('.shinkgs.com'),
    detectDisabled: async (tabId) => ({ disabled: false })
  },
  {
    name: 'Dragon Go Server',
    match: (url) => url.hostname === 'dragongoserver.net' || url.hostname === 'www.dragongoserver.net',
    detectDisabled: async (tabId) => ({ disabled: false })
  }
];
