export const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Wasla API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body {
        margin: 0;
      }
      .docs-nav {
        display: flex;
        gap: 1rem;
        padding: 0.6rem 1rem;
        background: #1a2332;
        border-bottom: 1px solid #2d3f56;
        font-family: system-ui, sans-serif;
        font-size: 0.9rem;
      }
      .docs-nav a {
        color: #93c5fd;
        text-decoration: none;
      }
      .docs-nav a:hover { text-decoration: underline; }
      .docs-nav span { color: #64748b; }
    </style>
  </head>
  <body>
    <nav class="docs-nav">
      <span>Wasla Docs</span>
      <a href="/docs">Swagger API</a>
      <a href="/docs/chat-frontend">Chat Frontend Guide</a>
    </nav>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/docs/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          persistAuthorization: true,
        });
      };
    </script>
  </body>
</html>`;
