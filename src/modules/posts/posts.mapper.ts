export const postSelect = {
  id: true,
  user_id: true,
  title: true,
  description: true,
  category: true,
  service_mode: true,
  assigned_time_credits: true,
  status: true,
  created_at: true,
  updated_at: true,
  user: {
    select: {
      id: true,
      username: true,
      full_name: true,
      profile_image: true,
    },
  },
} as const;

export type PostRecord = {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  service_mode: string;
  assigned_time_credits: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  user: {
    id: number;
    username: string;
    full_name: string;
    profile_image: string | null;
  };
};

export const toPostResponse = (post: PostRecord) => ({
  id: post.id,
  userId: post.user_id,
  title: post.title,
  description: post.description,
  category: post.category,
  serviceMode: post.service_mode,
  assignedTimeCredits: post.assigned_time_credits,
  status: post.status,
  createdAt: post.created_at,
  updatedAt: post.updated_at,
  user: post.user,
});
