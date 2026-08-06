This is a fork of the original, but no longer maintained, [package by Andrea Lombardo](https://andrealombardo.github.io/BootSideMenu/) for use by the [Macaulay2](https://macaulay2.com) _Visualize_ package.

# BootSideMenu

**BootSideMenu** is a jQuery plugin to easily build a sliding menu in a Bootstrap based application.

---

## **Installation**

```sh
npm install @macaulay2/boot-side-menu
```

The built files land in `dist`. Load jQuery first, then the plugin:

```html
<link rel="stylesheet" href="dist/BootSideMenu.css" />
<!-- optional, for any theme other than the default one -->
<link rel="stylesheet" href="dist/theme/dracula.css" />

<script src="jquery.js"></script>
<script src="dist/BootSideMenu.js"></script>
```

Then give the menu an `id` and hand it to the plugin:

```html
<div id="menu">
  <div class="list-group">
    <a href="#" class="list-group-item">First item</a>
    <a href="#" class="list-group-item">Second item</a>
  </div>
</div>

<script>
  jQuery(function () {
    jQuery("#menu").BootSideMenu({ side: "left" });
  });
</script>
```

The plugin also loads as an AMD or CommonJS module.

## **Options**

| Option            | Type    | Value                                                               | Description                                                                                         |                                             Default                                             |
| :---------------- | :------ | :------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------: |
| **side**          | String  | left or right                                                       | Where menu will be placed                                                                           |                                             _left_                                              |
| **width**         | String  | any CSS length                                                      | Width of the menu                                                                                   |                                              _15%_                                              |
| **duration**      | Integer | milliseconds                                                        | Animation duration, ignored when the system asks for reduced motion                                 |                                              _500_                                              |
| **remember**      | Boolean | true or false                                                       | Restore last menu status on page refresh; needs the menu to have an `id`                            |                                             _true_                                              |
| **autoClose**     | Boolean | true or false                                                       | If true the initial status will be "closed"                                                         |                                             _false_                                             |
| **pushBody**      | Boolean | true or false                                                       | If true the body of the page will be pushed left or right, according to the menu width and position |                                             _true_                                              |
| **closeOnClick**  | Boolean | true or false                                                       | If true the menu will be closed when a link is clicked or if a click is made outside of it          |                                             _true_                                              |
| **closeOnEscape** | Boolean | true or false                                                       | If true an open menu will be closed by the Escape key                                               |                                             _true_                                              |
| **togglerLabel**  | String  | any text                                                            | Accessible name given to the toggler                                                                |                                         _'Toggle menu'_                                         |
| **icons**         | Object  | An object where to specify the icon fonts classes                   | A way to use other icon fonts                                                                       | `icons: {left: 'fa fa-chevron-left', right: 'fa fa-chevron-right', down: 'fa fa-chevron-down'}` |
| **theme**         | String  | 'default', 'dracula', 'darkblue', 'zenburn', 'pinklady', 'somebook' | Five themes plus a default one. Your is welcome.                                                    |                                           _'default'_                                           |

Below a window width of 480 pixels the menu stops pushing the body and always
closes on a click, whatever `pushBody` and `closeOnClick` say.

### **Remembering the menu state**

With `remember` on, the open or closed state is written to both `localStorage`
and a cookie, under a key built from the menu's `id`. Neither store works
everywhere: a page opened straight from the filesystem gets no cookies in
Chrome, while `localStorage` can be turned off or unavailable elsewhere.
Writing both means the state survives in either case, and a state saved by an
older version of the plugin is still read back from its cookie.

A menu without an `id` has nothing to key the state on, so `remember` turns
itself off and says so on the console.

### **Events**

| Event              | Description                                                 |  Default   |
| :----------------- | :---------------------------------------------------------- | :--------: |
| **onStartup**      | A function to be executed when the menu is instantiated     | do nothing |
| **onTogglerClick** | A function to be executed when the toggler arrow is clicked | do nothing |
| **onBeforeOpen**   | A function to be executed before the menu is opened         | do nothing |
| **onOpen**         | A function to be executed when the menu is opened           | do nothing |
| **onBeforeClose**  | A function to be executed before the menu is closed         | do nothing |
| **onClose**        | A function to be executed when the menu is closed           | do nothing |

Each callback receives the menu as its only argument.

### **Methods**

| Method                                  |                    Description                    |
| :-------------------------------------- | :-----------------------------------------------: |
| **$(selector).BootSideMenu.open();**    |            Open menu programmatically             |
| **$(selector).BootSideMenu.close();**   |            Close menu programmatically            |
| **$(selector).BootSideMenu.toggle();**  |           Toggle menu programmatically            |
| **$(selector).BootSideMenu.destroy();** | Remove the menu and give the original markup back |

The same methods are on the instance the plugin stores on the element, which
also exposes `isOpen()` and the merged `settings`:

```js
var menu = jQuery("#menu").data("BootSideMenu");

menu.open();
menu.isOpen(); // true
menu.settings.side; // "left"
menu.destroy(); // now jQuery("#menu").BootSideMenu(...) can build a new one
```

Initializing a menu that already has one does nothing; `destroy()` is what
lets a menu be rebuilt with different options.

### **Accessibility**

The toggler is reachable by tab and exposed as a button, with an
`aria-expanded` that follows the menu and an accessible name from
`togglerLabel`. Enter and Space work on it, and Escape closes the menu unless
`closeOnEscape` is off. When the system asks for reduced motion, the menu
opens and closes without animating.

## Examples

The `examples` directory has three pages, which open straight from the
filesystem once `npm run build` has produced `dist`:

- `examples/index.html` is a control panel: every option is a live control, the
  callbacks are logged as they fire, and the readouts show what the plugin
  makes of the window it is in.
- `examples/simple.html` is the smallest thing that works.
- `examples/events.html` wires up every callback and the methods.

## Donations

Coffee and beers are well accepted!
:coffee: [PayPal Donations Here](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=DUNFGKA32BFGE) :beer:
