JS = dist/BootSideMenu.js dist/BootSideMenu.min.js
CSS = dist/BootSideMenu.css dist/BootSideMenu.min.css
THEMES = $(patsubst css/%, dist/%, $(wildcard css/theme/*.css))
THEMES := $(THEMES) $(THEMES:%.css=%.min.css)

all: $(JS) $(CSS) $(THEMES)

dist/BootSideMenu.js: js/BootSideMenu.js | dist
	cp $< $@

dist/BootSideMenu.min.js: js/BootSideMenu.js | dist
	terser $< -o $@

dist/BootSideMenu.css: css/BootSideMenu.css | dist
	cp $< $@

dist/BootSideMenu.min.css: css/BootSideMenu.css | dist
	cleancss $< -o $@

dist/theme/%.css: css/theme/%.css | dist/theme
	cp $< $@

dist/theme/%.min.css: css/theme/%.css | dist/theme
	cleancss $< -o $@

dist dist/theme:
	mkdir -p $@

clean:
	rm -rf dist
