import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enrichPlanItems } from "../helpers/plan-enrich.js";

const PlanRequestSchema = z.object({
  trigger: z.enum(["manual", "auto", "scheduled"]).default("manual"),
  input: z.string().optional(),
  maxSongs: z.number().int().min(1).max(20).default(8),
  withDj: z.boolean().default(true),
  scene: z.string().optional(),
});

export async function planRoutes(app: FastifyInstance) {
  app.post("/api/plan", async (request) => {
    const body = PlanRequestSchema.parse(request.body);
    const { claude, context, ncm, tts } = app.services;

    const contextStr = await context.buildContext(body.input, body.scene);
    const plan = await claude.generatePlan(
      {
        trigger: body.trigger,
        input: body.input,
        maxSongs: body.maxSongs,
        withDj: body.withDj,
        scene: body.scene,
      },
      contextStr
    );

    const planId = `plan_${Date.now()}`;
    const items = await enrichPlanItems(ncm, tts, plan.items, planId);

    return {
      planId,
      scene: plan.scene,
      summary: plan.summary,
      items,
    };
  });
}
