import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enrichPlanItems } from "../helpers/plan-enrich.js";

const IntentSchema = z.object({
  text: z.string().min(1).max(500),
});

export async function intentRoutes(app: FastifyInstance) {
  app.post("/api/intent", async (request) => {
    const { text } = IntentSchema.parse(request.body);
    const { claude, context, ncm, tts } = app.services;

    const contextStr = await context.buildContext(text);
    const plan = await claude.generatePlan(
      { trigger: "manual", input: text, maxSongs: 8, withDj: true },
      contextStr
    );

    const planId = `plan_${Date.now()}`;
    const items = await enrichPlanItems(ncm, tts, plan.items, planId);

    return {
      intent: "GENERATE_PLAN",
      planId,
      scene: plan.scene,
      summary: plan.summary,
      message: `已根据你的指令生成播放计划：${plan.summary}`,
      items,
    };
  });
}
