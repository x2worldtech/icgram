import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Activity {
    id: string;
    activityType: Variant_like_comment;
    commentId?: string;
    timestamp: bigint;
    activityActor: Principal;
    postOwner: Principal;
    postId: string;
}
export interface Comment {
    id: string;
    text: string;
    author: Principal;
    likes: Array<Principal>;
    timestamp: bigint;
    postId: string;
}
export interface Post {
    id: string;
    author: Principal;
    likes: Array<Principal>;
    timestamp: bigint;
    caption: string;
    image: ExternalBlob;
}
export interface UserProfile {
    bio: string;
    username: string;
    displayName: string;
    followers: Array<Principal>;
    following: Array<Principal>;
    profilePicture?: ExternalBlob;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_like_comment {
    like = "like",
    comment = "comment"
}
export interface backendInterface {
    addComment(postId: string, text: string): Promise<string>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPost(image: ExternalBlob, caption: string): Promise<string>;
    deletePost(postId: string): Promise<void>;
    followUser(userToFollow: Principal): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(postId: string): Promise<Array<Comment>>;
    getFeed(): Promise<Array<Post>>;
    getInbox(): Promise<Array<Activity>>;
    getMultipleUsersPosts(users: Array<Principal>): Promise<Array<Post>>;
    getPostLikes(postId: string): Promise<bigint>;
    getRecentProfilePictures(limit: bigint): Promise<Array<ExternalBlob>>;
    getTotalLikesForUser(user: Principal): Promise<bigint>;
    getUserPosts(user: Principal): Promise<Array<Post>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    likeComment(commentId: string): Promise<void>;
    likePost(postId: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    unfollowUser(userToUnfollow: Principal): Promise<void>;
    unlikeComment(commentId: string): Promise<void>;
    unlikePost(postId: string): Promise<void>;
}
