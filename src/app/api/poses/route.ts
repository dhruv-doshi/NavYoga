import { type NextRequest } from "next/server";
import { getRedis, POSE_KEY, POSES_PUBLIC, POSES_OWNER } from "@/lib/server/redis";
import type { PoseDefinition } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const redis = getRedis();
    const ownerId = request.nextUrl.searchParams.get("ownerId");
    const onlyPublic = request.nextUrl.searchParams.get("public") === "1";

    let ids: string[] = [];
    if (onlyPublic) {
      ids = (await redis.smembers(POSES_PUBLIC)) as string[];
    } else if (ownerId) {
      ids = (await redis.smembers(POSES_OWNER(ownerId))) as string[];
    } else {
      return Response.json({ poses: [] });
    }

    if (ids.length === 0) return Response.json({ poses: [] });

    const pipeline = redis.pipeline();
    ids.forEach((id) => pipeline.get(POSE_KEY(id)));
    const rows = (await pipeline.exec()) as Array<PoseDefinition | null>;
    const poses = rows.filter(Boolean) as PoseDefinition[];

    return Response.json({ poses });
  } catch (e) {
    console.error("[GET /api/poses]", e);
    return Response.json({ error: "Failed to load poses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const redis = getRedis();
    const pose = (await request.json()) as PoseDefinition;

    if (!pose?.id || !pose?.name) {
      return Response.json({ error: "id and name are required" }, { status: 400 });
    }

    await redis.set(POSE_KEY(pose.id), JSON.stringify(pose));
    if (pose.ownerId) {
      await redis.sadd(POSES_OWNER(pose.ownerId), pose.id);
    }
    if (pose.isPublic) {
      await redis.sadd(POSES_PUBLIC, pose.id);
    }

    return Response.json({ ok: true, id: pose.id });
  } catch (e) {
    console.error("[POST /api/poses]", e);
    return Response.json({ error: "Failed to save pose" }, { status: 500 });
  }
}
