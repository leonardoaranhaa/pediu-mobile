import { mergeRouters } from "@trpc/server";
import { experienceBaseRouter } from "./experience-router-base";
import { experienceExtensionsRouter } from "./experience-extensions-router";

export const experienceRouter = mergeRouters(experienceBaseRouter, experienceExtensionsRouter);
