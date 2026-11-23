import { apiPrefix } from "./api-prefix";

export function openApiDocument() {
    const base = apiPrefix();
    const json = (summary: string) => ({
        post: {
            summary,
            responses: { "200": { description: "Envelope" }, "400": { description: "Invalid input" } },
        },
    });
    return {
        openapi: "3.0.3",
        info: { title: "Base API", version: "1.0.0" },
        servers: [{ url: base }],
        paths: {
            "/auth/token": json("Login"),
            "/platform/auth/token": json("Platform admin login"),
            "/auth/refresh": json("Rotate refresh token"),
            "/auth/logout": json("Logout"),
            "/auth/request-password-reset": json("Request password reset"),
            "/auth/token-oauth": json("OAuth client token"),
            "/user": { post: { summary: "Create user", responses: { "200": { description: "Envelope" } } } },
            "/person": { get: { summary: "List persons", responses: { "200": { description: "Page" } } } },
            "/role": { get: { summary: "List roles", responses: { "200": { description: "Page" } } } },
            "/service": { get: { summary: "List services", responses: { "200": { description: "Page" } } } },
        },
    };
}

export function swaggerHtml(): string {
    const spec = `${apiPrefix()}/schema/`;
    return `<!doctype html><html><head><title>Base API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"></head>
<body><div id="swagger"></div>
<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: "${spec}", dom_id: "#swagger" })</script>
</body></html>`;
}

export function redocHtml(): string {
    const spec = `${apiPrefix()}/schema/`;
    return `<!doctype html><html><head><title>Base API</title></head>
<body><redoc spec-url="${spec}"></redoc>
<script src="https://unpkg.com/redoc/bundles/redoc.standalone.js"></script>
</body></html>`;
}
