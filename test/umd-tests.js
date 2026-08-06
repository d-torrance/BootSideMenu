/**
 * Tests for the UMD wrapper's three module-loading branches.
 *
 * These need control over the loader globals (module, exports, define), which
 * is only practical from Node, so they live here rather than in test/tests.js
 * and are registered by test/jsdom-runner.js.  They still report through the
 * same QUnit run.
 */

"use strict";

// Evaluate the plugin source with a chosen set of globals in scope.  Only the
// named globals are declared, so anything left out stays an undeclared free
// variable -- which is what lets us tell "passed as undefined" apart from
// "not available at all".  The UMD header itself is safe either way because it
// guards on typeof.
function loadPlugin(source, globals) {
  var names = Object.keys(globals);
  var values = names.map(function (name) {
    return globals[name];
  });

  Function.apply(null, names.concat([source])).apply(null, values);
}

module.exports = function register(QUnit, window, jQuery, source) {
  function withoutPlugin(callback) {
    var saved = jQuery.fn.BootSideMenu;
    delete jQuery.fn.BootSideMenu;
    try {
      callback();
    } finally {
      jQuery.fn.BootSideMenu = saved;
    }
  }

  QUnit.module("BootSideMenu: module loading");

  QUnit.test("the browser global branch registers", function (assert) {
    withoutPlugin(function () {
      loadPlugin(source, {
        jQuery: jQuery,
        window: window,
        document: window.document,
      });

      assert.equal(typeof jQuery.fn.BootSideMenu, "function");
    });
  });

  // This is the branch a webpack build takes, because webpack defines
  // define.amd, and so it is the branch real consumers depend on.
  QUnit.test("the AMD branch requires jquery and registers", function (assert) {
    withoutPlugin(function () {
      var requested = null;

      var define = function (dependencies, factory) {
        requested = dependencies;
        factory(jQuery);
      };
      define.amd = {};

      loadPlugin(source, {
        define: define,
        window: window,
        document: window.document,
      });

      assert.deepEqual(requested, ["jquery"], "it asks for jquery");
      assert.equal(typeof jQuery.fn.BootSideMenu, "function", "it registers");
    });
  });

  // The CommonJS branch exports a factory rather than registering on load,
  // following the usual jQuery plugin convention: requiring the module is not
  // enough, the export has to be called.
  QUnit.test("the CommonJS branch exports a factory", function (assert) {
    withoutPlugin(function () {
      var module = { exports: {} };

      loadPlugin(source, {
        module: module,
        window: window,
        document: window.document,
      });

      assert.equal(typeof module.exports, "function", "a factory is exported");
      assert.equal(
        typeof jQuery.fn.BootSideMenu,
        "undefined",
        "loading alone does not register the plugin",
      );

      var returned = module.exports(window, jQuery);

      assert.equal(
        typeof jQuery.fn.BootSideMenu,
        "function",
        "calling the factory registers the plugin",
      );
      assert.strictEqual(returned, jQuery, "the factory returns jQuery");
    });
  });

  // Documents a limitation rather than asserting desirable behaviour: the
  // plugin body uses the bare globals document and window, so a menu cannot be
  // created outside a browser-like global context even once registered.
  QUnit.test("creating a menu needs a global document", function (assert) {
    withoutPlugin(function () {
      var module = { exports: {} };

      loadPlugin(source, { module: module });
      module.exports(window, jQuery);

      assert.equal(
        typeof jQuery.fn.BootSideMenu,
        "function",
        "registration itself succeeds",
      );
      assert.throws(
        function () {
          jQuery("<div/>").BootSideMenu({ remember: false });
        },
        /document is not defined/,
        "but creating a menu throws",
      );
    });
  });
};
