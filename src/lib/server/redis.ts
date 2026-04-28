import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("KV_REST_API_URL and KV_REST_API_TOKEN env vars are required");
  }
  _redis = new Redis({ url, token });
  return _redis;
}

export const POSE_KEY = (id: string) => `pose:${id}`;
export const POSES_PUBLIC = "poses:public";
export const POSES_OWNER = (uid: string) => `poses:owner:${uid}`;
