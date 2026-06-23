/**
 * Translates Wasla's Prisma models into the exact field contract the FastAPI
 * recommender expects (see docs/express-integration.md). IDs are stringified
 * consistently so users, posts, and interactions join correctly on the
 * recommender side.
 */

export type RecommenderUser = {
  user_id: string;
  skills: string[];
  needs: string[];
  location: string;
  time_balance: number;
  trust_score: number;
};

export type RecommenderPost = {
  post_id: string;
  user_id: string;
  post_type: string;
  category: string;
  title: string;
  description: string;
  service_mode: string;
  location: string;
  time_credits: number;
  timestamp: string;
};

export type RecommenderInteraction = {
  user_id: string;
  post_id: string;
  action: "click" | "save" | "unsave" | "apply";
  timestamp: string;
};

// عرض = offer, طلب = request
export const POST_TYPE_BY_CATEGORY: Record<string, string> = {
  OFFER: "عرض",
  REQUEST: "طلب",
};

// الكتروني = online, وجاهي = in person
export const SERVICE_MODE_LABEL: Record<string, string> = {
  ONLINE: "الكتروني",
  OFFLINE: "وجاهي",
};

/** Gaza Strip cities recognized when deriving online post location from text. */
export const GAZA_STRIP_LOCATIONS = [
  "غزة",
  "خانيونس",
  "النصيرات",
  "المغازي",
  "البريج",
  "رفح",
  "جباليا",
  "دير البلح",
] as const;

type SkillRow = { skill_type: "OFFER" | "REQUEST"; skill: { name: string } };

export type UserForMapping = {
  id: number;
  location: string | null;
  available_balance: number;
  skills: SkillRow[];
};

/**
 * `trust_score` is not a stored column; callers compute the average of the
 * user's received review ratings (0–5) and pass it in. Defaults to 0.
 */
export const mapUser = (
  user: UserForMapping,
  trustScore = 0,
): RecommenderUser => ({
  user_id: String(user.id),
  skills: user.skills
    .filter((s) => s.skill_type === "OFFER")
    .map((s) => s.skill.name),
  needs: user.skills
    .filter((s) => s.skill_type === "REQUEST")
    .map((s) => s.skill.name),
  location: user.location ?? "",
  time_balance: user.available_balance,
  trust_score: Number(trustScore.toFixed(2)),
});

export type PostForMapping = {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  service_mode: string;
  assigned_time_credits: number;
  created_at: Date;
  user: {
    location: string | null;
    skills: SkillRow[];
  };
};

const skillNamesForType = (
  skills: SkillRow[],
  skillType: "OFFER" | "REQUEST",
): string[] =>
  skills.filter((s) => s.skill_type === skillType).map((s) => s.skill.name);

/**
 * Posts have no topical category column; match the author's skill name in the
 * title/description when present, otherwise fall back to the first skill of
 * the matching type (OFFER post -> offered skills, REQUEST -> needed skills).
 */
export const derivePostCategory = (post: PostForMapping): string => {
  const wantedSkillType = post.category === "REQUEST" ? "REQUEST" : "OFFER";
  const names = skillNamesForType(post.user.skills, wantedSkillType);
  if (names.length === 0) return "";

  const content = `${post.title} ${post.description}`;
  const parenMatch = names.find((name) => content.includes(`(${name})`));
  if (parenMatch) return parenMatch;

  const matched = names
    .filter((name) => content.includes(name))
    .sort((a, b) => b.length - a.length);

  return matched[0] ?? names[0] ?? "";
};

/**
 * In-person posts use the author's city. Online posts may mention any Gaza
 * Strip city in the text; otherwise the author's city is used.
 */
export const derivePostLocation = (post: PostForMapping): string => {
  const authorLocation = post.user.location ?? "";
  if (post.service_mode === "OFFLINE") {
    return authorLocation;
  }

  const content = `${post.title} ${post.description}`;
  const matched = GAZA_STRIP_LOCATIONS.find((city) => content.includes(city));
  return matched ?? authorLocation;
};

export const mapPost = (post: PostForMapping): RecommenderPost => ({
  post_id: String(post.id),
  user_id: String(post.user_id),
  post_type: POST_TYPE_BY_CATEGORY[post.category] ?? post.category,
  category: derivePostCategory(post),
  title: post.title,
  description: post.description,
  service_mode: SERVICE_MODE_LABEL[post.service_mode] ?? post.service_mode,
  location: derivePostLocation(post),
  time_credits: post.assigned_time_credits,
  timestamp: post.created_at.toISOString(),
});

export const mapInteraction = (input: {
  userId: number | string;
  postId: number | string;
  action: "click" | "save" | "unsave" | "apply";
  timestamp?: Date;
}): RecommenderInteraction => ({
  user_id: String(input.userId),
  post_id: String(input.postId),
  action: input.action,
  timestamp: (input.timestamp ?? new Date()).toISOString(),
});
