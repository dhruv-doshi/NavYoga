import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Blob storage not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid form data" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const file = formData.get("file") as File | null;
  const poseName = (formData.get("poseName") as string | null) ?? "";

  if (!file) {
    return new Response(
      JSON.stringify({ error: "No file provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const slug = poseName
    ? poseName.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")
    : "pose";
  const ext = file.name.split(".").pop() ?? "jpg";
  const blobPath = `poses/${slug}/${Date.now()}.${ext}`;

  console.log(`[upload-image] Uploading: path=${blobPath} size=${file.size} type=${file.type}`);

  try {
    const blob = await put(blobPath, file, {
      access: "private",
      token,
    });
    console.log(`[upload-image] Upload OK: url=${blob.url}`);
    return new Response(JSON.stringify({ url: blob.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[upload-image] Blob upload failed: ${msg}`);
    return new Response(
      JSON.stringify({ error: `Upload failed: ${msg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
