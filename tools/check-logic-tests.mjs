import { mockFoundry } from './mock-foundry.mjs';
mockFoundry();

// Dynamic imports to avoid hoisting issues with global mocks
async function main() {
    const { Janus7Engine } = await import('../core/index.js');
    const { default: P1_TC_03 } = await import('../core/test/tests/p1/P1_TC_03__state_get_set_funktioniert.test.js');
    const { default: P7_TC_10 } = await import('../core/test/tests/p7/P7_TC_10__ki_import_rejects_empty_patches.test.js');
    const { default: P8_TC_01 } = await import('../core/test/tests/p8/P8_TC_01__folder_service_profile_aware.test.js');

    const engine = new Janus7Engine();
    engine.init();
    await engine.ready();

    let passed = 0;
    let total = 0;

    const runTest = async (test, engine) => {
        console.log(`Running ${test.id}: ${test.title || test.id}...`);
        try {
            const result = await test.run({ engine, ctx: { engine } });
            console.log(`  Result: ${result.ok ? 'PASS' : 'FAIL'} - ${result.summary}`);
            return result.ok;
        } catch (err) {
            console.error(`  ERROR: ${err.message}`);
            return false;
        }
    };

    const tests = [P1_TC_03, P7_TC_10, P8_TC_01];
    for (const test of tests) {
        total++;
        if (await runTest(test, engine)) passed++;
    }

    console.log(`\nSummary: ${passed}/${total} logic tests passed in Node.js environment.`);
    process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
