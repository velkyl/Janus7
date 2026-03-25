/**
 * ui/helpers.js
 *
 * Lightweight UI helpers for ApplicationV2-based JANUS7 UIs.
 * Keep this file dependency-free and safe to import during startup.
 */

function escape(text) {
  // Basic HTML escaping for safe injection into template strings.
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function confirm(title, message) {
  const DialogV2 = foundry?.applications?.api?.DialogV2;

  if (DialogV2) {
    return await new Promise((resolve) => {
      const dialog = new DialogV2({
        window: { title },
        content: `<p>${escape(message)}</p>`,
        buttons: [
          { action: 'yes', label: 'Ja', default: true },
          { action: 'no', label: 'Nein', default: false }
        ],
        modal: true,
        rejectClose: false,
        close: (_ev, _html, result) => resolve(result === 'yes')
      });
      dialog.render(true);
    });
  }

  // Fallback (no DialogV2): rely on browser confirm.
  return globalThis.confirm(`${title}\n\n${message}`);
}

async function prompt(params = {}) {
  const {
    title = 'Eingabe',
    label = 'Wert',
    defaultValue = '',
    placeholder = '',
    okLabel = 'OK',
    cancelLabel = 'Abbrechen'
  } = params;

  const content = `
    <form class="janus7-prompt">
      <div class="form-group">
        <label>${escape(label)}</label>
        <input type="text" name="value" value="${escape(defaultValue)}" placeholder="${escape(placeholder)}"/>
      </div>
    </form>
  `;

  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (DialogV2) {
    return await new Promise((resolve) => {
      const dlg = new DialogV2({
        window: { title },
        content,
        buttons: [
          { action: 'cancel', label: cancelLabel, default: false },
          { action: 'ok', label: okLabel, default: true }
        ],
        modal: true,
        rejectClose: false,
        close: (_ev, html, result) => {
          if (result !== 'ok') return resolve(null);
          const input = html?.querySelector('input[name="value"]');
          resolve(input?.value ?? String(defaultValue ?? ''));
        }
      });
      dlg.render(true);
    });
  }

  // Fallback: browser prompt.
  const value = globalThis.prompt(`${title}\n${label}`, `${defaultValue ?? ''}`);
  return value === null ? null : String(value);
}

async function choose(params = {}) {
  const {
    title = 'Auswahl',
    label = 'Bitte wählen',
    choices = [],
    selected = null,
    okLabel = 'OK',
    cancelLabel = 'Abbrechen'
  } = params;

  const normalized = Array.isArray(choices)
    ? choices.map((c) => (typeof c === 'string' ? { value: c, label: c } : c))
    : Object.entries(choices).map(([value, lbl]) => ({ value, label: lbl }));

  const options = normalized
    .map(({ value, label: lbl }) => {
      const sel = (selected !== null && String(selected) === String(value)) ? 'selected' : '';
      return `<option value="${escape(String(value))}" ${sel}>${escape(String(lbl))}</option>`;
    })
    .join('');

  const content = `
    <form class="janus7-choose">
      <div class="form-group">
        <label>${escape(label)}</label>
        <select name="value">${options}</select>
      </div>
    </form>
  `;

  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (DialogV2) {
    return await new Promise((resolve) => {
      const dlg = new DialogV2({
        window: { title },
        content,
        buttons: [
          { action: 'cancel', label: cancelLabel, default: false },
          { action: 'ok', label: okLabel, default: true }
        ],
        modal: true,
        rejectClose: false,
        close: (_ev, html, result) => {
          if (result !== 'ok') return resolve(null);
          const select = html?.querySelector('select[name="value"]');
          resolve(select?.value ?? null);
        }
      });
      dlg.render(true);
    });
  }

  // Fallback: first option.
  return normalized.length ? normalized[0].value : null;
}


async function promptTextarea(params = {}) {
  const {
    title = 'Text eingeben',
    label = 'Inhalt',
    defaultValue = '',
    placeholder = '',
    okLabel = 'OK',
    cancelLabel = 'Abbrechen',
    rows = 16
  } = params;

  const content = `
    <form class="janus7-prompt janus7-prompt--textarea">
      <div class="form-group">
        <label>${escape(label)}</label>
        <textarea name="value" rows="${Number(rows) || 16}" style="width:100%;font-family:monospace;font-size:11px" placeholder="${escape(placeholder)}">${escape(defaultValue)}</textarea>
      </div>
    </form>
  `;

  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (DialogV2) {
    return await new Promise((resolve) => {
      const dlg = new DialogV2({
        window: { title },
        content,
        buttons: [
          { action: 'cancel', label: cancelLabel, default: false },
          { action: 'ok', label: okLabel, default: true }
        ],
        modal: true,
        rejectClose: false,
        close: (_ev, html, result) => {
          if (result !== 'ok') return resolve(null);
          const input = html?.querySelector('textarea[name="value"]');
          resolve(input?.value ?? String(defaultValue ?? ''));
        }
      });
      dlg.render(true);
    });
  }

  const value = globalThis.prompt(`${title}
${label}`, `${defaultValue ?? ''}`);
  return value === null ? null : String(value);
}

async function showTextDialog(params = {}) {
  const { title = 'Hinweis', content = '', closeLabel = 'Schließen' } = params;
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (DialogV2) {
    return await new Promise((resolve) => {
      const dlg = new DialogV2({
        window: { title },
        content,
        buttons: [{ action: 'ok', label: closeLabel, default: true }],
        modal: true,
        rejectClose: false,
        close: () => resolve(true)
      });
      dlg.render(true);
    });
  }
  return true;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
async function copyToClipboard(text) {
  try {
    // Try modern Clipboard API first
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text ?? ''));
      return true;
    }
    
    // Fallback: create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = String(text ?? '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    (game?.janus7?.core?.logger ?? console).warn?.('Failed to copy to clipboard:', err);
    return false;
  }
}

export const JanusUI = {
  escape,
  confirm,
  prompt,
  choose,
  promptTextarea,
  showTextDialog,
  copyToClipboard
};
