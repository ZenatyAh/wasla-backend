import { prisma } from "../../../lib/prisma.js";
import { syncUserSkillsByType } from "../../skills/userSkills.service.js";

export type ClerkUserLike = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
  unsafeMetadata?: Record<string, unknown> | null;
};

export const normalizeClerkUser = (input: unknown): ClerkUserLike => {
  if (typeof input !== "object" || input === null || !("id" in input)) {
    throw new Error("Invalid Clerk user payload");
  }

  const user = input as Record<string, unknown>;

  if (Array.isArray(user.email_addresses)) {
    return {
      id: String(user.id),
      firstName: (user.first_name as string | null) ?? null,
      lastName: (user.last_name as string | null) ?? null,
      primaryEmailAddressId:
        (user.primary_email_address_id as string | null) ?? null,
      emailAddresses: (
        user.email_addresses as Array<{ id: string; email_address: string }>
      ).map((entry) => ({
        id: entry.id,
        emailAddress: entry.email_address,
      })),
      unsafeMetadata: (user.unsafe_metadata as Record<string, unknown>) ?? {},
    };
  }

  if (Array.isArray(user.emailAddresses)) {
    return {
      id: String(user.id),
      firstName: (user.firstName as string | null) ?? null,
      lastName: (user.lastName as string | null) ?? null,
      primaryEmailAddressId:
        (user.primaryEmailAddressId as string | null) ?? null,
      emailAddresses: user.emailAddresses as Array<{
        id: string;
        emailAddress: string;
      }>,
      unsafeMetadata: (user.unsafeMetadata as Record<string, unknown>) ?? {},
    };
  }

  throw new Error("Invalid Clerk user payload");
};

type ClerkMetadata = {
  username?: unknown;
  full_name?: unknown;
  offeredSkills?: unknown;
  requiredSkills?: unknown;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const getClerkPrimaryEmail = (clerkUser: ClerkUserLike): string | null => {
  const primary = clerkUser.emailAddresses.find(
    (entry) => entry.id === clerkUser.primaryEmailAddressId,
  );

  return primary?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null;
};

export const getClerkDisplayName = (
  clerkUser: ClerkUserLike,
  metadata: ClerkMetadata,
): string | null => {
  const fromMetadata = asString(metadata.full_name);
  if (fromMetadata) {
    return fromMetadata;
  }

  const parts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }

  return null;
};

export const getClerkUsername = (metadata: ClerkMetadata): string | null =>
  asString(metadata.username);

const readClerkMetadata = (clerkUser: ClerkUserLike): ClerkMetadata =>
  (clerkUser.unsafeMetadata ?? {}) as ClerkMetadata;

export const findLocalUserByClerkId = (clerkUserId: string) =>
  prisma.user.findUnique({
    where: { clerk_user_id: clerkUserId },
  });

export const linkOrCreateUserFromClerk = async (clerkUser: ClerkUserLike) => {
  const metadata = readClerkMetadata(clerkUser);
  const email = getClerkPrimaryEmail(clerkUser);

  if (!email) {
    throw new Error("Clerk user is missing a primary email address");
  }

  const existingByClerkId = await findLocalUserByClerkId(clerkUser.id);
  if (existingByClerkId && !existingByClerkId.deleted_at) {
    return existingByClerkId;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingByEmail) {
    if (existingByEmail.deleted_at) {
      throw new Error("Account is unavailable");
    }

    if (
      existingByEmail.clerk_user_id &&
      existingByEmail.clerk_user_id !== clerkUser.id
    ) {
      throw new Error("Email is already linked to another Clerk account");
    }

    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: { clerk_user_id: clerkUser.id },
    });
  }

  const username = getClerkUsername(metadata);
  const fullName = getClerkDisplayName(clerkUser, metadata);

  if (!username || !fullName) {
    throw new Error(
      "Missing Wasla profile metadata. Provide username and full_name in Clerk unsafeMetadata.",
    );
  }

  const offeredSkills = asStringArray(metadata.offeredSkills);
  const requiredSkills = asStringArray(metadata.requiredSkills);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        clerk_user_id: clerkUser.id,
        email,
        username,
        full_name: fullName,
        password_hash: null,
      },
    });

    await syncUserSkillsByType(tx, user.id, offeredSkills, "OFFER");
    await syncUserSkillsByType(tx, user.id, requiredSkills, "REQUEST");

    await tx.transaction.create({
      data: {
        receiver_id: user.id,
        sender_id: null,
        amount: 5,
        transaction_type: "WELCOME_BONUS",
      },
    });

    return user;
  });
};

export const syncLocalUserFromClerk = async (clerkUser: ClerkUserLike) => {
  const localUser = await findLocalUserByClerkId(clerkUser.id);

  if (!localUser || localUser.deleted_at) {
    return linkOrCreateUserFromClerk(clerkUser);
  }

  const metadata = readClerkMetadata(clerkUser);
  const email = getClerkPrimaryEmail(clerkUser);
  const fullName = getClerkDisplayName(clerkUser, metadata);

  return prisma.user.update({
    where: { id: localUser.id },
    data: {
      ...(email ? { email } : {}),
      ...(fullName ? { full_name: fullName } : {}),
    },
  });
};

export const invalidateLocalUserSessions = async (clerkUserId: string) => {
  const localUser = await findLocalUserByClerkId(clerkUserId);

  if (!localUser) {
    return;
  }

  await prisma.session.deleteMany({
    where: { user_id: localUser.id },
  });
};

export const softDeleteLocalUserByClerkId = async (clerkUserId: string) => {
  const localUser = await findLocalUserByClerkId(clerkUserId);

  if (!localUser) {
    return;
  }

  await prisma.$transaction([
    prisma.session.deleteMany({
      where: { user_id: localUser.id },
    }),
    prisma.user.update({
      where: { id: localUser.id },
      data: { deleted_at: new Date() },
    }),
  ]);
};
