import type { Principal } from "@icp-sdk/core/principal";
import type { ExternalBlob } from "../backend";

export interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  profilePicture?: ExternalBlob;
  followers: Principal[];
  following: Principal[];
}

export interface Post {
  id: string;
  author: Principal;
  image: ExternalBlob;
  caption: string;
  likes: Principal[];
  commentCount?: bigint;
  timestamp: bigint;
}

export interface Comment {
  id: string;
  postId: string;
  author: Principal;
  text: string;
  likes: Principal[];
  timestamp: bigint;
}

export interface Activity {
  id: string;
  activityActor: Principal;
  postId: string;
  commentId?: string;
  activityType: ActivityType;
  timestamp: bigint;
}

export type ActivityType = "like" | "comment";

/** Discriminant values for Motoko variant `{ like; comment }` */
export const Variant_like_comment = {
  like: "like" as ActivityType,
  comment: "comment" as ActivityType,
} as const;
