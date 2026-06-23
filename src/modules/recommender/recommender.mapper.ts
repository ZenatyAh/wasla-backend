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

/**
 * Posts have no topical category or location of their own, so we derive both
 * from the author: the topical `category` is the author's first skill matching
 * the post type (OFFER post -> first offered skill; REQUEST post -> first
 * needed skill), and `location` falls back to the author's city.
 */
export const mapPost = (post: PostForMapping): RecommenderPost => {
  const wantedSkillType = post.category === "REQUEST" ? "REQUEST" : "OFFER";
  const derivedCategory =
    post.user.skills.find((s) => s.skill_type === wantedSkillType)?.skill
      .name ?? "";

  return {
    post_id: String(post.id),
    user_id: String(post.user_id),
    post_type: POST_TYPE_BY_CATEGORY[post.category] ?? post.category,
    category: derivedCategory,
    title: post.title,
    description: post.description,
    service_mode: SERVICE_MODE_LABEL[post.service_mode] ?? post.service_mode,
    location: post.user.location ?? "",
    time_credits: post.assigned_time_credits,
    timestamp: post.created_at.toISOString(),
  };
};

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
