window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: "/api/openapi.json",
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout",
    // Tighter layout for the Widgetly look.
    docExpansion: "list",
    defaultModelsExpandDepth: -1,
    defaultModelExpandDepth: 1,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    persistAuthorization: true,
    // Server-list selector lives at the top of the page. When a
    // reader uses "Try it out", they can flip between production,
    // staging, and localhost without editing the spec.
    supportedSubmitMethods: ["post", "get"],
  });
};
