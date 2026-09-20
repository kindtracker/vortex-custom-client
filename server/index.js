const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const Port = 8000;
const Root = "/home/user/Programming/Web/vortex-custom-client/";

const Server = http.createServer((Request, Response) => {
  if (Request.url.startsWith("/proxy")) {
    ProxyAPI(Request, Response);
    return;
  }

  ServeFile(Request, Response);
});

function ProxyAPI(Request, Response) {
  const TargetPath = Request.url.slice("/proxy".length);

  const Options = {
    hostname: "playvortex.io",
    path: TargetPath || "/",
    method: Request.method,
    headers: {
      ...Request.headers,
      host: "playvortex.io"
    }
  };

  const ProxyRequest = https.request(Options, (ProxyResponse) => {
    const Headers = {
      ...ProxyResponse.headers
    };

    const Cookies = ProxyResponse.headers["set-cookie"];

    if (Cookies) {
      Headers["set-cookie"] = Cookies.map((Cookie) =>
        Cookie
          .replace(/Domain=[^;]+;?\s*/i, "")
          .replace(/;\s*Secure/gi, "")
      );
    }

    Response.writeHead(ProxyResponse.statusCode, Headers);
    ProxyResponse.pipe(Response);
  });

  ProxyRequest.on("error", (Error) => {
    console.error(Error);

    if (!Response.headersSent) {
      Response.writeHead(502);
    }

    Response.end("Proxy error");
  });

  Request.pipe(ProxyRequest);
}

function ServeFile(Request, Response) {
  const UrlPath = Request.url === "/" ? "/index.html" : Request.url;
  const FilePath = path.join(Root, UrlPath);

  console.log(FilePath)
  if (!fs.existsSync(FilePath)) {
    Response.writeHead(404, {
      "Content-Type": "text/plain"
    });

    Response.end("Not Found");
    return;
  }

  const ContentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  };

  const Extension = path.extname(FilePath);

  Response.writeHead(200, {
    "Content-Type": ContentTypes[Extension] || "application/octet-stream"
  });

  fs.createReadStream(FilePath).pipe(Response);
}

Server.listen(Port, () => {
  console.log(`Server running at http://127.0.0.1:${Port}`);
});
