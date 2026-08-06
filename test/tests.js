/**
 * BootSideMenu test suite.
 *
 * This file is loaded both by test/index.html (in a real browser, via
 * jquery-test-runner) and by test/jsdom-runner.js (in Node, via jsdom).  It
 * must therefore stick to the QUnit API that both qunit 2.x and Debian's
 * libjs-qunit 1.23.1 provide: QUnit.module/test/skip and the
 * ok/notOk/equal/strictEqual/deepEqual/throws/expect/async assertions.
 *
 * In particular, do not use assert.true/false, assert.step, assert.timeout,
 * QUnit.test.each, QUnit.test.skip or QUnit.on -- those are qunit 2.x only.
 */

(function () {
  // jsdom has no layout engine, so anything that depends on a measured width
  // is meaningless there.  Those tests run in the browser and skip in jsdom.
  var hasLayout = document.body.getBoundingClientRect().width > 0;

  function testLayout(name, callback) {
    (hasLayout ? QUnit.test : QUnit.skip)(name, callback);
  }

  function clearStorage() {
    document.cookie.split(";").forEach(function (cookie) {
      var name = cookie.split("=")[0].replace(/^\s+/, "");
      if (name) {
        document.cookie =
          name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      }
    });

    try {
      window.localStorage.clear();
    } catch {
      // no storage here; nothing to clear
    }
  }

  // What the plugin reads for $(window).width() is documentElement.clientWidth,
  // so shadowing it with an own property is enough to pretend the window is a
  // different size -- in a real browser as well as in jsdom.
  var savedWidth;

  function setWindowWidth(width) {
    if (savedWidth === undefined) {
      savedWidth =
        Object.getOwnPropertyDescriptor(
          document.documentElement,
          "clientWidth",
        ) || null;
    }

    Object.defineProperty(document.documentElement, "clientWidth", {
      value: width,
      configurable: true,
    });
  }

  function restoreWindowWidth() {
    if (savedWidth === undefined) {
      return;
    }

    if (savedWidth) {
      Object.defineProperty(
        document.documentElement,
        "clientWidth",
        savedWidth,
      );
    } else {
      delete document.documentElement.clientWidth;
    }

    savedWidth = undefined;
  }

  // The debounce this replaced compared milliseconds-within-the-second, so
  // "start + 250" could exceed 999 and a resize beginning this late in a
  // second was dropped and never handled.  Firing from here makes that a
  // certain failure rather than a one-in-four flake.
  function atLateMillisecond(callback) {
    var ms = new Date().getMilliseconds();
    window.setTimeout(callback, ms >= 750 ? 0 : 750 - ms);
  }

  var hooks = {
    beforeEach: function () {
      clearStorage();

      // #qunit-fixture resets the DOM between tests, but not the body
      // margins that pushBody sets, nor the animation queue.
      jQuery.fx.off = true;
    },

    afterEach: function () {
      jQuery("body").css({ marginLeft: "", marginRight: "" });
      jQuery.fx.off = false;
      restoreWindowWidth();
      clearStorage();
    },
  };

  QUnit.module("BootSideMenu", hooks);

  QUnit.test("registered as a jQuery plugin", function (assert) {
    assert.equal(typeof jQuery.fn.BootSideMenu, "function");
  });

  QUnit.test("side: left adds the left classes", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      side: "left",
      remember: false,
    });

    assert.ok($menu.hasClass("bootsidemenu"), "has bootsidemenu class");
    assert.ok(
      $menu.hasClass("bootsidemenu-left"),
      "has bootsidemenu-left class",
    );
    assert.ok($menu.hasClass("container"), "has container class");
  });

  QUnit.test("side: right adds the right classes", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      side: "right",
      remember: false,
    });

    assert.ok($menu.hasClass("bootsidemenu"), "has bootsidemenu class");
    assert.ok(
      $menu.hasClass("bootsidemenu-right"),
      "has bootsidemenu-right class",
    );
  });

  QUnit.test("theme is applied as a class", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      theme: "dracula",
      remember: false,
    });

    assert.ok($menu.hasClass("dracula"));
  });

  QUnit.test("default theme is applied", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({ remember: false });

    assert.ok($menu.hasClass("default"));
  });

  QUnit.test("width is set as an inline style", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      width: "360px",
      remember: false,
    });

    assert.equal($menu.css("width"), "360px");
  });

  QUnit.test(
    "wraps the original content and adds a toggler",
    function (assert) {
      var $menu = jQuery("#test");
      $menu.html("<p>inner content</p>");
      $menu.BootSideMenu({ remember: false });

      assert.equal($menu.find(".menu-wrapper").length, 1, "one menu wrapper");
      assert.equal(
        $menu.find(".menu-wrapper p").text(),
        "inner content",
        "original content is preserved",
      );
      assert.equal(
        $menu.find('.toggler[data-whois="toggler"]').length,
        1,
        "one toggler",
      );
      assert.equal(
        $menu.find(".toggler .icon").length,
        1,
        "toggler has an icon",
      );
    },
  );

  // Regression test: the content used to be read out as a string and written
  // back, which replaced every node and so silently dropped anything bound to
  // the caller's markup.
  QUnit.test("wrapping keeps the original nodes intact", function (assert) {
    var $menu = jQuery("#test");
    var $button = jQuery("<button/>").text("press me");
    var clicks = 0;

    $button.on("click", function () {
      clicks += 1;
    });
    $button.appendTo($menu);

    $menu.BootSideMenu({ remember: false, closeOnClick: false });

    assert.strictEqual(
      $menu.find("button")[0],
      $button[0],
      "it is the same element, not a copy",
    );

    $menu.find("button").trigger("click");
    assert.equal(clicks, 1, "its event handler survived");
  });

  QUnit.test("toggler arrow points the way the menu closes", function (assert) {
    var $left = jQuery("#test").BootSideMenu({
      side: "left",
      remember: false,
    });

    assert.ok(
      $left.find(".toggler .icon").hasClass("fa-chevron-left"),
      "a left menu closes to the left",
    );
  });

  QUnit.test("custom icons are honoured", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      side: "left",
      remember: false,
      icons: {
        left: "custom-left",
        right: "custom-right",
        down: "custom-down",
      },
    });

    assert.ok($menu.find(".toggler .icon").hasClass("custom-left"));
  });

  QUnit.test("icons are injected into collapse triggers", function (assert) {
    var $menu = jQuery("#test");
    $menu.html(
      '<a class="list-group-item" data-bs-toggle="collapse" href="#c">item</a>',
    );
    $menu.BootSideMenu({ remember: false });

    assert.equal($menu.find("a .icon.fa-chevron-right").length, 1);
  });

  QUnit.test("initializing a second time is a no-op", function (assert) {
    var $menu = jQuery("#test");
    $menu.BootSideMenu({ side: "left", remember: false });
    var instance = $menu.data("BootSideMenu");

    $menu.BootSideMenu({ side: "right", remember: false });

    assert.strictEqual(
      $menu.data("BootSideMenu"),
      instance,
      "the same instance is kept",
    );
    assert.ok(
      !$menu.hasClass("bootsidemenu-right"),
      "the new options are not applied",
    );
  });

  QUnit.test("the instance is exposed via data()", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      side: "right",
      remember: false,
    });
    var instance = $menu.data("BootSideMenu");

    assert.equal(typeof instance.open, "function", "open()");
    assert.equal(typeof instance.close, "function", "close()");
    assert.equal(typeof instance.toggle, "function", "toggle()");
    assert.equal(instance.settings.side, "right", "settings are readable");
  });

  QUnit.test("onStartup is called with the menu", function (assert) {
    var seen = null;

    jQuery("#test").BootSideMenu({
      remember: false,
      onStartup: function ($menu) {
        seen = $menu;
      },
    });

    assert.ok(seen, "onStartup was called");
    assert.equal(seen.length, 1, "it received the menu");
  });

  QUnit.module("BootSideMenu: remembering state", hooks);

  QUnit.test("remember: false stores nothing", function (assert) {
    jQuery("#test")
      .BootSideMenu({ remember: false, duration: 0 })
      .data("BootSideMenu")
      .close();

    assert.equal(document.cookie.indexOf("bsm2-"), -1, document.cookie);
    assert.strictEqual(
      window.localStorage.getItem("bsm2-test"),
      null,
      "nothing in localStorage either",
    );
  });

  QUnit.test("remember: true persists the closed state", function (assert) {
    jQuery("#test")
      .BootSideMenu({ remember: true, duration: 0 })
      .data("BootSideMenu")
      .close();

    assert.equal(
      window.localStorage.getItem("bsm2-test"),
      "closed",
      "stored in localStorage",
    );
    assert.ok(
      document.cookie.indexOf("bsm2-test=closed") !== -1,
      "and in a cookie: " + document.cookie,
    );
  });

  QUnit.test("remember: true persists the opened state", function (assert) {
    jQuery("#test")
      .BootSideMenu({ remember: true, duration: 0 })
      .data("BootSideMenu")
      .open();

    assert.equal(
      window.localStorage.getItem("bsm2-test"),
      "opened",
      "stored in localStorage",
    );
    assert.ok(
      document.cookie.indexOf("bsm2-test=opened") !== -1,
      "and in a cookie: " + document.cookie,
    );
  });

  QUnit.test("a stored closed state is read back on init", function (assert) {
    window.localStorage.setItem("bsm2-test", "closed");

    jQuery("#test").BootSideMenu({ remember: true, duration: 0 });

    assert.ok(
      jQuery("#test").find(".toggler .icon").hasClass("fa-chevron-right"),
      "the menu started closed, as stored",
    );
  });

  // Cookies are still read, so a menu remembered by an older version -- or by
  // a browser where localStorage is unavailable -- keeps its state.
  QUnit.test("a state stored only in a cookie is honoured", function (assert) {
    document.cookie = "bsm2-test=opened; path=/";

    jQuery("#test").BootSideMenu({
      remember: true,
      duration: 0,
      autoClose: true,
    });

    assert.equal(
      window.localStorage.getItem("bsm2-test"),
      null,
      "nothing in localStorage to read",
    );
    assert.ok(
      jQuery("#test").find(".toggler .icon").hasClass("fa-chevron-left"),
      "the menu started open, as the cookie said, despite autoClose",
    );
  });

  QUnit.test("localStorage wins over a stale cookie", function (assert) {
    document.cookie = "bsm2-test=closed; path=/";
    window.localStorage.setItem("bsm2-test", "opened");

    jQuery("#test").BootSideMenu({
      remember: true,
      duration: 0,
      autoClose: true,
    });

    assert.ok(
      jQuery("#test").find(".toggler .icon").hasClass("fa-chevron-left"),
      "the menu started open, as localStorage said",
    );
  });

  QUnit.module("BootSideMenu: methods and events", hooks);

  // Regression test: these three are documented in the README, but used to
  // throw ReferenceError because they called the plugin's private functions
  // from a scope that could not see them.
  QUnit.test("the documented static methods work", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      remember: false,
      duration: 0,
    });

    $menu.BootSideMenu.open();
    $menu.BootSideMenu.close();
    $menu.BootSideMenu.toggle();

    assert.ok(true, "no exception was thrown");
  });

  QUnit.test("the static methods are chainable", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      remember: false,
      duration: 0,
    });

    assert.strictEqual(
      $menu.BootSideMenu.open()[0],
      $menu[0],
      "open() returns the matched elements",
    );
  });

  // Regression test: open() and close() used to call the internal helpers
  // without the flag that enables the callbacks, so none of these fired.
  QUnit.test("open() fires onBeforeOpen and onOpen", function (assert) {
    var fired = [];

    jQuery("#test")
      .BootSideMenu({
        remember: false,
        duration: 0,
        onBeforeOpen: function () {
          fired.push("onBeforeOpen");
        },
        onOpen: function () {
          fired.push("onOpen");
        },
      })
      .data("BootSideMenu")
      .open();

    assert.deepEqual(fired, ["onBeforeOpen", "onOpen"]);
  });

  QUnit.test("close() fires onBeforeClose and onClose", function (assert) {
    var fired = [];

    jQuery("#test")
      .BootSideMenu({
        remember: false,
        duration: 0,
        onBeforeClose: function () {
          fired.push("onBeforeClose");
        },
        onClose: function () {
          fired.push("onClose");
        },
      })
      .data("BootSideMenu")
      .close();

    assert.deepEqual(fired, ["onBeforeClose", "onClose"]);
  });

  // Regression test: a plain click on the toggler used to close the menu
  // twice, once from the toggler and once from the document handler, which
  // only stayed quiet if a mouseenter had happened first.
  QUnit.test(
    "clicking the toggler fires its callbacks once",
    function (assert) {
      var fired = [];
      var $menu = jQuery("#test").BootSideMenu({
        remember: false,
        duration: 0,
        onTogglerClick: function () {
          fired.push("onTogglerClick");
        },
        onBeforeClose: function () {
          fired.push("onBeforeClose");
        },
        onClose: function () {
          fired.push("onClose");
        },
      });

      $menu.find('.toggler[data-whois="toggler"]').trigger("click");

      assert.deepEqual(fired, ["onTogglerClick", "onBeforeClose", "onClose"]);
    },
  );

  QUnit.test("callbacks run asynchronously when animated", function (assert) {
    var done = assert.async();
    jQuery.fx.off = false;

    jQuery("#test")
      .BootSideMenu({
        remember: false,
        duration: 1,
        onOpen: function ($menu) {
          assert.equal($menu.length, 1, "onOpen received the menu");
          done();
        },
      })
      .data("BootSideMenu")
      .open();
  });

  QUnit.test("a non-function callback is ignored", function (assert) {
    jQuery("#test")
      .BootSideMenu({
        remember: false,
        duration: 0,
        onOpen: "not a function",
      })
      .data("BootSideMenu")
      .open();

    assert.ok(true, "no exception was thrown");
  });

  // Regression test: the check used to compare against "[object Function]",
  // which an async function does not match.
  QUnit.test("an async callback is called", function (assert) {
    var done = assert.async();

    jQuery("#test")
      .BootSideMenu({
        remember: false,
        duration: 0,
        onOpen: async function () {
          assert.ok(true, "the async callback ran");
          done();
        },
      })
      .data("BootSideMenu")
      .open();
  });

  QUnit.module("BootSideMenu: closeOnClick", hooks);

  // closeOnClick: false is the setting every known consumer uses.
  QUnit.test("closeOnClick: false ignores outside clicks", function (assert) {
    var fired = [];

    jQuery("#test").BootSideMenu({
      remember: false,
      duration: 0,
      closeOnClick: false,
      onClose: function () {
        fired.push("onClose");
      },
    });

    jQuery(document).trigger("click");

    assert.deepEqual(fired, [], "the menu was not closed");
  });

  QUnit.test(
    "closeOnClick: true closes on an outside click",
    function (assert) {
      var fired = [];

      jQuery("#test").BootSideMenu({
        remember: false,
        duration: 0,
        closeOnClick: true,
        onClose: function () {
          fired.push("onClose");
        },
      });

      jQuery(document).trigger("click");

      assert.deepEqual(fired, ["onClose"], "the menu was closed");
    },
  );

  // Regression test: nothing checked whether the menu was already closed, so
  // every further click on the page re-ran the close animation and fired the
  // callbacks again.
  QUnit.test("an already closed menu stays quiet", function (assert) {
    var fired = [];

    jQuery("#test").BootSideMenu({
      remember: false,
      duration: 0,
      closeOnClick: true,
      onClose: function () {
        fired.push("onClose");
      },
    });

    jQuery(document).trigger("click");
    jQuery(document).trigger("click");
    jQuery(document).trigger("click");

    assert.deepEqual(fired, ["onClose"], "closed once, not three times");
  });

  QUnit.test("a click inside the menu does not close it", function (assert) {
    var $menu = jQuery("#test");
    var fired = [];

    $menu.html("<p>inner content</p>");
    $menu.BootSideMenu({
      remember: false,
      duration: 0,
      closeOnClick: true,
      onClose: function () {
        fired.push("onClose");
      },
    });

    $menu.find("p").trigger("click");

    assert.deepEqual(fired, [], "the menu is still open");
  });

  QUnit.module("BootSideMenu: resizing", hooks);

  // Regression test: the debounce used to compare the milliseconds within the
  // current second, so a resize beginning late enough in one was dropped.
  QUnit.test("a resize late in a second is handled", function (assert) {
    var done = assert.async();

    var instance = jQuery("#test")
      .BootSideMenu({ remember: false, duration: 0, pushBody: true })
      .data("BootSideMenu");

    assert.equal(instance.settings.pushBody, true, "pushing to begin with");

    setWindowWidth(400);

    atLateMillisecond(function () {
      window.dispatchEvent(new Event("resize"));

      window.setTimeout(function () {
        assert.equal(
          instance.settings.pushBody,
          false,
          "the narrow window was noticed",
        );
        done();
      }, 400);
    });
  });

  // Regression test: the small-body rules turn pushBody off, but nothing ever
  // took the margin they had already set back off the body.
  QUnit.test("shrinking the window stops pushing the body", function (assert) {
    var done = assert.async();

    var before = jQuery("body").css("margin-left");

    jQuery("#test").BootSideMenu({
      side: "left",
      remember: false,
      duration: 0,
      pushBody: true,
      width: "200px",
    });

    assert.notEqual(
      jQuery("body").css("margin-left"),
      before,
      "the body starts out pushed",
    );

    setWindowWidth(400);

    atLateMillisecond(function () {
      window.dispatchEvent(new Event("resize"));

      window.setTimeout(function () {
        assert.equal(
          parseFloat(jQuery("body").css("margin-left")) || 0,
          parseFloat(before) || 0,
          "the margin is back where it started",
        );
        done();
      }, 400);
    });
  });

  QUnit.module("BootSideMenu: layout", hooks);

  testLayout("width is measurable", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      width: "360px",
      remember: false,
    });

    assert.equal($menu.width(), 360);
  });

  testLayout("pushBody offsets the body to the left", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      side: "left",
      remember: false,
      pushBody: true,
      width: "200px",
    });

    assert.equal(
      jQuery("body").css("margin-left"),
      $menu.width() + 20 + "px",
      "the body is pushed by the menu width plus 20",
    );
  });

  testLayout("pushBody offsets the body to the right", function (assert) {
    var $menu = jQuery("#test").BootSideMenu({
      side: "right",
      remember: false,
      pushBody: true,
      width: "200px",
    });

    assert.equal(
      jQuery("body").css("margin-right"),
      $menu.width() + 20 + "px",
      "the body is pushed by the menu width plus 20",
    );
  });

  testLayout("pushBody: false leaves the body alone", function (assert) {
    // not necessarily zero: browsers give the body a default margin
    var before = jQuery("body").css("margin-left");

    jQuery("#test").BootSideMenu({
      side: "left",
      remember: false,
      pushBody: false,
      width: "200px",
    });

    assert.equal(jQuery("body").css("margin-left"), before);
  });
})();
