import { z } from "zod";

const QuerySchema = z.object({ query: z.string() });

export async function POST(request: Request) {
  return Response.json(QuerySchema.parse(await request.json()));
}
