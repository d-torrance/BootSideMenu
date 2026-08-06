/**
 * The control panel behind examples/index.html.
 *
 * Most of the plugin's options are only read when the menu is created, so the
 * panel changes them the only way it can: destroy the menu and build it again.
 * That makes this page a check on destroy() as much as on anything else -- if
 * teardown ever leaves a handler, a class or a body margin behind, it shows up
 * on the next rebuild.
 */

(function () {
  var CONTROLS = [
    "side",
    "theme",
    "width",
    "duration",
    "togglerLabel",
    "pushBody",
    "closeOnClick",
    "closeOnEscape",
    "autoClose",
    "remember",
  ];

  var DEFAULTS = {
    side: "left",
    theme: "default",
    width: "15%",
    duration: "500",
    togglerLabel: "Toggle menu",
    pushBody: "true",
    closeOnClick: "false",
    closeOnEscape: "true",
    autoClose: "false",
    remember: "true",
  };

  function isCheckbox(id) {
    return jQuery("#" + id).attr("type") === "checkbox";
  }

  function controlValue(id) {
    var $control = jQuery("#" + id);
    return isCheckbox(id) ? String($control.prop("checked")) : $control.val();
  }

  function setControlValue(id, value) {
    var $control = jQuery("#" + id);

    if (isCheckbox(id)) {
      $control.prop("checked", value === "true");
    } else {
      $control.val(value);
    }
  }

  // The configuration lives in the URL so that reloading -- the only way to
  // see whether "remember" worked -- comes back to the same setup.  It goes in
  // the fragment rather than the query string because a file:// page has an
  // opaque origin, and replaceState refuses to touch the URL of one.
  function readConfig() {
    var query =
      window.location.hash.replace(/^#/, "") ||
      window.location.search.replace(/^\?/, "");

    query.split("&").forEach(function (pair) {
      if (!pair) {
        return;
      }

      var parts = pair.split("=");
      var name = decodeURIComponent(parts[0]);

      if (CONTROLS.indexOf(name) !== -1) {
        DEFAULTS[name] = decodeURIComponent(parts.slice(1).join("="));
      }
    });

    CONTROLS.forEach(function (id) {
      setControlValue(id, DEFAULTS[id]);
    });
  }

  function writeConfig() {
    var query = CONTROLS.map(function (id) {
      return id + "=" + encodeURIComponent(controlValue(id));
    }).join("&");

    try {
      window.history.replaceState(null, "", "#" + query);
    } catch {
      window.location.hash = query;
    }
  }

  function timestamp() {
    var now = new Date();
    return (
      now.toTimeString().slice(0, 8) +
      "." +
      String(now.getMilliseconds()).padStart(3, "0")
    );
  }

  function log(message) {
    var $log = jQuery("#log");

    jQuery("<div/>")
      .text(timestamp() + "  " + message)
      .appendTo($log);

    // keep the log from growing without bound over a long session
    var $entries = $log.children();
    if ($entries.length > 200) {
      $entries.slice(0, $entries.length - 200).remove();
    }

    $log.scrollTop($log[0].scrollHeight);
  }

  function logger(name) {
    return function () {
      log(name);
      updateReadouts();
    };
  }

  function instance() {
    return jQuery("#menu").data("BootSideMenu");
  }

  function optionsFromControls() {
    return {
      side: controlValue("side"),
      theme: controlValue("theme"),
      width: controlValue("width"),
      duration: parseInt(controlValue("duration"), 10) || 0,
      togglerLabel: controlValue("togglerLabel"),
      pushBody: controlValue("pushBody") === "true",
      closeOnClick: controlValue("closeOnClick") === "true",
      closeOnEscape: controlValue("closeOnEscape") === "true",
      autoClose: controlValue("autoClose") === "true",
      remember: controlValue("remember") === "true",
      onStartup: logger("onStartup"),
      onTogglerClick: logger("onTogglerClick"),
      onBeforeOpen: logger("onBeforeOpen"),
      onOpen: logger("onOpen"),
      onBeforeClose: logger("onBeforeClose"),
      onClose: logger("onClose"),
    };
  }

  // Every theme but the default one is a separate stylesheet.
  function applyThemeStylesheet(theme) {
    jQuery("#theme-stylesheet").remove();

    if (theme === "default") {
      return;
    }

    jQuery("<link/>", {
      id: "theme-stylesheet",
      rel: "stylesheet",
      href: "../dist/theme/" + theme + ".css",
    }).appendTo("head");
  }

  function rebuild() {
    var $element = jQuery("#menu");

    if (instance()) {
      instance().destroy();
    }

    $element.html(jQuery("#menu-template").html());

    // bound before the plugin runs: if initialization ever goes back to
    // re-parsing the markup it is given, this handler is thrown away with the
    // node it was attached to, and pressing the button logs nothing
    $element.find("#demo-button").on("click", function () {
      log("a handler attached before init still fires");
    });

    applyThemeStylesheet(controlValue("theme"));
    $element.BootSideMenu(optionsFromControls());

    updateReadouts();
  }

  function updateReadouts() {
    var plugin = instance();

    jQuery("#readout-width").text(jQuery(window).width() + "px");

    jQuery("#readout-state").text(
      plugin ? (plugin.isOpen() ? "open" : "closed") : "destroyed",
    );

    jQuery("#readout-effective").text(
      plugin
        ? "pushBody " +
            plugin.settings.pushBody +
            ", closeOnClick " +
            plugin.settings.closeOnClick
        : "—",
    );
  }

  // Report which of the two stores actually works here, since that is the
  // whole reason the plugin writes both: a page opened from the filesystem
  // gets no cookies in Chrome, and localStorage can be unavailable elsewhere.
  function describeStorage() {
    var haveLocalStorage = false;

    try {
      window.localStorage.setItem("bsm2-probe", "1");
      haveLocalStorage = window.localStorage.getItem("bsm2-probe") === "1";
      window.localStorage.removeItem("bsm2-probe");
    } catch {
      // leave it false
    }

    document.cookie = "bsm2-probe=1; path=/; SameSite=Lax";
    var haveCookies = document.cookie.indexOf("bsm2-probe=1") !== -1;
    document.cookie =
      "bsm2-probe=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

    return (
      "localStorage " +
      (haveLocalStorage ? "yes" : "no") +
      ", cookies " +
      (haveCookies ? "yes" : "no")
    );
  }

  jQuery(function () {
    readConfig();

    jQuery("#readout-storage").text(describeStorage());
    jQuery("#readout-motion").text(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "reduce"
        : "no-preference",
    );

    CONTROLS.forEach(function (id) {
      jQuery("#" + id).on("change", function () {
        writeConfig();
        log("rebuilding with " + id + " = " + controlValue(id));
        rebuild();
      });
    });

    jQuery("#action-open").on("click", function () {
      if (instance()) {
        instance().open();
      }
    });

    jQuery("#action-close").on("click", function () {
      if (instance()) {
        instance().close();
      }
    });

    jQuery("#action-toggle").on("click", function () {
      if (instance()) {
        instance().toggle();
      }
    });

    jQuery("#action-isopen").on("click", function () {
      log(instance() ? "isOpen() is " + instance().isOpen() : "no menu");
    });

    jQuery("#action-destroy").on("click", function () {
      if (instance()) {
        instance().destroy();
        log("destroy()");
        updateReadouts();
      }
    });

    jQuery("#action-rebuild").on("click", function () {
      log("rebuild");
      rebuild();
    });

    jQuery("#action-clear-log").on("click", function () {
      jQuery("#log").empty();
    });

    var readoutTimer;

    jQuery(window).on("resize", function () {
      updateReadouts();

      // the plugin debounces its own resize handling, so read the effective
      // settings again once it has had a chance to catch up -- otherwise the
      // readout is always one resize behind
      window.clearTimeout(readoutTimer);
      readoutTimer = window.setTimeout(updateReadouts, 400);
    });

    writeConfig();
    rebuild();
  });
})();
