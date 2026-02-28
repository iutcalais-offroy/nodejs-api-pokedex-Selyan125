import fs from "fs";
import path from "path";
import yaml from "js-yaml";

type OpenApiObject = {
  openapi?: string;
  info?: Record<string, unknown>;
  servers?: unknown[];
  tags?: unknown[];
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
};

function readYaml(fileName: string): OpenApiObject {
  const filePath = path.resolve(__dirname, fileName);
  const source = fs.readFileSync(filePath, "utf8");
  return (yaml.load(source) ?? {}) as OpenApiObject;
}

function mergeOpenApi(base: OpenApiObject, extension: OpenApiObject): OpenApiObject {
  return {
    ...base,
    paths: {
      ...(base.paths ?? {}),
      ...(extension.paths ?? {}),
    },
    tags: [...(base.tags ?? []), ...(extension.tags ?? [])],
    components: {
      ...(base.components ?? {}),
      ...(extension.components ?? {}),
      schemas: {
        ...(base.components?.schemas ?? {}),
        ...(extension.components?.schemas ?? {}),
      },
      securitySchemes: {
        ...(base.components?.securitySchemes ?? {}),
        ...(extension.components?.securitySchemes ?? {}),
      },
    },
  };
}

/**
 * Construit le document OpenAPI final en agrégeant la configuration principale
 * et les fichiers de documentation modulaires.
 *
 * @returns Le document OpenAPI prêt à être servi dans Swagger UI.
 */
export function buildOpenApiDocument(): OpenApiObject {
  const root = readYaml("swagger.config.yml");
  const auth = readYaml("auth.doc.yml");
  const card = readYaml("card.doc.yml");
  const deck = readYaml("deck.doc.yml");

  return [auth, card, deck].reduce(mergeOpenApi, root);
}

export const openApiDocument = buildOpenApiDocument();
