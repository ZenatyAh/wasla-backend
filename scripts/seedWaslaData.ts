/**
 * Seeds 100 Gaza users × 5 posts for Wasla recommender integration testing.
 * Data matches GET /internal/recommender-export field contract (Arabic enums).
 *
 *   npm run seed:wasla
 *   SEED_MODE=api BASE_URL=https://wasla-backend.up.railway.app npm run seed:wasla
 *   SEED_CLEAN=yes npm run seed:wasla
 *   SEED_INTERACTIONS=yes npm run seed:wasla
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { buildRecommenderExport } from "../src/modules/recommender/recommender.export.service.js";
import {
  GAZA_STRIP_LOCATIONS,
  POST_TYPE_BY_CATEGORY,
  SERVICE_MODE_LABEL,
} from "../src/modules/recommender/recommender.mapper.js";
import { syncUserSkillsByType } from "../src/modules/skills/userSkills.service.js";

const USER_COUNT = Number(process.env.SEED_USER_COUNT || 100);
const POSTS_PER_USER = 5;
const OFFERS_PER_USER = 3;
const REQUESTS_PER_USER = 2;
const RUN_ID = process.env.SEED_RUN_ID || "wasla42";
const PASSWORD = "SeedPass@123";
const SEED_MODE = process.env.SEED_MODE || "db";
const BASE_URL = (process.env.BASE_URL || "https://wasla-backend.up.railway.app").replace(
  /\/$/,
  "",
);
const RECOMMENDER_URL = (process.env.RECOMMENDER_URL || "").replace(/\/$/, "");
const RECOMMENDER_API_KEY = process.env.RECOMMENDER_API_KEY || "";
const SEED_CLEAN = process.env.SEED_CLEAN !== "false";
const SEED_INTERACTIONS = process.env.SEED_INTERACTIONS === "yes";
const SEED_BOOTSTRAP = process.env.SEED_BOOTSTRAP !== "false";
const RNG_SEED = Number(process.env.SEED_RNG || 42);
const REFERENCE_NOW = new Date("2026-06-23T12:00:00.000Z");

export const APPROVED_CATEGORIES = [
  "تعليم",
  "برمجة",
  "تصميم",
  "صيانة",
  "ترجمة",
  "طبخ",
  "تنظيف",
  "تصوير",
] as const;

export const ONLINE_HEAVY_CATEGORIES = new Set([
  "برمجة",
  "تصميم",
  "ترجمة",
  "تعليم",
]);

const GAZA_NAMES = [
  "أحمد الشريف",
  "فاطمة أبو عمر",
  "محمد الحلو",
  "سارة أبو كليب",
  "يوسف عساف",
  "نور البطش",
  "خالد أبو راس",
  "لينا الشاعر",
  "عمر المغاري",
  "رنا أبو شبان",
  "إبراهيم أبو مدين",
  "مريم السرحي",
  "حسام عياد",
  "دينا أبو حطب",
  "طارق الريس",
  "هبة أبو جاموس",
  "سامي القرنا",
  "ليلى أبو عودة",
  "بلال الشنطي",
  "رغد أبو شبان",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetry = async <T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(500 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed`);
};

const OFFER_TITLES: Record<string, string[]> = {
  تعليم: [
    "أقدم دروس تعليم أونلاين في قطاع غزة",
    "تدريس خصوصي في مجال التعليم",
    "مراجعة واجبات ودروس تعليم للطلاب",
  ],
  برمجة: [
    "تطوير مواقع ووردبريس أونلاين",
    "برمجة تطبيقات ويب للمشاريع الصغيرة",
    "إصلاح أخطاء برمجية وصيانة مواقع",
  ],
  تصميم: [
    "تصميم شعارات وهويات بصرية",
    "تصميم منشورات سوشيال ميديا",
    "تصميم واجهات تطبيقات بسيطة",
  ],
  صيانة: [
    "صيانة أجهزة منزلية في غزة",
    "إصلاح أعطال كهربائية منزلية",
    "صيانة أجهزة ومعدات يومية",
  ],
  ترجمة: [
    "ترجمة مستندات عربي إنجليزي",
    "ترجمة مقالات ومحتوى رقمي",
    "ترجمة نصوص أكاديمية بدقة",
  ],
  طبخ: [
    "إعداد وجبات منزلية تقليدية",
    "طبخ مناسبات وعزائم في غزة",
    "تحضير حلويات ومعجنات طازجة",
  ],
  تنظيف: [
    "تنظيف منازل بعناية في غزة",
    "تنظيف عميق للشقق والمكاتب",
    "خدمة تنظيف دورية أسبوعية",
  ],
  تصوير: [
    "تصوير مناسبات وفعاليات",
    "تصوير منتجات للمتاجر المحلية",
    "جلسات تصوير شخصي في غزة",
  ],
};

const REQUEST_TITLES: Record<string, string[]> = {
  تعليم: [
    "أحتاج معلم رياضيات في غزة",
    "بدور على مساعدة في التعليم",
    "مطلوب مراجعة دروس تعليم",
  ],
  برمجة: [
    "أحتاج مطور برمجة لموقع بسيط",
    "بدور على مساعدة في البرمجة",
    "مطلوب إصلاح مشكلة برمجية عاجلة",
  ],
  تصميم: [
    "أحتاج مساعدة في تصميم شعار",
    "بدور على مصمم لتصميم منشورات",
    "مطلوب تصميم بطاقة أعمال",
  ],
  صيانة: [
    "أحتاج فني صيانة منزلية",
    "بدور على صيانة جهاز كهربائي",
    "مطلوب إصلاح عطل صيانة بسيط",
  ],
  ترجمة: [
    "أحتاج ترجمة مستند رسمي",
    "بدور على مترجم للترجمة",
    "مطلوب ترجمة نص قصير",
  ],
  طبخ: [
    "أحتاج طباخ لمناسبة عائلية",
    "بدور على مساعدة في الطبخ",
    "مطلوب تحضير وجبة للعزيمة",
  ],
  تنظيف: [
    "أحتاج خدمة تنظيف للمنزل",
    "بدور على مساعدة في التنظيف",
    "مطلوب تنظيف شامل للشقة",
  ],
  تصوير: [
    "أحتاج مصور لمناسبة صغيرة",
    "بدور على تصوير منتجات",
    "مطلوب جلسة تصوير شخصية",
  ],
};

const OFFER_DESCRIPTIONS: Record<string, string[]> = {
  تعليم: [
    "أقدم خدمات تعليم للطلاب في قطاع غزة بأسلوب مبسط ومرن عبر جلسات أونلاين أو وجاهية.",
    "خبرة في التعليم داخل غزة مع متابعة مستمرة ومواد تعليمية مناسبة للمرحلة الدراسية.",
  ],
  برمجة: [
    "أقدم خدمات برمجة وتطوير مواقع للمشاريع الصغيرة في قطاع غزة مع دعم بعد التسليم.",
    "برمجة مواقع وتطبيقات بسيطة باستخدام تقنيات حديثة مع تواصل سريع من غزة.",
  ],
  تصميم: [
    "تصميم احترافي للهويات البصرية والمنشورات مع مراعاة هوية المشاريع المحلية في غزة.",
    "أعمل على تصميم شعارات ومواد بصرية جذابة للمشاريع الناشئة في قطاع غزة.",
  ],
  صيانة: [
    "صيانة موثوقة للأجهزة المنزلية داخل غزة مع زيارة سريعة وأسعار عادلة بالساعات.",
    "خبرة عملية في صيانة الأعطال المنزلية الشائعة في قطاع غزة.",
  ],
  ترجمة: [
    "ترجمة دقيقة للنصوص العربية والإنجليزية للمؤسسات والأفراد في غزة.",
    "أقدم خدمات ترجمة للمحتوى الرقمي والمستندات مع مراجعة لغوية دقيقة.",
  ],
  طبخ: [
    "طبخ منزلي طازج للعائلات والمناسبات في غزة باستخدام مكونات محلية متوفرة.",
    "إعداد وجبات تقليدية فلسطينية للعزائم والتجمعات العائلية في قطاع غزة.",
  ],
  تنظيف: [
    "تنظيف شامل للمنازل والمكاتب في غزة مع اهتمام بالتفاصيل والمواعيد المتفق عليها.",
    "خدمة تنظيف منظمية للشقق السكنية داخل مدن قطاع غزة.",
  ],
  تصوير: [
    "تصوير فوتوغرافي للمناسبات والمنتجات في غزة مع تسليم سريع للصور.",
    "جلسات تصوير مرنة داخل قطاع غزة للأفراد والمشاريع الصغيرة.",
  ],
};

const REQUEST_DESCRIPTIONS: Record<string, string[]> = {
  تعليم: [
    "أبحث عن مساعدة في تعليم لابني داخل غزة مع مواعيد مرنة وتواصل واضح.",
    "أحتاج دعماً في التعليم للمرحلة الثانوية عبر جلسات منتظمة.",
  ],
  برمجة: [
    "أحتاج مطور برمجة لإنشاء صفحة هبوط بسيطة لمشروع محلي في غزة.",
    "أبحث عن مساعدة برمجية لتعديل موقع ووردبريس قائم.",
  ],
  تصميم: [
    "أحتاج مصمماً لإنشاء شعار بسيط لمبادرة مجتمعية في غزة.",
    "أبحث عن مساعدة في تصميم منشورات لحملة محلية.",
  ],
  صيانة: [
    "أحتاج فنياً للصيانة المنزلية لإصلاح عطل كهربائي في شقتي بغزة.",
    "أبحث عن صيانة سريعة لجهاز منزلي داخل قطاع غزة.",
  ],
  ترجمة: [
    "أحتاج ترجمة مستند قصير من العربية إلى الإنجليزية لغرض أكاديمي.",
    "أبحث عن مترجم للترجمة نص تسويقي لمشروع صغير.",
  ],
  طبخ: [
    "أحتاج مساعدة في الطبخ لتحضير وجبة عائلية في غزة الأسبوع القادم.",
    "أبحث عن طباخ لمناسبة صغيرة داخل خانيونس أو غزة.",
  ],
  تنظيف: [
    "أحتاج خدمة تنظيف للشقة قبل المناسبة في مدينة غزة.",
    "أبحث عن تنظيف شامل لمنزل في قطاع غزة بموعد محدد.",
  ],
  تصوير: [
    "أحتاج مصوراً لتصوير منتجات يدوية للبيع أونلاين من غزة.",
    "أبحث عن جلسة تصوير بسيطة لمناسبة عائلية في رفح.",
  ],
};

type Category = (typeof APPROVED_CATEGORIES)[number];
type ServiceMode = "ONLINE" | "OFFLINE";
type UserProfile = {
  index: number;
  fullName: string;
  skills: Category[];
  needs: Category[];
  location: string;
  timeBalance: number;
  highTrust: boolean;
  allowOverlap: boolean;
};

type CreatedPost = {
  id: number;
  userId: number;
  category: Category;
  postType: "OFFER" | "REQUEST";
  serviceMode: ServiceMode;
  timeCredits: number;
  location: string;
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T>(arr: readonly T[], index: number): T => arr[index % arr.length]!;

const shuffle = <T>(arr: T[], rng: () => number): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
};

const sampleUnique = <T>(pool: readonly T[], count: number, rng: () => number): T[] => {
  if (count > pool.length) {
    throw new Error(`Cannot sample ${count} unique items from pool of ${pool.length}`);
  }
  return shuffle([...pool], rng).slice(0, count);
};

const randomInt = (rng: () => number, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

const randomTimestamp = (rng: () => number): Date => {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const offset = Math.floor(rng() * thirtyDaysMs);
  return new Date(REFERENCE_NOW.getTime() - offset);
};

const serviceModeForCategory = (category: Category, rng: () => number): ServiceMode => {
  const onlineProb = ONLINE_HEAVY_CATEGORIES.has(category) ? 0.75 : 0.3;
  return rng() < onlineProb ? "ONLINE" : "OFFLINE";
};

const buildUserProfile = (index: number, rng: () => number): UserProfile => {
  const extraSkills = index % 10 === 0;
  let skillCount = extraSkills ? randomInt(rng, 6, 7) : randomInt(rng, 3, 5);
  let needCount = randomInt(rng, 2, 4);
  const allowOverlap = rng() < 0.3;

  if (!allowOverlap) {
    while (skillCount + needCount > APPROVED_CATEGORIES.length) {
      if (needCount > 2) {
        needCount--;
      } else {
        skillCount--;
      }
    }
    skillCount = Math.max(skillCount, OFFERS_PER_USER);
  }

  let skills = sampleUnique(APPROVED_CATEGORIES, skillCount, rng);
  let needs = sampleUnique(
    allowOverlap
      ? APPROVED_CATEGORIES
      : APPROVED_CATEGORIES.filter((c) => !skills.includes(c)),
    Math.min(needCount, allowOverlap ? needCount : APPROVED_CATEGORIES.length - skills.length),
    rng,
  );

  if (!allowOverlap) {
    while (needs.length < 2) {
      const candidate = APPROVED_CATEGORIES.find(
        (c) => !skills.includes(c) && !needs.includes(c),
      );
      if (!candidate) break;
      needs.push(candidate);
    }
  }

  const highTrust = index % 5 === 0;
  const lowBalance = rng() >= 0.6;
  const timeBalance = lowBalance ? randomInt(rng, 0, 3) : randomInt(rng, 4, 20);

  return {
    index,
    fullName: pick(GAZA_NAMES, index),
    skills,
    needs,
    location: pick(GAZA_STRIP_LOCATIONS, index),
    timeBalance,
    highTrust,
    allowOverlap,
  };
};

const titleFor = (category: Category, kind: "offer" | "request", variant: number) =>
  pick(kind === "offer" ? OFFER_TITLES[category]! : REQUEST_TITLES[category]!, variant);

const descriptionFor = (
  category: Category,
  kind: "offer" | "request",
  variant: number,
  location: string,
  serviceMode: ServiceMode,
) => {
  const base = pick(
    kind === "offer" ? OFFER_DESCRIPTIONS[category]! : REQUEST_DESCRIPTIONS[category]!,
    variant,
  );
  const locationNote =
    serviceMode === "ONLINE" && location !== ""
      ? ` الموقع: ${location}.`
      : serviceMode === "OFFLINE"
        ? ` الخدمة وجاهية في ${location}.`
        : "";
  return `${base} (${category})${locationNote}`.slice(0, 200);
};

const postLocation = (
  userLocation: string,
  serviceMode: ServiceMode,
  rng: () => number,
): string => {
  if (serviceMode === "OFFLINE") {
    return userLocation;
  }
  return rng() < 0.55
    ? userLocation
    : pick(GAZA_STRIP_LOCATIONS, Math.floor(rng() * GAZA_STRIP_LOCATIONS.length));
};

const buildPostPlans = (profile: UserProfile, rng: () => number) => {
  const offerCategories = sampleUnique(profile.skills, OFFERS_PER_USER, rng);
  const requestCategories = sampleUnique(profile.needs, REQUESTS_PER_USER, rng);

  const plans: {
    postType: "OFFER" | "REQUEST";
    category: Category;
    serviceMode: ServiceMode;
    timeCredits: number;
    location: string;
    city?: string;
    area?: string;
    title: string;
    description: string;
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < OFFERS_PER_USER; i++) {
    const category = offerCategories[i]!;
    const serviceMode = serviceModeForCategory(category, rng);
    const location = postLocation(profile.location, serviceMode, rng);
    const timeCredits = randomInt(rng, 1, 5);
    const locationParts = location.split(" - ");
    const city = serviceMode === "OFFLINE" ? locationParts[0] : undefined;
    const area = serviceMode === "OFFLINE" ? (locationParts[1] || "وسط البلد") : undefined;

    plans.push({
      postType: "OFFER",
      category,
      serviceMode,
      timeCredits,
      location,
      city,
      area,
      title: `${category} — ${titleFor(category, "offer", profile.index + i)}`,
      description: descriptionFor(category, "offer", profile.index + i, location, serviceMode),
      createdAt: randomTimestamp(rng),
    });
  }

  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const category = requestCategories[i]!;
    const serviceMode = serviceModeForCategory(category, rng);
    const location = postLocation(profile.location, serviceMode, rng);
    const timeCredits = randomInt(rng, 1, 5);
    const locationParts = location.split(" - ");
    const city = serviceMode === "OFFLINE" ? locationParts[0] : undefined;
    const area = serviceMode === "OFFLINE" ? (locationParts[1] || "وسط البلد") : undefined;

    plans.push({
      postType: "REQUEST",
      category,
      serviceMode,
      timeCredits,
      location,
      city,
      area,
      title: `${category} — ${titleFor(category, "request", profile.index + i)}`,
      description: descriptionFor(category, "request", profile.index + i, location, serviceMode),
      createdAt: randomTimestamp(rng),
    });
  }

  return plans;
};

const seedEmail = (index: number) => `wasla_${RUN_ID}_${index}@seed.wasla.test`;
const seedUsername = (index: number) => `ws${RUN_ID}${index}`.slice(0, 50);

const deleteSeedUser = async (prisma: PrismaClient, userId: number) => {
  await prisma.$transaction(async (tx) => {
    const reviewExchangeIds = (
      await tx.review.findMany({
        where: { OR: [{ reviewer_id: userId }, { reviewee_id: userId }] },
        select: { service_exchange_id: true },
      })
    ).map((r) => r.service_exchange_id);

    await tx.review.deleteMany({
      where: { OR: [{ reviewer_id: userId }, { reviewee_id: userId }] },
    });

    await tx.serviceExchange.deleteMany({
      where: {
        OR: [
          { provider_id: userId },
          { consumer_id: userId },
          { id: { in: reviewExchangeIds } },
        ],
      },
    });

    await tx.transaction.deleteMany({
      where: { OR: [{ receiver_id: userId }, { sender_id: userId }] },
    });

    const conversationIds = (
      await tx.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      })
    ).map((c) => c.conversationId);

    if (conversationIds.length) {
      await tx.messageReadReceipt.deleteMany({
        where: { message: { conversationId: { in: conversationIds } } },
      });
      await tx.message.deleteMany({
        where: { conversationId: { in: conversationIds } },
      });
      await tx.conversationParticipant.deleteMany({
        where: { conversationId: { in: conversationIds } },
      });
      await tx.conversation.deleteMany({
        where: { id: { in: conversationIds } },
      });
    }

    await tx.notification.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { user_id: userId } });
    await tx.savedPost.deleteMany({ where: { user_id: userId } });
    await tx.post.deleteMany({ where: { user_id: userId } });
    await tx.userSkill.deleteMany({ where: { user_id: userId } });
    await tx.user.delete({ where: { id: userId } });
  });
};

const cleanupPreviousRun = async (prisma: PrismaClient) => {
  const existing = await prisma.user.findMany({
    where: { email: { startsWith: `wasla_${RUN_ID}_` } },
    select: { id: true },
  });
  if (existing.length === 0) return;

  console.log(`[wasla-seed] Cleaning ${existing.length} users from run ${RUN_ID}...`);
  for (const user of existing) {
    await deleteSeedUser(prisma, user.id);
  }
};

const createTrustReviews = async (
  prisma: PrismaClient,
  userIds: number[],
  highTrustUserIds: Set<number>,
  rng: () => number,
) => {
  for (const revieweeId of userIds) {
    const isHighTrust = highTrustUserIds.has(revieweeId);
    const reviewCount = isHighTrust ? randomInt(rng, 2, 4) : rng() < 0.35 ? 1 : 0;
    if (reviewCount === 0) continue;

    for (let i = 0; i < reviewCount; i++) {
      const reviewerId = pick(
        userIds.filter((id) => id !== revieweeId),
        revieweeId + i,
      );
      const providerId = revieweeId;
      const consumerId = reviewerId;

      const exchange = await prisma.serviceExchange.create({
        data: {
          post_id: null,
          provider_id: providerId,
          consumer_id: consumerId,
          time_credits: 1,
          status: "COMPLETED",
          escrow_status: "RELEASED",
          maximum_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          completed_at: randomTimestamp(rng),
        },
      });

      const rating = isHighTrust ? randomInt(rng, 4, 5) : randomInt(rng, 1, 3);
      await prisma.review.create({
        data: {
          service_exchange_id: exchange.id,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating,
          comment: `تقييم تجريبي للمستخدم ${revieweeId} في بيانات وصلة.`,
        },
      });
    }
  }
};

const seedInteractions = async (
  prisma: PrismaClient,
  posts: CreatedPost[],
  userIds: number[],
  rng: () => number,
) => {
  const targetCount = Math.min(800, posts.length * 2);
  const saves: { user_id: number; post_id: number; created_at: Date }[] = [];
  const applies: {
    post_id: number;
    provider_id: number;
    consumer_id: number;
    time_credits: number;
    created_at: Date;
  }[] = [];

  for (let i = 0; i < targetCount; i++) {
    const post = pick(posts, Math.floor(rng() * posts.length));
    const actorId = pick(
      userIds.filter((id) => id !== post.userId),
      i,
    );
    const actionRoll = rng();
    const timestamp = randomTimestamp(rng);

    if (actionRoll < 0.45) {
      saves.push({ user_id: actorId, post_id: post.id, created_at: timestamp });
    } else {
      applies.push({
        post_id: post.id,
        provider_id: post.userId,
        consumer_id: actorId,
        time_credits: 1,
        created_at: timestamp,
      });
    }
  }

  await prisma.savedPost.createMany({ data: saves, skipDuplicates: true });
  await prisma.serviceExchange.createMany({
    data: applies.map((row) => ({
      post_id: row.post_id,
      provider_id: row.provider_id,
      consumer_id: row.consumer_id,
      time_credits: row.time_credits,
      status: "PENDING",
      escrow_status: "NONE",
      maximum_end_date: new Date(row.created_at.getTime() + 7 * 24 * 60 * 60 * 1000),
      created_at: row.created_at,
    })),
    skipDuplicates: true,
  });
};

const verifyExportData = (
  seedUserIds: Set<number>,
  exportData: {
    users: {
      user_id: string;
      skills: string[];
      needs: string[];
      location: string;
      trust_score: number;
    }[];
    posts: {
      post_id: string;
      user_id: string;
      post_type: string;
      category: string;
      title: string;
      description: string;
      service_mode: string;
      location: string;
    }[];
  },
) => {
  const users = exportData.users.filter((u) => seedUserIds.has(Number(u.user_id)));
  const posts = exportData.posts.filter((p) => seedUserIds.has(Number(p.user_id)));

  if (users.length !== USER_COUNT) {
    throw new Error(`Expected ${USER_COUNT} seed users in export, got ${users.length}`);
  }
  if (posts.length !== USER_COUNT * POSTS_PER_USER) {
    throw new Error(
      `Expected ${USER_COUNT * POSTS_PER_USER} seed posts in export, got ${posts.length}`,
    );
  }

  const postsByUser = new Map<string, typeof posts>();
  for (const post of posts) {
    const list = postsByUser.get(post.user_id) ?? [];
    list.push(post);
    postsByUser.set(post.user_id, list);
  }

  for (const user of users) {
    const userPosts = postsByUser.get(user.user_id) ?? [];
    if (userPosts.length !== POSTS_PER_USER) {
      throw new Error(`User ${user.user_id} has ${userPosts.length} posts, expected ${POSTS_PER_USER}`);
    }

    const skillCount = user.skills.length;
    if (skillCount >= 6) {
      if (skillCount > 7) {
        throw new Error(`User ${user.user_id} has too many skills: ${skillCount}`);
      }
    } else if (skillCount < 3 || skillCount > 5) {
      throw new Error(`User ${user.user_id} expected 3-5 skills, got ${skillCount}`);
    }

    if (user.needs.length < 2 || user.needs.length > 4) {
      throw new Error(`User ${user.user_id} needs out of range: ${user.needs.length}`);
    }

    if (!GAZA_STRIP_LOCATIONS.includes(user.location as (typeof GAZA_STRIP_LOCATIONS)[number])) {
      throw new Error(`User ${user.user_id} has invalid location: ${user.location}`);
    }

    const pairs = new Set<string>();
    let offers = 0;
    let requests = 0;

    for (const post of userPosts) {
      if (post.post_type !== "عرض" && post.post_type !== "طلب") {
        throw new Error(`Invalid post_type ${post.post_type} on post ${post.post_id}`);
      }
      if (post.service_mode !== "الكتروني" && post.service_mode !== "وجاهي") {
        throw new Error(`Invalid service_mode ${post.service_mode} on post ${post.post_id}`);
      }
      if (!APPROVED_CATEGORIES.includes(post.category as Category)) {
        throw new Error(`Invalid category ${post.category} on post ${post.post_id}`);
      }
      if (!post.title || !post.description) {
        throw new Error(`Missing title/description on post ${post.post_id}`);
      }
      if (
        !GAZA_STRIP_LOCATIONS.includes(post.location as (typeof GAZA_STRIP_LOCATIONS)[number])
      ) {
        throw new Error(`Invalid post location ${post.location} on post ${post.post_id}`);
      }

      if (post.post_type === "عرض") {
        offers++;
        if (!user.skills.includes(post.category)) {
          throw new Error(
            `Offer post ${post.post_id} category ${post.category} not in user skills`,
          );
        }
      } else {
        requests++;
        if (!user.needs.includes(post.category)) {
          throw new Error(
            `Request post ${post.post_id} category ${post.category} not in user needs`,
          );
        }
      }

      const pairKey = `${post.post_type}:${post.category}`;
      if (pairs.has(pairKey)) {
        throw new Error(`Duplicate (${post.post_type}, ${post.category}) for user ${user.user_id}`);
      }
      pairs.add(pairKey);

      if (post.service_mode === "وجاهي" && post.location !== user.location) {
        throw new Error(
          `In-person post ${post.post_id} location ${post.location} != user ${user.location}`,
        );
      }
    }

    if (offers !== OFFERS_PER_USER || requests !== REQUESTS_PER_USER) {
      throw new Error(
        `User ${user.user_id} offer/request split ${offers}/${requests} != ${OFFERS_PER_USER}/${REQUESTS_PER_USER}`,
      );
    }
  }

  return { users, posts };
};

const fetchRemoteExport = async () => {
  if (!RECOMMENDER_API_KEY) {
    throw new Error("RECOMMENDER_API_KEY is required to fetch production export");
  }
  const response = await withRetry("export", () =>
    fetch(`${BASE_URL}/internal/recommender-export`, {
      headers: { "X-Internal-Token": RECOMMENDER_API_KEY },
    }),
  );
  if (!response.ok) {
    throw new Error(`Export failed: HTTP ${response.status}`);
  }
  return (await response.json()) as Awaited<ReturnType<typeof fetchRemoteExport>>;
};

const verifyExport = async (seedUserIds: Set<number>) =>
  verifyExportData(seedUserIds, await buildRecommenderExport());

const loginSeedUser = async (index: number) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: seedEmail(index), password: PASSWORD }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    accessToken?: string;
    user?: { id: number };
  };
  if (!body.accessToken || !body.user?.id) return null;
  return { id: body.user.id, token: body.accessToken };
};

const deleteSeedAccountApi = async (token: string) => {
  const response = await fetch(`${BASE_URL}/users/account`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password: PASSWORD }),
  });
  return response.ok;
};

const cleanupPreviousRunApi = async () => {
  let removed = 0;
  for (let index = 0; index < USER_COUNT; index++) {
    const session = await loginSeedUser(index);
    if (!session) continue;
    const ok = await deleteSeedAccountApi(session.token);
    if (ok) removed++;
    await sleep(120);
  }
  if (removed > 0) {
    console.log(`[wasla-seed] API cleanup removed ${removed} users from run ${RUN_ID}`);
  }
};

const createUserViaApi = async (profile: UserProfile) => {
  const email = seedEmail(profile.index);
  const username = seedUsername(profile.index);
  const response = await withRetry(`register ${email}`, () =>
    fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: profile.fullName,
        username,
        email,
        password: PASSWORD,
        location: profile.location,
        offeredSkills: profile.skills,
        requiredSkills: profile.needs,
      }),
    }),
  );
  const body = (await response.json()) as {
    accessToken?: string;
    user?: { id: number };
    message?: string;
    errors?: { path?: string; message?: string }[];
  };
  if (!response.ok) {
    const detail =
      body.errors?.map((e) => `${e.path}: ${e.message}`).join("; ") ??
      body.message ??
      String(response.status);
    throw new Error(`Register failed: ${detail}`);
  }
  const userId = body.user?.id;
  const token = body.accessToken;
  if (!userId || !token) {
    throw new Error(`Register missing id/token for ${email}`);
  }
  return { id: userId, token };
};

const createPostsViaApi = async (
  user: { id: number; token: string },
  plans: ReturnType<typeof buildPostPlans>,
) => {
  const created: { id: number; plan: (typeof plans)[number] }[] = [];
  for (const [postIndex, plan] of plans.entries()) {
    const response = await withRetry(`post ${user.id}#${postIndex}`, () =>
      fetch(`${BASE_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          title: plan.title,
          description: plan.description,
          category: plan.postType,
          serviceMode: plan.serviceMode,
          assignedTimeCredits: plan.timeCredits,
          city: plan.city,
          area: plan.area,
        }),
      }),
    );
    if (!response.ok) {
      const err = (await response.json()) as { message?: string };
      throw new Error(`Post failed: ${err.message ?? response.status}`);
    }
    const body = (await response.json()) as { post: { id: number } };
    created.push({ id: body.post.id, plan });
    await sleep(100);
  }
  return created;
};

const seedInteractionsApi = async (
  users: { id: number; token: string }[],
  createdPosts: CreatedPost[],
  rng: () => number,
) => {
  let savesOk = 0;
  let appliesOk = 0;
  const targetCount = Math.min(800, createdPosts.length * 2);

  for (let i = 0; i < targetCount; i++) {
    const post = pick(createdPosts, Math.floor(rng() * createdPosts.length));
    const actor = pick(
      users.filter((u) => u.id !== post.userId),
      i,
    );
    if (!actor) continue;

    try {
      if (i % 2 === 0) {
        const response = await withRetry(`save ${actor.id}->${post.id}`, () =>
          fetch(`${BASE_URL}/posts/${post.id}/save`, {
            method: "POST",
            headers: { Authorization: `Bearer ${actor.token}` },
          }),
        );
        if (response.ok) savesOk++;
      } else {
        const response = await withRetry(`apply ${actor.id}->${post.id}`, () =>
          fetch(`${BASE_URL}/exchanges/request`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${actor.token}`,
            },
            body: JSON.stringify({
              postId: post.id,
              providerId: post.userId,
              duration: 1,
            }),
          }),
        );
        if (response.ok) appliesOk++;
      }
    } catch {
      // skip failed interactions
    }
    await sleep(80);
  }

  console.log(`[wasla-seed] Interactions: ${savesOk} saves, ${appliesOk} applies`);
};

const bootstrapRecommender = async () => {
  if (!RECOMMENDER_URL || !RECOMMENDER_API_KEY) {
    console.log("[wasla-seed] Skipping recommender bootstrap (URL/key not set)");
    return;
  }
  const exportData = await fetchRemoteExport();
  const response = await withRetry("bootstrap", () =>
    fetch(`${RECOMMENDER_URL}/sync/bootstrap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": RECOMMENDER_API_KEY,
      },
      body: JSON.stringify(exportData),
    }),
  );
  const body = await response.json();
  console.log("[wasla-seed] Recommender bootstrap:", JSON.stringify(body));
};

const runDbMode = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for SEED_MODE=db");
  }

  const rng = mulberry32(RNG_SEED);
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log(`[wasla-seed] DB mode → ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`[wasla-seed] Run ${RUN_ID} | RNG seed ${RNG_SEED}`);
  console.log(`[wasla-seed] Creating ${USER_COUNT} users × ${POSTS_PER_USER} posts`);

  if (SEED_CLEAN) {
    await cleanupPreviousRun(prisma);
  }

  const profiles = Array.from({ length: USER_COUNT }, (_, i) => buildUserProfile(i, rng));
  const seedUserIds = new Set<number>();
  const highTrustUserIds = new Set<number>();
  const createdPosts: CreatedPost[] = [];

  for (const profile of profiles) {
    const email = seedEmail(profile.index);
    const username = seedUsername(profile.index);
    const plans = buildPostPlans(profile, rng);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          full_name: profile.fullName,
          username,
          email,
          password_hash: passwordHash,
          location: profile.location,
          available_balance: profile.timeBalance,
        },
      });

      await syncUserSkillsByType(tx, created.id, profile.skills, "OFFER");
      await syncUserSkillsByType(tx, created.id, profile.needs, "REQUEST");

      await tx.transaction.create({
        data: {
          receiver_id: created.id,
          sender_id: null,
          amount: profile.timeBalance,
          transaction_type: "WELCOME_BONUS",
        },
      });

      for (const plan of plans) {
        await tx.post.create({
          data: {
            user_id: created.id,
            title: plan.title,
            description: plan.description,
            category: plan.postType,
            service_mode: plan.serviceMode,
            assigned_time_credits: plan.timeCredits,
            city: plan.city,
            area: plan.area,
            status: "PUBLISHED",
            created_at: plan.createdAt,
          },
        });
      }

      return created;
    });

    seedUserIds.add(user.id);
    if (profile.highTrust) {
      highTrustUserIds.add(user.id);
    }

    const userPosts = await prisma.post.findMany({
      where: { user_id: user.id },
      orderBy: [{ category: "asc" }, { id: "asc" }],
      select: {
        id: true,
        category: true,
        service_mode: true,
        assigned_time_credits: true,
      },
    });

    const offerPlans = plans.filter((p) => p.postType === "OFFER");
    const requestPlans = plans.filter((p) => p.postType === "REQUEST");
    const offerPosts = userPosts.filter((p) => p.category === "OFFER");
    const requestPosts = userPosts.filter((p) => p.category === "REQUEST");

    offerPosts.forEach((post, i) => {
      const plan = offerPlans[i]!;
      createdPosts.push({
        id: post.id,
        userId: user.id,
        category: plan.category,
        postType: "OFFER",
        serviceMode: post.service_mode,
        timeCredits: post.assigned_time_credits,
        location: plan.location,
      });
    });

    requestPosts.forEach((post, i) => {
      const plan = requestPlans[i]!;
      createdPosts.push({
        id: post.id,
        userId: user.id,
        category: plan.category,
        postType: "REQUEST",
        serviceMode: post.service_mode,
        timeCredits: post.assigned_time_credits,
        location: plan.location,
      });
    });

    if ((profile.index + 1) % 20 === 0 || profile.index === USER_COUNT - 1) {
      console.log(`[wasla-seed] Progress: ${profile.index + 1}/${USER_COUNT} users`);
    }
  }

  await createTrustReviews(prisma, [...seedUserIds], highTrustUserIds, rng);

  if (SEED_INTERACTIONS) {
    await seedInteractions(prisma, createdPosts, [...seedUserIds], rng);
    console.log("[wasla-seed] Interactions seeded (save + apply)");
  }

  const verified = await verifyExport(seedUserIds);
  printSummary(verified.users, verified.posts);
  await prisma.$disconnect();
  return verified;
};

const runApiMode = async () => {
  const rng = mulberry32(RNG_SEED);
  console.log(`[wasla-seed] API mode → ${BASE_URL}`);
  console.log(`[wasla-seed] Run ${RUN_ID} | RNG seed ${RNG_SEED}`);
  console.log(`[wasla-seed] Creating ${USER_COUNT} users × ${POSTS_PER_USER} posts`);

  if (SEED_CLEAN) {
    await cleanupPreviousRunApi();
  }

  const profiles = Array.from({ length: USER_COUNT }, (_, i) => buildUserProfile(i, rng));
  const seedUserIds = new Set<number>();
  const apiUsers: { id: number; token: string }[] = [];
  const createdPosts: CreatedPost[] = [];

  for (const profile of profiles) {
    const plans = buildPostPlans(profile, rng);
    const user = await createUserViaApi(profile);
    seedUserIds.add(user.id);
    apiUsers.push(user);

    const created = await createPostsViaApi(user, plans);

    for (const { id, plan } of created) {
      createdPosts.push({
        id,
        userId: user.id,
        category: plan.category,
        postType: plan.postType,
        serviceMode: plan.serviceMode,
        timeCredits: plan.timeCredits,
        location: plan.location,
      });
    }

    if ((profile.index + 1) % 10 === 0 || profile.index === USER_COUNT - 1) {
      console.log(`[wasla-seed] Progress: ${profile.index + 1}/${USER_COUNT} users`);
    }
    await sleep(200);
  }

  if (SEED_INTERACTIONS) {
    await seedInteractionsApi(apiUsers, createdPosts, rng);
  }

  const exportData = await fetchRemoteExport();
  const verified = verifyExportData(seedUserIds, exportData);
  printSummary(verified.users, verified.posts);

  if (SEED_BOOTSTRAP) {
    await bootstrapRecommender();
  }

  return verified;
};

const printSummary = (users: Awaited<ReturnType<typeof verifyExport>>["users"], posts: Awaited<ReturnType<typeof verifyExport>>["posts"]) => {
  const serviceModeCounts = { الكتروني: 0, وجاهي: 0 };
  const cityCounts = new Map<string, number>();
  let offers = 0;
  let requests = 0;

  for (const post of posts) {
    if (post.service_mode === "الكتروني") serviceModeCounts.الكتروني++;
    if (post.service_mode === "وجاهي") serviceModeCounts.وجاهي++;
    if (post.post_type === "عرض") offers++;
    if (post.post_type === "طلب") requests++;
    cityCounts.set(post.location, (cityCounts.get(post.location) ?? 0) + 1);
  }

  const highTrust = users.filter((u) => u.trust_score >= 4).length;

  console.log("\n[wasla-seed] Summary");
  console.log(`  Users: ${users.length}`);
  console.log(`  Posts: ${posts.length}`);
  console.log(`  Offers: ${offers} | Requests: ${requests}`);
  console.log(
    `  service_mode: الكتروني=${serviceModeCounts.الكتروني}, وجاهي=${serviceModeCounts.وجاهي}`,
  );
  console.log(`  Users with trust_score >= 4: ${highTrust}`);
  console.log("  City distribution (posts):");
  for (const city of GAZA_STRIP_LOCATIONS) {
    console.log(`    ${city}: ${cityCounts.get(city) ?? 0}`);
  }
};

const main = async () => {
  if (SEED_MODE === "api") {
    await runApiMode();
  } else {
    await runDbMode();
  }

  console.log("\n[wasla-seed] Done.");
  console.log("  Sample login:");
  console.log(`    email: ${seedEmail(0)}`);
  console.log(`    password: ${PASSWORD}`);
  console.log("  Export labels:");
  console.log(`    post_type: ${POST_TYPE_BY_CATEGORY.OFFER} / ${POST_TYPE_BY_CATEGORY.REQUEST}`);
  console.log(
    `    service_mode: ${SERVICE_MODE_LABEL.ONLINE} / ${SERVICE_MODE_LABEL.OFFLINE}`,
  );
};

main().catch((err) => {
  console.error("[wasla-seed] Fatal:", err);
  process.exit(1);
});
