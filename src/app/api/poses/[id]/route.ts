import { type NextRequest } from "next/server";
import { getRedis, POSE_KEY, POSES_PUBLIC, POSES_OWNER } from "@/lib/server/redis";
import type { PoseDefinition } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const raw = await getRedis().get<string>(POSE_KEY(id));
    if (!raw) return Response.json({ error: "not found" }, { status: 404 });
    const pose: PoseDefinition = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Response.json({ pose });
  } catch (e) {
    console.error("[GET /api/poses/[id]]", e);
    return Response.json({ error: "Failed to load pose" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const redis = getRedis();
    const raw = await redis.get<string>(POSE_KEY(id));
    if (!raw) return Response.json({ error: "not found" }, { status: 404 });

    const existing: PoseDefinition = typeof raw === "string" ? JSON.parse(raw) : raw;
    const patch = (await req.json()) as Partial<PoseDefinition>;

    // Prevent overwriting id
    const updated: PoseDefinition = { ...existing, ...patch, id };

    // Reconcile public set membership
    const wasPublic = existing.isPublic ?? false;
    const isNowPublic = updated.isPublic ?? false;
    if (!wasPublic && isNowPublic) await redis.sadd(POSES_PUBLIC, id);
    if (wasPublic && !isNowPublic) await redis.srem(POSES_PUBLIC, id);

    await redis.set(POSE_KEY(id), JSON.stringify(updated));
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/poses/[id]]", e);
    return Response.json({ error: "Failed to update pose" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const redis = getRedis();
    const raw = await redis.get<string>(POSE_KEY(id));
    if (raw) {
      const pose: PoseDefinition = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (pose.ownerId) await redis.srem(POSES_OWNER(pose.ownerId), id);
      if (pose.isPublic) await redis.srem(POSES_PUBLIC, id);
    }
    await redis.del(POSE_KEY(id));
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/poses/[id]]", e);
    return Response.json({ error: "Failed to delete pose" }, { status: 500 });
  }
}
