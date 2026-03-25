/**
 * @file discovery/approval.js
 * @module janus7/discovery
 *
 * GM approval workflow (minimal v1)
 *
 * Philosophy:
 * - Never perform world-changing actions silently.
 * - If user is not GM: deny (future: request via socket).
 */

/**
 * Ask the GM for approval using DialogV2 (Foundry v13+).
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.html
 * @param {string} [opts.confirmLabel]
 * @param {string} [opts.cancelLabel]
 * @returns {Promise<boolean>}
 */
export async function requestGMApproval({ title, html, confirmLabel = 'OK', cancelLabel = 'Cancel' }) {
  const user = game?.user;
  if (!user?.isGM) {
    ui?.notifications?.warn?.(game?.i18n?.localize?.('JANUS7.UI.NoPermission.Action') ?? 'No permission.');
    return false;
  }

  try {
    const result = await foundry.applications.api.DialogV2.confirm({
      window: { title },
      content: html,
      yes: { label: confirmLabel },
      no: { label: cancelLabel },
      rejectClose: false,
    });
    return result === true;
  } catch {
    return false;
  }
}
