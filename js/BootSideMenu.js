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
  // here we go!
  $.BootSideMenu = function (element, userOptions) {
    var defaults = {
      side: "left",
      duration: 500,
      remember: true,
      autoClose: false,
      pushBody: true,
      closeOnClick: true,
      icons: {
        left: "fa fa-chevron-left",
        right: "fa fa-chevron-right",
        down: "fa fa-chevron-down",
      },
      theme: "default",
      width: "15%",
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

    var $DOMBody = $("body", document);

    var resizeTimer;
    var wait = 250;
    //var options = $.extend({}, defaults, userOptions);

    plugin.init = function () {
      // the plugin's final properties are the merged default and
      // user-provided options (if any)
      plugin.settings = $.extend({}, defaults, userOptions);
      bodyProperties["originalMarginLeft"] = $DOMBody.css("margin-left");
      bodyProperties["originalMarginRight"] = $DOMBody.css("margin-right");
      bodyProperties["width"] = $DOMBody.width();

      // wrap what is already there rather than re-parsing it: reinserting the
      // markup as a string would replace every child, throwing away any event
      // handler, jQuery data or live state the caller had attached to it
      $element.wrapInner('<div class="menu-wrapper"></div>');
      $element.append(
        '<div class="toggler" data-whois="toggler">' +
          '<span class="icon">&nbsp;</span>' +
          "</div>",
      );

      $menu = $element;

      $menu.addClass("container");
      $menu.addClass("bootsidemenu");
      $menu.addClass(plugin.settings.theme);
      $menu.css("width", plugin.settings.width);

      if (plugin.settings.side === "left") {
        $menu.addClass("bootsidemenu-left");
      } else if (plugin.settings.side === "right") {
        $menu.addClass("bootsidemenu-right");
      }

      $menu.id = $menu.attr("id");
      $menu.storageKey = "bsm2-" + $menu.id;
      $menu.toggler = $menu.find('[data-whois="toggler"]');
      $menu.originalPushBody = plugin.settings.pushBody;
      $menu.originalCloseOnClick = plugin.settings.closeOnClick;

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

      if (
        plugin.settings.onStartup !== undefined &&
        isFunction(plugin.settings.onStartup)
      ) {
        plugin.settings.onStartup($menu);
      }

      $('[data-bs-toggle="collapse"]', $menu).each(function () {
        var $icon = $("<span/>");
        $icon.addClass("icon");
        $icon.addClass(plugin.settings.icons.right);

        $(this).prepend($icon);
      });

      $menu.off("click", '.toggler[data-whois="toggler"]', toggle);
      $menu.on("click", '.toggler[data-whois="toggler"]', toggle);

      $menu.off("click", ".list-group-item");
      $menu.on("click", ".list-group-item", function () {
        $menu.find(".list-group-item").each(function () {
          $(this).removeClass("active");
        });
        $(this).addClass("active");
        $(".icon", $(this))
          .toggleClass(plugin.settings.icons.right)
          .toggleClass(plugin.settings.icons.down);
      });

      $menu.off("click", "a.list-group-item", onItemClick);
      $menu.on("click", "a.list-group-item", onItemClick);

      $(document).on("click", onDocumentClick);

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

    // fire up the plugin!
    // call the "constructor" method
    plugin.init();

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

    function onWindowResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, wait);
    }

    function onItemClick() {
      if (
        plugin.settings.closeOnClick &&
        $(this).attr("data-bs-toggle") !== "collapse"
      ) {
        closeMenu(true);
      }
    }

    function toggle() {
      if (
        plugin.settings.onTogglerClick !== undefined &&
        isFunction(plugin.settings.onTogglerClick)
      ) {
        plugin.settings.onTogglerClick($menu);
      }

      if ($menu.status === "opened") {
        closeMenu(true);
      } else {
        openMenu(true);
      }
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

    function bodyMarginProperty() {
      return plugin.settings.side === "right" ? "marginRight" : "marginLeft";
    }

    function originalBodyMargin() {
      return plugin.settings.side === "right"
        ? bodyProperties.originalMarginRight
        : bodyProperties.originalMarginLeft;
    }

    // Set the body margin without animating, for startup and for resizes.
    // The "else" is the half that used to be missing: shrinking the window
    // past the small-body threshold turns pushBody off, and the body was then
    // left holding a margin that nothing would ever clear.
    function applyBodyMargin() {
      if (plugin.settings.pushBody) {
        $DOMBody.css(bodyMarginProperty(), $menu.width() + 20);
        bodyPushed = true;
      } else if (bodyPushed) {
        $DOMBody.css(bodyMarginProperty(), originalBodyMargin());
        bodyPushed = false;
      }
    }

    // these two were spelled out again here, branch for branch
    function startDefault() {
      if (plugin.settings.autoClose) {
        startClosed();
      } else {
        startOpened();
      }
    }

    function startClosed() {
      if (plugin.settings.side === "left") {
        $menu.status = "closed";
        $menu.hide().animate(
          {
            left: -($menu.width() + 2),
          },
          1,
          function () {
            $menu.show();
            switchArrow("left");
          },
        );
      } else if (plugin.settings.side === "right") {
        $menu.status = "closed";
        $menu.hide().animate(
          {
            right: -($menu.width() + 2),
          },
          1,
          function () {
            $menu.show();
            switchArrow("right");
          },
        );
      }
    }

    function startOpened() {
      if (plugin.settings.side === "right") {
        switchArrow("left");
      } else {
        switchArrow("right");
      }

      $menu.status = "opened";
      applyBodyMargin();
    }

    function closeMenu(execFunctions) {
      if (execFunctions) {
        if (
          plugin.settings.onBeforeClose !== undefined &&
          isFunction(plugin.settings.onBeforeClose)
        ) {
          plugin.settings.onBeforeClose($menu);
        }
      }
      if (plugin.settings.side === "left") {
        if (plugin.settings.pushBody) {
          $DOMBody.animate(
            { marginLeft: bodyProperties.originalMarginLeft },
            { duration: plugin.settings.duration },
          );
          bodyPushed = false;
        }

        $menu.animate(
          {
            left: -($menu.width() + 2),
          },
          {
            duration: plugin.settings.duration,
            done: function () {
              switchArrow("left");
              $menu.status = "closed";

              if (execFunctions) {
                if (
                  plugin.settings.onClose !== undefined &&
                  isFunction(plugin.settings.onClose)
                ) {
                  plugin.settings.onClose($menu);
                }
              }
            },
          },
        );
      } else if (plugin.settings.side === "right") {
        if (plugin.settings.pushBody) {
          $DOMBody.animate(
            { marginRight: bodyProperties.originalMarginRight },
            { duration: plugin.settings.duration },
          );
          bodyPushed = false;
        }

        $menu.animate(
          {
            right: -($menu.width() + 2),
          },
          {
            duration: plugin.settings.duration,
            done: function () {
              switchArrow("right");
              $menu.status = "closed";

              if (execFunctions) {
                if (
                  plugin.settings.onClose !== undefined &&
                  isFunction(plugin.settings.onClose)
                ) {
                  plugin.settings.onClose($menu);
                }
              }
            },
          },
        );
      }

      if (plugin.settings.remember) {
        storeStatus($menu.storageKey, "closed");
      }
    }

    function openMenu(execFunctions) {
      if (execFunctions) {
        if (
          plugin.settings.onBeforeOpen !== undefined &&
          isFunction(plugin.settings.onBeforeOpen)
        ) {
          plugin.settings.onBeforeOpen($menu);
        }
      }

      if (plugin.settings.side === "left") {
        if (plugin.settings.pushBody) {
          $DOMBody.animate(
            { marginLeft: $menu.width() + 20 },
            { duration: plugin.settings.duration },
          );
          bodyPushed = true;
        }

        $menu.animate(
          {
            left: 0,
          },
          {
            duration: plugin.settings.duration,
            done: function () {
              switchArrow("right");
              $menu.status = "opened";

              if (execFunctions) {
                if (
                  plugin.settings.onOpen !== undefined &&
                  isFunction(plugin.settings.onOpen)
                ) {
                  plugin.settings.onOpen($menu);
                }
              }
            },
          },
        );
      } else if (plugin.settings.side === "right") {
        if (plugin.settings.pushBody) {
          $DOMBody.animate(
            { marginRight: $menu.width() + 20 },
            { duration: plugin.settings.duration },
          );
          bodyPushed = true;
        }

        $menu.animate(
          {
            right: 0,
          },
          {
            duration: plugin.settings.duration,
            done: function () {
              switchArrow("left");
              $menu.status = "opened";

              if (execFunctions) {
                if (
                  plugin.settings.onOpen !== undefined &&
                  isFunction(plugin.settings.onOpen)
                ) {
                  plugin.settings.onOpen($menu);
                }
              }
            },
          },
        );
      }

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
