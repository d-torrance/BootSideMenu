/**
 * Middleware for jquery-test-runner's test server.
 *
 * The server deliberately refuses to serve node_modules, apart from its own
 * directory and qunit's, so jQuery is not reachable from the test page.  This
 * maps the single path test/index.html asks for onto the installed copy, which
 * avoids having to vendor or copy the file.
 *
 * jquery-test-runner imports this module and calls its default export to build
 * the middleware, so it has to be ESM.
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const files = {
  "/test/vendor/jquery.js": join(
    root,
    "node_modules",
    "jquery",
    "dist",
    "jquery.js",
  ),
};

export default function serveVendoredFiles() {
  return async function (req, res, next) {
    const file = files[req.parsedUrl.pathname];

    if (!file || (req.method !== "GET" && req.method !== "HEAD")) {
      return next();
    }

    try {
      const { size } = await stat(file);
      res.writeHead(200, {
        "Content-Type": "text/javascript",
        "Content-Length": size,
      });
    } catch {
      res.writeHead(404);
      res.end();
      return;
    }

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    createReadStream(file).pipe(res);
  };
}
