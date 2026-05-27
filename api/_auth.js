import { verifyToken } from "@clerk/backend";

export async function getUserId(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  return payload.sub;
}
