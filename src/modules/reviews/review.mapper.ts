type ReviewerRecord = {
  id: number;
  username: string;
  full_name: string;
  profile_image: string | null;
};

export const toReviewerSummary = (reviewer: ReviewerRecord) => ({
  id: reviewer.id,
  username: reviewer.username,
  name: reviewer.full_name,
  profilePicture: reviewer.profile_image,
});

type ReviewRecord = {
  id: number;
  rating: number;
  comment: string;
  created_at: Date;
  reviewer: ReviewerRecord;
};

export const toReviewResponse = (review: ReviewRecord) => ({
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.created_at,
  reviewer: toReviewerSummary(review.reviewer),
});

type PendingReviewExchangeRecord = {
  id: number;
  post_id: number | null;
  provider_id: number;
  consumer_id: number;
  status: string;
  completed_at: Date | null;
  post: { title: string } | null;
  provider: ReviewerRecord;
  consumer: ReviewerRecord;
};

export const toPendingReviewContract = (
  exchange: PendingReviewExchangeRecord,
  userId: number,
) => {
  const isProvider = exchange.provider_id === userId;
  const reviewee = isProvider ? exchange.consumer : exchange.provider;

  return {
    id: exchange.id,
    postId: exchange.post_id,
    postTitle: exchange.post?.title ?? null,
    status: exchange.status,
    completedAt: exchange.completed_at,
    role: isProvider ? ("provider" as const) : ("requester" as const),
    reviewee: toReviewerSummary(reviewee),
  };
};
