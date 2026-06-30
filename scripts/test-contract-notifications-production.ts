/**
 * End-to-end contract notification test against production (or BASE_URL).
 *
 *   npx tsx scripts/test-contract-notifications-production.ts
 */
import "dotenv/config";

const BASE_URL = (
  process.env.BASE_URL || "https://wasla-backend.up.railway.app"
).replace(/\/$/, "");
const PASSWORD = process.env.DEMO_PASSWORD || "DemoPass@123";
const RUN_ID = `notif${Date.now().toString(36)}`;

const json = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${res.status} ${text.slice(0, 400)}`);
  }
};

const login = async (email: string, password: string) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await json(res);
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }
  return {
    token: body.accessToken as string,
    userId: (body.user as { id: number }).id,
  };
};

const listNotifications = async (token: string) => {
  const res = await fetch(`${BASE_URL}/notifications?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await json(res);
  if (!res.ok) {
    throw new Error(`List notifications failed: ${JSON.stringify(body)}`);
  }
  return (body.notifications ?? []) as Array<Record<string, unknown>>;
};

const main = async () => {
  const skillsRes = await fetch(`${BASE_URL}/skills`);
  const skillsBody = await json(skillsRes);
  const skills = (skillsBody.skills as Array<{ name: string }> | undefined) ?? [];
  if (skills.length < 2) {
    throw new Error("Need at least 2 skills from /skills");
  }

  const register = async (
    label: string,
    payload: Record<string, unknown>,
  ) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await json(res);
    if (!res.ok) {
      throw new Error(`${label} register failed: ${JSON.stringify(body)}`);
    }
    return {
      token: body.accessToken as string,
      userId: (body.user as { id: number }).id,
      email: payload.email as string,
    };
  };

  const provider = await register("provider", {
    full_name: "Notif Test Provider",
    username: `nprov${RUN_ID}`.slice(0, 50),
    email: `nprov_${RUN_ID}@dummy.wasla.test`,
    password: PASSWORD,
    location: "Gaza",
    offeredSkills: [skills[0]!.name],
    requiredSkills: [skills[1]!.name],
  });

  const requester = await register("requester", {
    full_name: "Notif Test Requester",
    username: `nreq${RUN_ID}`.slice(0, 50),
    email: `nreq_${RUN_ID}@dummy.wasla.test`,
    password: PASSWORD,
    location: "Gaza",
    offeredSkills: [skills[1]!.name],
    requiredSkills: [skills[0]!.name],
  });

  const postRes = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requester.token}`,
    },
    body: JSON.stringify({
      title: `Notification test post ${RUN_ID}`,
      description:
        "Production notification verification post for contract lifecycle events.",
      category: "REQUEST",
      serviceMode: "ONLINE",
      assignedTimeCredits: 1,
    }),
  });
  const postBody = await json(postRes);
  if (!postRes.ok) {
    throw new Error(`Create post failed: ${JSON.stringify(postBody)}`);
  }
  const postId = (postBody.post as { id: number }).id;

  const contractEndDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const contractRes = await fetch(`${BASE_URL}/exchanges/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requester.token}`,
    },
    body: JSON.stringify({
      postId,
      providerId: provider.userId,
      duration: 1,
      contractEndDate,
    }),
  });
  const contractBody = await json(contractRes);
  if (!contractRes.ok) {
    throw new Error(`Create contract failed: ${JSON.stringify(contractBody)}`);
  }
  const contract = contractBody.exchange as { id: number };

  await new Promise((r) => setTimeout(r, 1500));

  const providerNotifsAfterRequest = await listNotifications(provider.token);
  const requesterNotifsAfterRequest = await listNotifications(requester.token);

  const acceptRes = await fetch(`${BASE_URL}/exchanges/${contract.id}/accept`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${provider.token}` },
  });
  const acceptBody = await json(acceptRes);
  if (!acceptRes.ok) {
    throw new Error(`Accept contract failed: ${JSON.stringify(acceptBody)}`);
  }

  await new Promise((r) => setTimeout(r, 1500));

  const providerNotifsAfterAccept = await listNotifications(provider.token);
  const requesterNotifsAfterAccept = await listNotifications(requester.token);

  const providerRequested = providerNotifsAfterRequest.some(
    (n) => n.type === "EXCHANGE_REQUESTED",
  );
  const requesterAccepted = requesterNotifsAfterAccept.some(
    (n) => n.type === "EXCHANGE_ACCEPTED",
  );

  const summary = {
    baseUrl: BASE_URL,
    runId: RUN_ID,
    provider: { id: provider.userId, email: provider.email },
    requester: { id: requester.userId, email: requester.email },
    postId,
    contractId: contract.id,
    checks: {
      providerHasExchangeRequested: providerRequested,
      requesterHasExchangeAccepted: requesterAccepted,
    },
    providerNotificationsAfterRequest: providerNotifsAfterRequest,
    requesterNotificationsAfterAccept: requesterNotifsAfterAccept,
    passed: providerRequested && requesterAccepted,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.passed) {
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
