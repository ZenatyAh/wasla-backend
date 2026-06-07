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
