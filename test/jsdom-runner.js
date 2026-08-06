/**
 * Runs the QUnit suite in Node, using jsdom instead of a real browser.
 *
 * This complements the browser run driven by jquery-test-runner: it needs no
 * browser or webdriver, so it works anywhere Node and jsdom are available.
 * Everything it loads can be pointed elsewhere with an environment variable,
 * which is what lets a packaged build test its installed files:
 *
 *   QUNIT_JS   path to qunit.js
 *   JQUERY_JS  path to jquery.js
 *   PLUGIN_JS  path to BootSideMenu.js
 *   TESTS_JS   path to the test suite
 *
 * jsdom has no layout engine, so the suite skips its layout tests here; those
 * are covered by the browser run.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");

// qunit's package exports allow this subpath, but jquery's do not, so build
// jquery's path by hand.  Requiring jquery outright is also not an option: its
// distribution throws unless a window with a document already exists.
const qunitJs = process.env.QUNIT_JS || require.resolve("qunit/qunit/qunit.js");
const jqueryJs =
  process.env.JQUERY_JS ||
  path.join(root, "node_modules", "jquery", "dist", "jquery.js");
const pluginJs =
  process.env.PLUGIN_JS || path.join(root, "js", "BootSideMenu.js");
const testsJs = process.env.TESTS_JS || path.join(__dirname, "tests.js");

const registerUmdTests = require("./umd-tests.js");

const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", function (error) {
  // jsdom does not implement scrolling, and the plugin does not care.
  if (!/Not implemented/.test(error.message)) {
    console.error("page error:", error.stack || error.message);
  }
});
["error", "warn"].forEach(function (level) {
  virtualConsole.on(level, function () {
    console.error.apply(console, arguments);
  });
});

const dom = new JSDOM(
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>BootSideMenu</title>
  </head>
  <body>
    <div id="qunit"></div>
    <div id="qunit-fixture"><div id="test"></div></div>
  </body>
</html>`,
  {
    runScripts: "dangerously",
    // jQuery's animations want requestAnimationFrame.
    pretendToBeVisual: true,
    url: "http://localhost/",
    virtualConsole,
  },
);

const window = dom.window;

// Without a layout engine these report 0, which would make the plugin treat
// every run as a narrow screen and quietly change the behaviour under test.
Object.defineProperty(window.document.documentElement, "clientWidth", {
  value: 1024,
  configurable: true,
});
Object.defineProperty(window.document.documentElement, "clientHeight", {
  value: 768,
  configurable: true,
});

function inject(file) {
  const script = window.document.createElement("script");
  script.textContent = fs.readFileSync(file, "utf8");
  window.document.head.appendChild(script);
}

inject(qunitJs);

const QUnit = window.QUnit;
QUnit.config.autostart = false;
QUnit.config.reorder = false;

inject(jqueryJs);
inject(pluginJs);
inject(testsJs);

registerUmdTests(
  QUnit,
  window,
  window.jQuery,
  fs.readFileSync(pluginJs, "utf8"),
);

let failed = 0;
let skipped = 0;
let finished = false;

QUnit.log(function (details) {
  if (details.result) {
    return;
  }

  failed += 1;
  const label = [details.module, details.name].filter(Boolean).join(" > ");
  console.log(`not ok - ${label}: ${details.message || "failed"}`);
  if (details.expected !== undefined || details.actual !== undefined) {
    console.log(`    expected: ${JSON.stringify(details.expected)}`);
    console.log(`    actual:   ${JSON.stringify(details.actual)}`);
  }
  if (details.source) {
    console.log(`    at ${String(details.source).split("\n")[0]}`);
  }
});

QUnit.testDone(function (details) {
  const label = [details.module, details.name].filter(Boolean).join(" > ");

  // qunit 1.x reports a skipped test as one with no assertions at all;
  // qunit 2.x sets a flag.
  if (details.skipped || details.total === 0) {
    skipped += 1;
    console.log(`skip - ${label}`);
  } else if (details.failed) {
    console.log(`NOT OK - ${label} (${details.passed}/${details.total})`);
  } else {
    console.log(`ok - ${label} (${details.passed}/${details.total})`);
  }
});

QUnit.done(function (details) {
  // Set before exiting: a second QUnit.done handler would never run, because
  // this one ends the process first.
  finished = true;

  console.log(
    `\n${details.passed}/${details.total} assertions passed, ` +
      `${details.failed} failed, ${skipped} test(s) skipped ` +
      `(${details.runtime}ms)`,
  );

  process.exit(details.failed > 0 || failed > 0 ? 1 : 0);
});

// Guard against exiting successfully while the suite is still pending, which
// is what happens when an async test never calls its done callback.
setTimeout(function () {
  console.error("timed out waiting for the suite to finish");
  process.exit(2);
}, 30000);

process.on("exit", function (code) {
  if (!finished && code === 0) {
    console.error("exited before the suite finished");
    process.exitCode = 2;
  }
});

QUnit.start();
