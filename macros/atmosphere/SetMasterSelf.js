// JANUS7 – Atmosphere: Set Master (Self)
await game.janus7.atmosphere.setMasterClient(game.user.id, { broadcast: true });
ui.notifications.info(`JANUS7 Atmosphere: Master gesetzt (${game.user.name})`);
