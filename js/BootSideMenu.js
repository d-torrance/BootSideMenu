/**
 * BootSideMenu
 * Authors: Andrea Lombardo, William Crandell
 * http://www.lombardoandrea.com
 * https://github.com/AndreaLombardo/BootSideMenu
 * */

// Universal Module Definition (https://github.com/umdjs/umd)
(function (factory) {
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(["jquery"], factory);
  } else if (typeof module === "object" && module.exports) {
    // Node/CommonJS
    module.exports = function (root, jQuery) {
      if (jQuery === undefined) {
        // require('jQuery') returns a factory that requires window to
        // build a jQuery instance, we normalize how we use modules
        // that require this pattern but the window provided is a noop
        // if it's defined (how jquery works)
        if (typeof window !== "undefined") {
          jQuery = require("jquery");
        } else {
          jQuery = require("jquery")(root);
        }
      }
      factory(jQuery);
      return jQuery;
    };
  } else {
    // Browser globals
    factory(jQuery);
  }
})(function ($) {
  // Each instance namespaces the handlers it binds on the document and on the
  // menu, so that destroy() can unbind exactly its own and leave any other
  // menu on the page alone.
  var instanceCount = 0;

  // here we go!
  $.BootSideMenu = function (element, userOptions) {
    var defaults = {
      side: "left",
      duration: 500,
      remember: true,
      autoClose: false,
      pushBody: true,
      closeOnClick: true,
      closeOnEscape: true,
      icons: {
        left: "fa fa-chevron-left",
        right: "fa fa-chevron-right",
        down: "fa fa-chevron-down",
      },
      theme: "default",
      width: "15%",
      togglerLabel: "Toggle menu",
      onTogglerClick: function () {
        //code to be executed when the toggler arrow was clicked
      },
      onBeforeOpen: function () {
        //code to be executed before menu open
      },
      onBeforeClose: function () {
        //code to be executed before menu close
      },
      onOpen: function () {
        //code to be executed after menu open
      },
      onClose: function () {
        //code to be executed after menu close
      },
      onStartup: function () {
        //code to be executed when the plugin is called
      },
    };

    // to avoid confusions, use "plugin" to reference the
    // current instance of the object
    var plugin = this;

    // this will hold the merged default, and user-provided options
    // plugin's properties will be available through this object like:
    // plugin.settings.propertyName from inside the plugin or
    // element.data('pluginName').settings.propertyName from outside the plugin,
    // where "element" is the element the plugin is attached to;
    plugin.settings = {};

    var $element = $(element); // reference to the jQuery version of DOM element

    // the "constructor" method that gets called when the object is created

    var $menu;
    var prevStatus;
    var bodyProperties = {};

    // whether we are the ones holding the body margin open; without this we
    // could not tell "restore the margin we set" from "never touched it"
    var bodyPushed = false;

    // bodyPushed is cleared as soon as a closing animation starts, so it
    // cannot answer "did we ever write a body margin?" -- which is what
    // destroy() needs in order to put it back
    var bodyTouched = false;

    var $DOMBody = $("body", document);

    var namespace = "bootsidemenu" + ++instanceCount;
    var resizeTimer;
    var wait = 250;

    plugin.init = function () {
      // the plugin's final properties are the merged default and
      // user-provided options (if any)
      plugin.settings = $.extend({}, defaults, userOptions);
      if (plugin.settings.side !== "right") {
        plugin.settings.side = "left";
      }
      bodyProperties["originalMarginLeft"] = $DOMBody.css("margin-left");
      bodyProperties["originalMarginRight"] = $DOMBody.css("margin-right");

      // wrap what is already there rather than re-parsing it: reinserting the
      // markup as a string would replace every child, throwing away any event
      // handler, jQuery data or live state the caller had attached to it
      $element.wrapInner('<div class="menu-wrapper"></div>');
      $element.append(
        '<div class="toggler" data-whois="toggler" role="button" tabindex="0">' +
          '<span class="icon" aria-hidden="true">&nbsp;</span>' +
          "</div>",
      );

      $menu = $element;

      $menu.addClass("container");
      $menu.addClass("bootsidemenu");
      $menu.addClass(plugin.settings.theme);
      $menu.css("width", plugin.settings.width);
      $menu.addClass("bootsidemenu-" + plugin.settings.side);

      $menu.id = $menu.attr("id");
      $menu.storageKey = "bsm2-" + $menu.id;
      $menu.toggler = $menu.find('[data-whois="toggler"]');
      $menu.wrapper = $menu.find(".menu-wrapper");
      $menu.originalPushBody = plugin.settings.pushBody;
      $menu.originalCloseOnClick = plugin.settings.closeOnClick;

      $menu.toggler.attr("aria-label", plugin.settings.togglerLabel);
      if ($menu.id) {
        $menu.wrapper.attr("id", $menu.id + "-menu-wrapper");
        $menu.toggler.attr("aria-controls", $menu.id + "-menu-wrapper");
      } else if (plugin.settings.remember) {
        // the stored state is keyed on the id; without one every anonymous
        // menu on the page would share the same entry
        plugin.settings.remember = false;
        console.warn(
          "BootSideMenu: the menu needs an id for 'remember' to work",
        );
      }

      if (plugin.settings.remember) {
        prevStatus = readStatus($menu.storageKey);
      } else {
        prevStatus = null;
      }

      forSmallBody();

      switch (prevStatus) {
        case "opened":
          startOpened();
          break;
        case "closed":
          startClosed();
          break;
        default:
          startDefault();
          break;
      }

      fire("onStartup", true);

      $('[data-bs-toggle="collapse"]', $menu).each(function () {
        var $icon = $("<span/>");
        $icon.addClass("icon");
        // tag the ones we injected, so destroy() removes only those
        $icon.addClass("bootsidemenu-icon");
        $icon.addClass(plugin.settings.icons.right);

        $(this).prepend($icon);
      });

      $menu.on("click." + namespace, '.toggler[data-whois="toggler"]', toggle);
      $menu.on(
        "keydown." + namespace,
        '.toggler[data-whois="toggler"]',
        onTogglerKeydown,
      );
      $menu.on("click." + namespace, ".list-group-item", onListItemClick);
      $menu.on("click." + namespace, "a.list-group-item", onItemClick);

      $(document).on("click." + namespace, onDocumentClick);
      $(document).on("keydown." + namespace, onDocumentKeydown);

      window.addEventListener("resize", onWindowResize, false);
    };

    /*
			plugin.foo_public_method = function() {}
      var foo_private_method = function() {}
      */

    // pass true so that the documented onBeforeOpen/onOpen and
    // onBeforeClose/onClose callbacks fire, as they already do when the
    // menu is opened or closed by clicking
    plugin.open = function () {
      openMenu(true);
      return $menu;
    };

    plugin.close = function () {
      closeMenu(true);
      return $menu;
    };

    plugin.toggle = function () {
      toggle();
      return $menu;
    };

    plugin.isOpen = function () {
      return $menu.status === "opened";
    };

    // undo everything init() did, so that the element can be handed back to
    // the caller in the state it was in -- or initialized again with
    // different options, which the guard in $.fn.BootSideMenu otherwise makes
    // impossible.  The stored state is deliberately left alone: "remember"
    // should still remember.
    plugin.destroy = function () {
      // Stop anything still in flight first.  A "done" callback firing after
      // the teardown would reach for a toggler that is no longer there, and a
      // half-finished body animation would put the margin back on after we
      // have taken it off.  stop() without jumping to the end rejects those
      // callbacks rather than running them.
      $menu.stop(true, false);
      $DOMBody.stop(true, false);

      $(document).off("." + namespace);
      window.removeEventListener("resize", onWindowResize, false);
      clearTimeout(resizeTimer);
      $menu.off("." + namespace);

      if (bodyTouched) {
        $DOMBody.css(bodyMarginProperty(), originalBodyMargin());
        bodyPushed = false;
      }

      $menu.find(".bootsidemenu-icon").remove();
      $menu.toggler.remove();

      if ($menu.wrapper.contents().length) {
        $menu.wrapper.contents().unwrap();
      } else {
        $menu.wrapper.remove();
      }

      $menu
        .removeClass("container bootsidemenu")
        .removeClass("bootsidemenu-" + plugin.settings.side)
        .removeClass(plugin.settings.theme)
        .css({ width: "", left: "", right: "", display: "" });

      delete $menu.status;
      delete $menu.toggler;
      delete $menu.wrapper;

      $element.removeData("BootSideMenu");

      return $menu;
    };

    // fire up the plugin!
    // call the "constructor" method
    plugin.init();

    function fire(name, execFunctions) {
      if (execFunctions && isFunction(plugin.settings[name])) {
        plugin.settings[name]($menu);
      }
    }

    function onItemClick() {
      if (
        plugin.settings.closeOnClick &&
        $(this).attr("data-bs-toggle") !== "collapse"
      ) {
        closeMenu(true);
      }
    }

    function onListItemClick() {
      $menu.find(".list-group-item").each(function () {
        $(this).removeClass("active");
      });
      $(this).addClass("active");
      $(".icon", $(this))
        .toggleClass(plugin.settings.icons.right)
        .toggleClass(plugin.settings.icons.down);
    }

    // Close when the click landed outside the menu.  Testing the target is
    // what makes this reliable: the flag this used to consult was set by
    // mouseenter, which never fires before a tap on a touch screen, and
    // nothing checked whether the menu was open, so every stray click on the
    // page re-ran the close animation and its callbacks.
    function onDocumentClick(event) {
      if (
        plugin.settings.closeOnClick &&
        $menu.status === "opened" &&
        event.target !== $menu[0] &&
        !$.contains($menu[0], event.target)
      ) {
        closeMenu(true);
      }
    }

    function onDocumentKeydown(event) {
      if (
        plugin.settings.closeOnEscape &&
        $menu.status === "opened" &&
        (event.key === "Escape" || event.key === "Esc")
      ) {
        closeMenu(true);
      }
    }

    // the toggler is a div, so it gets none of a button's keyboard behaviour
    // for free
    function onTogglerKeydown(event) {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "Spacebar"
      ) {
        event.preventDefault();
        toggle();
      }
    }

    function onWindowResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, wait);
    }

    function toggle() {
      fire("onTogglerClick", true);

      if ($menu.status === "opened") {
        closeMenu(true);
      } else {
        openMenu(true);
      }
    }

    // keep the status and what we tell assistive technology in one place, so
    // the two cannot drift apart
    function setStatus(status) {
      $menu.status = status;
      $menu.toggler.attr(
        "aria-expanded",
        status === "opened" ? "true" : "false",
      );
    }

    function switchArrow(side) {
      var $icon = $menu.toggler.find(".icon");

      $icon.removeClass();

      if (side === "left") {
        $icon.addClass(plugin.settings.icons.right);
      } else if (side === "right") {
        $icon.addClass(plugin.settings.icons.left);
      }

      $icon.addClass("icon");
    }

    function oppositeSide() {
      return plugin.settings.side === "left" ? "right" : "left";
    }

    function bodyMarginProperty() {
      return plugin.settings.side === "left" ? "marginLeft" : "marginRight";
    }

    function originalBodyMargin() {
      return plugin.settings.side === "left"
        ? bodyProperties.originalMarginLeft
        : bodyProperties.originalMarginRight;
    }

    // Set the body margin without animating, for startup and for resizes.
    // The "else" is the half that used to be missing: shrinking the window
    // past the small-body threshold turns pushBody off, and the body was
    // then left holding a margin nothing would ever clear.
    function applyBodyMargin() {
      if (plugin.settings.pushBody) {
        $DOMBody.css(bodyMarginProperty(), $menu.width() + 20);
        bodyPushed = true;
        bodyTouched = true;
      } else if (bodyPushed) {
        $DOMBody.css(bodyMarginProperty(), originalBodyMargin());
        bodyPushed = false;
      }
    }

    function animationDuration() {
      return window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : plugin.settings.duration;
    }

    function startDefault() {
      if (plugin.settings.autoClose) {
        startClosed();
      } else {
        startOpened();
      }
    }

    function startClosed() {
      var offset = {};
      offset[plugin.settings.side] = -($menu.width() + 2);

      setStatus("closed");
      $menu.hide().animate(offset, 1, function () {
        $menu.show();
        switchArrow(plugin.settings.side);
      });
    }

    function startOpened() {
      switchArrow(oppositeSide());
      setStatus("opened");
      applyBodyMargin();
    }

    function closeMenu(execFunctions) {
      var offset = {};
      var bodyMargin = {};

      fire("onBeforeClose", execFunctions);

      if (plugin.settings.pushBody) {
        bodyMargin[bodyMarginProperty()] = originalBodyMargin();
        $DOMBody.animate(bodyMargin, { duration: animationDuration() });
        bodyPushed = false;
        bodyTouched = true;
      }

      offset[plugin.settings.side] = -($menu.width() + 2);
      $menu.animate(offset, {
        duration: animationDuration(),
        done: function () {
          switchArrow(plugin.settings.side);
          setStatus("closed");
          fire("onClose", execFunctions);
        },
      });

      if (plugin.settings.remember) {
        storeStatus($menu.storageKey, "closed");
      }
    }

    function openMenu(execFunctions) {
      var offset = {};
      var bodyMargin = {};

      fire("onBeforeOpen", execFunctions);

      if (plugin.settings.pushBody) {
        bodyMargin[bodyMarginProperty()] = $menu.width() + 20;
        $DOMBody.animate(bodyMargin, { duration: animationDuration() });
        bodyPushed = true;
        bodyTouched = true;
      }

      offset[plugin.settings.side] = 0;
      $menu.animate(offset, {
        duration: animationDuration(),
        done: function () {
          switchArrow(oppositeSide());
          setStatus("opened");
          fire("onOpen", execFunctions);
        },
      });

      if (plugin.settings.remember) {
        storeStatus($menu.storageKey, "opened");
      }
    }

    function forSmallBody() {
      var windowWidth = $(window).width();

      if (windowWidth <= 480) {
        plugin.settings.pushBody = false;
        plugin.settings.closeOnClick = true;
      } else {
        plugin.settings.pushBody = $menu.originalPushBody;
        plugin.settings.closeOnClick = $menu.originalCloseOnClick;
      }
    }

    // Written to both stores because neither covers everything: a page opened
    // from the filesystem gets no cookies at all in Chrome, while a browser
    // with storage turned off (or Safari in private mode) throws on so much as
    // touching localStorage.  Reading falls back to the cookie so that state
    // saved by an older version is still honoured.
    function storeStatus(name, value) {
      try {
        window.localStorage.setItem(name, value);
      } catch {
        // no storage available; the cookie below may still work
      }

      var d = new Date();
      d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
      var expires = "expires=" + d.toUTCString();
      document.cookie =
        name + "=" + value + "; " + expires + "; path=/; SameSite=Lax";
    }

    function readStatus(name) {
      try {
        var stored = window.localStorage.getItem(name);
        if (stored) {
          return stored;
        }
      } catch {
        // fall through to the cookie
      }

      return readCookie(name);
    }

    function readCookie(nome) {
      var name = nome + "=";
      var ca = document.cookie.split(";");
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1);
        if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
      }
      return null;
    }

    function isFunction(functionToCheck) {
      // not a toString() comparison against "[object Function]": that reports
      // "[object AsyncFunction]" for an async callback, which would then be
      // silently skipped
      return typeof functionToCheck === "function";
    }

    function onResize() {
      forSmallBody();
      if ($menu.status === "closed") {
        startClosed();
      }
      if ($menu.status === "opened") {
        startOpened();
      }
    }
  };

  $.fn.BootSideMenu = function (options) {
    var $elements = this;

    // the static methods below are the ones documented in the README as
    // $(selector).BootSideMenu.open() and friends; they delegate to the
    // plugin instance stored on each element by the loop at the end
    function eachInstance(method) {
      return $elements.each(function () {
        var instance = $(this).data("BootSideMenu");
        if (instance) {
          instance[method]();
        }
      });
    }

    $.fn.BootSideMenu.open = function () {
      return eachInstance("open");
    };

    $.fn.BootSideMenu.close = function () {
      return eachInstance("close");
    };

    $.fn.BootSideMenu.toggle = function () {
      return eachInstance("toggle");
    };

    $.fn.BootSideMenu.destroy = function () {
      return eachInstance("destroy");
    };

    // iterate through the DOM elements we are attaching the plugin to
    return this.each(function () {
      // if plugin has not already been attached to the element
      if (undefined == $(this).data("BootSideMenu")) {
        // create a new instance of the plugin
        // pass the DOM element and the user-provided options as arguments
        var plugin = new $.BootSideMenu(this, options);

        // in the jQuery version of the element
        // store a reference to the plugin object
        // you can later access the plugin and its methods and properties like
        // element.data('pluginName').publicMethod(arg1, arg2, ... argn) or
        // element.data('pluginName').settings.propertyName
        $(this).data("BootSideMenu", plugin);
      }
    });
  };
});
