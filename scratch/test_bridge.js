/**
 * @file scratch/test_bridge.js
 * Run this in the Foundry console to verify the external bridge.
 */

async function testBridge() {
  console.log("JANUS7 | Testing External Bridge...");

  // 1. Test Python
  try {
    console.log("JANUS7 | Executing Python test...");
    const pyResult = await game.janus7.capabilities.ext.runScript("extensions/external-bridge/test.py", { foo: "bar" });
    console.log("JANUS7 | Python Result:", pyResult);
  } catch (err) {
    console.error("JANUS7 | Python Test Failed:", err);
  }

  // 2. Test SQLite (using a common module path if available)
  try {
    console.log("JANUS7 | Executing SQLite test...");
    // Adjust path if you have a specific DB
    const dbPath = "modules/Janus7/janus7.db"; 
    const sqlResult = await game.janus7.capabilities.ext.querySql(dbPath, "SELECT name FROM sqlite_master WHERE type='table'");
    console.log("JANUS7 | SQLite Result:", sqlResult);
  } catch (err) {
    console.error("JANUS7 | SQLite Test Failed:", err);
  }
}

testBridge();
