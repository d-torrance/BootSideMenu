## version 2.3.0

- Release date: 2026-08-05
- Menu state is now stored in localStorage as well as a cookie, so
  "remember" works on pages opened from the filesystem, where Chrome allows
  no cookies; a state saved by an earlier version is still read from its
  cookie
- Fix the programmatic API documented in the README:
  $(selector).BootSideMenu.open() and its siblings threw a ReferenceError,
  and open() and close() on the instance fired none of their callbacks
- Fix initialization throwing away the event handlers and jQuery data
  attached to the menu's existing content
- Fix every click on the page re-closing an already closed menu, firing the
  close callbacks again each time
- Fix a quarter of all window resizes being silently ignored
- Fix the body keeping its margin when a window narrow enough to turn
  "pushBody" off left it pushed
- Fix async callbacks never being called
- Fall back to the left for an unrecognized "side", which used to leave the
  menu unpositioned and unable to move
- The toggler is now reachable by keyboard, exposed as a button with
  aria-expanded, and named by the new "togglerLabel" option; Escape closes
  the menu unless the new "closeOnEscape" option says otherwise, and the
  animation is skipped when the system asks for reduced motion
- New destroy() and isOpen() methods; destroy() also makes it possible to
  build a menu again with different options
- "remember" now needs the menu to have an id, and says so if it does not
- New examples directory, with a control panel for every option and two
  short copy-paste pages
- Ship the Apache-2.0 license text
- Add a QUnit test suite runnable with "npm test", in node under jsdom and
  in a real browser
- Run eslint as part of "npm run lint"

## version 2.2.2

- Release date: 2026-02-07
- Update to jquery 4.0.0
- Lint and prettify code w/ eslint and prettier

## version 2.2.1

- Release date: 2026-01-03
- Distribute minified js and css, too (now in "dist" directory)
- Add a few simple unit tests using QUnit

## version 2.2.0

- Release date: 2026-01-02
- New fork maintained primarily for use by the Macaulay2 Visualize package
- Update for Bootstrap 5 support
- Use Font Awesome icons instead of the deprecated Glyphicons
- May now be used as a module
