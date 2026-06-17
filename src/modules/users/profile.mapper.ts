type UserSummary = {
  id: number;
  username: string;
  full_name: string;
  profile_image: string | null;
};

export const toUserSummary = (user: UserSummary) => ({
  id: user.id,
  username: user.username,
  name: user.full_name,
  profilePicture: user.profile_image,
});

type ProfileUserRecord = {
  full_name: string;
  username: string;
  bio: string | null;
  profile_image: string | null;
  available_balance: number;
};

type UserSkillRecord = {
  skill_type: "OFFER" | "REQUEST";
  skill: { name: string };
};

export const toProfileSkills = (userSkills: UserSkillRecord[]) => ({
  offeredSkills: userSkills
    .filter((entry) => entry.skill_type === "OFFER")
    .map((entry) => entry.skill.name),
  requiredSkills: userSkills
    .filter((entry) => entry.skill_type === "REQUEST")
    .map((entry) => entry.skill.name),
});

export const toBasicProfile = (user: ProfileUserRecord) => ({
  name: user.full_name,
  username: user.username,
  bio: user.bio,
  profilePicture: user.profile_image,
});

export const toUpdatableProfile = (
  user: ProfileUserRecord,
  userSkills: UserSkillRecord[],
) => ({
  ...toBasicProfile(user),
  ...toProfileSkills(userSkills),
});

type ExchangeRecord = {
  id: number;
  provider_id: number;
  consumer_id: number;
  time_credits: number;
  completed_at: Date | null;
  post: { id: number; title: string } | null;
  provider: UserSummary;
  consumer: UserSummary;
};

export const toRecentExchange = (
  exchange: ExchangeRecord,
  viewerId: number,
) => {
  const isProvider = exchange.provider_id === viewerId;
  const counterparty = isProvider ? exchange.consumer : exchange.provider;

  return {
    id: exchange.id,
    role: isProvider ? ("PROVIDER" as const) : ("CONSUMER" as const),
    timeCredits: exchange.time_credits,
    completedAt: exchange.completed_at,
    post: exchange.post
      ? { id: exchange.post.id, title: exchange.post.title }
      : null,
    counterparty: toUserSummary(counterparty),
  };
};
