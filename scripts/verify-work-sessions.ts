import "dotenv/config";
import bcrypt from "bcrypt";
import { readFileSync } from "node:fs";
import request from "supertest";
import { signAccessToken } from "../src/common/utils/jwt.ts";
import { prisma } from "../src/lib/prisma.ts";
import app from "../src/server.ts";

const runId = `ws_verify_${Date.now()}`;

async function tableExists(): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<
    Array<Record<string, unknown>>
  >(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'work_sessions' LIMIT 1`,
  );
  return rows.length > 0;
}

async function main() {
  console.log("1. work_sessions exists:", await tableExists());

  await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS work_sessions CASCADE");
  console.log("2. After DROP, exists:", await tableExists());

  const repairSql = readFileSync(
    "prisma/migrations/20260627120000_repair_work_sessions_table/migration.sql",
    "utf8",
  );
  await prisma.$executeRawUnsafe(repairSql);
  console.log("3. After repair SQL, exists:", await tableExists());

  const hash = await bcrypt.hash("TestPass@123", 10);
  const requester = await prisma.user.create({
    data: {
      full_name: "WS Req",
      username: `${runId}_r`,
      email: `${runId}_r@test.com`,
      password_hash: hash,
      available_balance: 10,
    },
  });
  const provider = await prisma.user.create({
    data: {
      full_name: "WS Prov",
      username: `${runId}_p`,
      email: `${runId}_p@test.com`,
      password_hash: hash,
      available_balance: 5,
    },
  });
  const post = await prisma.post.create({
    data: {
      user_id: requester.id,
      title: "WS test",
      description: "d",
      category: "REQUEST",
      service_mode: "ONLINE",
      assigned_time_credits: 5,
    },
  });

  const reqToken = signAccessToken(String(requester.id));
  const provToken = signAccessToken(String(provider.id));
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const end = new Date(Date.now() + 7 * 86400000).toISOString();

  const createRes = await request(app)
    .post("/exchanges/request")
    .set(auth(reqToken))
    .send({
      postId: post.id,
      providerId: provider.id,
      duration: 5,
      contractEndDate: end,
    });
  if (createRes.status !== 201) {
    throw new Error(`create failed: ${JSON.stringify(createRes.body)}`);
  }
  const exchangeId = createRes.body.exchange.id as number;

  await request(app)
    .put(`/exchanges/${exchangeId}/accept`)
    .set(auth(provToken))
    .expect(200);

  const recordRes = await request(app)
    .post(`/exchanges/${exchangeId}/sessions`)
    .set(auth(provToken))
    .send({ hours: 2, notes: "First session" });
  console.log(
    "4. POST /sessions status:",
    recordRes.status,
    recordRes.body.status === "fail" ? recordRes.body.message : "ok",
  );
  if (recordRes.status !== 201) {
    throw new Error(`record failed: ${JSON.stringify(recordRes.body)}`);
  }

  const listRes = await request(app)
    .get(`/exchanges/${exchangeId}/sessions`)
    .set(auth(reqToken));
  console.log("5. GET /sessions status:", listRes.status);
  console.log("6. sessions payload:", JSON.stringify(listRes.body, null, 2));

  const session = listRes.body.sessions?.[0];
  const ok =
    session &&
    session.hours === 2 &&
    session.session_number === 1 &&
    session.status === "PENDING_CONFIRMATION" &&
    session.notes === "First session";
  console.log("7. Values correct:", ok);

  await prisma.transaction.deleteMany({
    where: { reference_contract_id: exchangeId },
  });
  await prisma.serviceExchange.delete({ where: { id: exchangeId } });
  await prisma.post.delete({ where: { id: post.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [requester.id, provider.id] } },
  });
  await prisma.$disconnect();

  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
