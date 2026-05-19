import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Storage "mo:caffeineai-object-storage/Storage";
import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinObjectStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    username : Text;
    displayName : Text;
    bio : Text;
    profilePicture : ?Storage.ExternalBlob;
    followers : [Principal];
    following : [Principal];
  };

  public type Post = {
    id : Text;
    author : Principal;
    image : Storage.ExternalBlob;
    caption : Text;
    timestamp : Int;
    likes : [Principal];
    commentCount : ?Nat;
  };

  public type Comment = {
    id : Text;
    postId : Text;
    author : Principal;
    text : Text;
    timestamp : Int;
    likes : [Principal];
  };

  public type Activity = {
    id : Text;
    activityActor : Principal;
    activityType : { #like; #comment };
    postId : Text;
    commentId : ?Text;
    postOwner : Principal;
    timestamp : Int;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let posts = Map.empty<Text, Post>();
  let comments = Map.empty<Text, Comment>();
  let activities = Map.empty<Text, Activity>();

  func principalArrayContains(arr : [Principal], p : Principal) : Bool {
    for (item in arr.vals()) {
      if (item == p) return true;
    };
    false;
  };

  func principalArrayRemove(arr : [Principal], p : Principal) : [Principal] {
    let buf = List.empty<Principal>();
    for (item in arr.vals()) {
      if (item != p) buf.add(item);
    };
    buf.toArray();
  };

  func principalArrayAppend(arr : [Principal], p : Principal) : [Principal] {
    let buf = List.empty<Principal>();
    for (item in arr.vals()) { buf.add(item) };
    buf.add(p);
    buf.toArray();
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    switch (userProfiles.get(caller)) {
      case (null) {
        let newProfile : UserProfile = {
          username = profile.username;
          displayName = profile.displayName;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followers = [];
          following = [];
        };
        userProfiles.add(caller, newProfile);
      };
      case (?existingProfile) {
        let updatedProfile : UserProfile = {
          username = profile.username;
          displayName = profile.displayName;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followers = existingProfile.followers;
          following = existingProfile.following;
        };
        userProfiles.add(caller, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func createPost(image : Storage.ExternalBlob, caption : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };

    let postId = "post-" # debug_show (Time.now());
    let newPost : Post = {
      id = postId;
      author = caller;
      image;
      caption;
      timestamp = Time.now();
      likes = [];
      commentCount = ?0;
    };

    posts.add(postId, newPost);
    postId;
  };

  public shared ({ caller }) func deletePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };

    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (post.author != caller) {
          Runtime.trap("Unauthorized: Only the author can delete this post");
        };

        posts.remove(postId);

        // Delete related comments
        let commentIdsToDelete = List.empty<Text>();
        for ((id, comment) in comments.entries()) {
          if (comment.postId == postId) commentIdsToDelete.add(id);
        };
        for (id in commentIdsToDelete.values()) {
          comments.remove(id);
        };

        // Delete related activities
        let activityIdsToDelete = List.empty<Text>();
        for ((id, activity) in activities.entries()) {
          if (activity.postId == postId) activityIdsToDelete.add(id);
        };
        for (id in activityIdsToDelete.values()) {
          activities.remove(id);
        };
      };
    };
  };

  public query ({ caller }) func getFeed() : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view feed");
    };

    let buf = List.empty<Post>();
    for (post in posts.values()) { buf.add(post) };
    let allPosts = buf.toArray();
    allPosts.sort<Post>(
      func(a, b) {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  public query ({ caller }) func getUserPosts(user : Principal) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };

    let buf = List.empty<Post>();
    for (post in posts.values()) {
      if (post.author == user) buf.add(post);
    };
    let filtered = buf.toArray();
    filtered.sort<Post>(
      func(a, b) {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  public query ({ caller }) func getMultipleUsersPosts(users : [Principal]) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };

    let buf = List.empty<Post>();
    for (post in posts.values()) {
      if (principalArrayContains(users, post.author)) buf.add(post);
    };
    let filtered = buf.toArray();
    filtered.sort<Post>(
      func(a, b) {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  public query ({ caller }) func getPostLikes(postId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view post likes");
    };

    switch (posts.get(postId)) {
      case (null) { 0 };
      case (?post) { post.likes.size() };
    };
  };

  public shared ({ caller }) func likePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };

    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (principalArrayContains(post.likes, caller)) {
          Runtime.trap("Already liked");
        };

        let updatedPost : Post = {
          post with
          likes = principalArrayAppend(post.likes, caller);
        };
        posts.add(postId, updatedPost);

        if (caller != post.author) {
          let activityId = "activity-" # debug_show (Time.now());
          let newActivity : Activity = {
            id = activityId;
            activityActor = caller;
            activityType = #like;
            postId;
            commentId = null;
            postOwner = post.author;
            timestamp = Time.now();
          };
          activities.add(activityId, newActivity);
        };
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike posts");
    };

    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (not principalArrayContains(post.likes, caller)) {
          Runtime.trap("Post not liked");
        };

        let updatedPost : Post = {
          post with
          likes = principalArrayRemove(post.likes, caller);
        };
        posts.add(postId, updatedPost);
      };
    };
  };

  public shared ({ caller }) func addComment(postId : Text, commentText : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment");
    };

    let commentId = "comment-" # debug_show (Time.now());
    let newComment : Comment = {
      id = commentId;
      postId;
      author = caller;
      text = commentText;
      timestamp = Time.now();
      likes = [];
    };

    comments.add(commentId, newComment);

    switch (posts.get(postId)) {
      case (null) {};
      case (?post) {
        let currentCount = switch (post.commentCount) {
          case (null) { 0 };
          case (?n) { n };
        };
        let updatedPost : Post = {
          post with
          commentCount = ?(currentCount + 1);
        };
        posts.add(postId, updatedPost);

        if (caller != post.author) {
          let activityId = "activity-" # debug_show (Time.now());
          let newActivity : Activity = {
            id = activityId;
            activityActor = caller;
            activityType = #comment;
            postId;
            commentId = ?commentId;
            postOwner = post.author;
            timestamp = Time.now();
          };
          activities.add(activityId, newActivity);
        };
      };
    };

    commentId;
  };

  public query ({ caller }) func getComments(postId : Text) : async [Comment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view comments");
    };

    let buf = List.empty<Comment>();
    for (comment in comments.values()) {
      if (comment.postId == postId) buf.add(comment);
    };
    buf.toArray();
  };

  public shared ({ caller }) func likeComment(commentId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like comments");
    };

    switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?comment) {
        if (principalArrayContains(comment.likes, caller)) {
          Runtime.trap("Already liked");
        };

        let updatedComment : Comment = {
          comment with
          likes = principalArrayAppend(comment.likes, caller);
        };
        comments.add(commentId, updatedComment);

        switch (posts.get(comment.postId)) {
          case (null) {};
          case (?post) {
            if (caller != post.author) {
              let activityId = "activity-" # debug_show (Time.now());
              let newActivity : Activity = {
                id = activityId;
                activityActor = caller;
                activityType = #like;
                postId = comment.postId;
                commentId = ?commentId;
                postOwner = post.author;
                timestamp = Time.now();
              };
              activities.add(activityId, newActivity);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func unlikeComment(commentId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike comments");
    };

    switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?comment) {
        if (not principalArrayContains(comment.likes, caller)) {
          Runtime.trap("Comment not liked");
        };

        let updatedComment : Comment = {
          comment with
          likes = principalArrayRemove(comment.likes, caller);
        };
        comments.add(commentId, updatedComment);
      };
    };
  };

  public shared ({ caller }) func followUser(userToFollow : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };

    if (caller == userToFollow) {
      Runtime.trap("Cannot follow yourself");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Your profile not found") };
      case (?profile) {
        if (principalArrayContains(profile.following, userToFollow)) {
          Runtime.trap("Already following");
        };

        let updatedProfile : UserProfile = {
          profile with
          following = principalArrayAppend(profile.following, userToFollow);
        };
        userProfiles.add(caller, updatedProfile);

        switch (userProfiles.get(userToFollow)) {
          case (null) {};
          case (?followedProfile) {
            let updatedFollowedProfile : UserProfile = {
              followedProfile with
              followers = principalArrayAppend(followedProfile.followers, caller);
            };
            userProfiles.add(userToFollow, updatedFollowedProfile);
          };
        };
      };
    };
  };

  public shared ({ caller }) func unfollowUser(userToUnfollow : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Your profile not found") };
      case (?profile) {
        if (not principalArrayContains(profile.following, userToUnfollow)) {
          Runtime.trap("Not following this user");
        };

        let updatedProfile : UserProfile = {
          profile with
          following = principalArrayRemove(profile.following, userToUnfollow);
        };
        userProfiles.add(caller, updatedProfile);

        switch (userProfiles.get(userToUnfollow)) {
          case (null) {};
          case (?unfollowedProfile) {
            let updatedUnfollowedProfile : UserProfile = {
              unfollowedProfile with
              followers = principalArrayRemove(unfollowedProfile.followers, caller);
            };
            userProfiles.add(userToUnfollow, updatedUnfollowedProfile);
          };
        };
      };
    };
  };

  public query ({ caller }) func getTotalLikesForUser(user : Principal) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view total likes");
    };

    var totalLikes : Nat = 0;
    for (post in posts.values()) {
      if (post.author == user) {
        totalLikes += post.likes.size();
      };
    };
    totalLikes;
  };

  public query ({ caller }) func getInbox() : async [Activity] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inbox");
    };

    let buf = List.empty<Activity>();
    for (activity in activities.values()) {
      if (activity.postOwner == caller and activity.activityActor != caller) {
        buf.add(activity);
      };
    };
    let filtered = buf.toArray();
    filtered.sort<Activity>(
      func(a, b) {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  public query func getRecentProfilePictures(limit : Nat) : async [Storage.ExternalBlob] {
    let buf = List.empty<UserProfile>();
    for (profile in userProfiles.values()) {
      if (profile.profilePicture != null) buf.add(profile);
    };
    let withPics = buf.toArray();
    let sorted = withPics.sort(
      func(a, b) {
        if (a.followers.size() > b.followers.size()) {
          #less;
        } else if (a.followers.size() < b.followers.size()) { #greater } else {
          #equal;
        };
      },
    );

    let size = if (limit > sorted.size()) { sorted.size() } else { limit };
    let resBuf = List.empty<Storage.ExternalBlob>();
    var i = 0;
    while (i < size) {
      switch (sorted[i].profilePicture) {
        case (null) {};
        case (?pic) { resBuf.add(pic) };
      };
      i += 1;
    };
    resBuf.toArray();
  };

  // Global stats
  public query func getGlobalStats() : async {
    totalUsers : Nat;
    totalPosts : Nat;
    totalLikes : Nat;
    totalComments : Nat;
    totalActivities : Nat;
  } {
    var totalLikes : Nat = 0;
    for (post in posts.values()) {
      totalLikes += post.likes.size();
    };
    {
      totalUsers = userProfiles.size();
      totalPosts = posts.size();
      totalLikes;
      totalComments = comments.size();
      totalActivities = activities.size();
    };
  };

  // Followers/following list endpoints
  public query ({ caller }) func getUserFollowers(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view followers");
    };
    switch (userProfiles.get(user)) {
      case (null) { [] };
      case (?profile) { profile.followers };
    };
  };

  public query ({ caller }) func getUserFollowing(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view following");
    };
    switch (userProfiles.get(user)) {
      case (null) { [] };
      case (?profile) { profile.following };
    };
  };
};
