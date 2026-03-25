/**
 * @file P6_TC_06__i18n.test.js
 * @phase 6
 * @priority P1
 * 
 * Test i18n Helper-Funktionen mit Fallbacks
 */

export default {
  id: 'P6_TC_06__i18n',
  phase: 6,
  priority: 'P1',
  description: 'i18n Helper funktionieren mit Fallbacks',
  
  async run(ctx) {
    // Import Control Panel App
    const { JanusControlPanelApp } = await import('../../../../ui/control-panel/JanusControlPanelApp.js');
    const app = new JanusControlPanelApp();
    
    const originalI18n = game.i18n;
    
    try {
      // Test 1: _t() returns localized string
      ctx.log('Testing _t() with valid localization...');
      game.i18n = {
        localize: (key) => key === 'JANUS7.UI.Tabs.Status' ? 'Status (DE)' : key
      };
      const result1 = app._t('JANUS7.UI.Tabs.Status', 'Fallback');
      ctx.assert(result1 === 'Status (DE)', '_t() should return localized string');
      
      // Test 2: _t() returns fallback if key missing
      ctx.log('Testing _t() with missing key...');
      const result2 = app._t('NONEXISTENT.KEY', 'MyFallback');
      ctx.assert(result2 === 'MyFallback', '_t() should return fallback if key missing');
      
      // Test 3: _fmt() replaces placeholders
      ctx.log('Testing _fmt() with placeholders...');
      game.i18n = {
        format: (key, data) => `Action: ${data.action}`
      };
      const result3 = app._fmt('KEY', {action: 'test'}, 'Fallback');
      ctx.assert(result3.includes('test'), '_fmt() should replace {action} placeholder');
      
      // Test 4: i18n survives missing game.i18n
      ctx.log('Testing _t() without game.i18n...');
      game.i18n = undefined;
      const result4 = app._t('ANY.KEY', 'Safe');
      ctx.assert(result4 === 'Safe', '_t() should not crash if i18n missing');
      
      // Test 5: i18n survives broken localize function
      ctx.log('Testing _t() with broken localize...');
      game.i18n = { localize: () => { throw new Error('Broken'); } };
      const result5 = app._t('ANY.KEY', 'Safe2');
      ctx.assert(result5 === 'Safe2', '_t() should handle exceptions');
      
      // Test 6: _fmt() survives broken format function
      ctx.log('Testing _fmt() with broken format...');
      game.i18n = { format: () => { throw new Error('Broken'); } };
      const result6 = app._fmt('ANY.KEY', {test: 'data'}, 'Safe3');
      ctx.assert(result6 === 'Safe3', '_fmt() should handle exceptions');
      
      ctx.log('✓ All i18n tests passed');
      
    } finally {
      game.i18n = originalI18n;
    }
  }
};
