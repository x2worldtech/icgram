import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import List "mo:base/List";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Int "mo:base/Int";

actor {
  let storage = Storage.new();
  include MixinStorage(storage);

  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

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

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let textMap = OrderedMap.Make<Text>(Text.compare);

  var userProfiles = principalMap.empty<UserProfile>();
  var posts = textMap.empty<Post>();
  var comments = textMap.empty<Comment>();
  var activities = textMap.empty<Activity>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case (null) {
        let newProfile : UserProfile = {
          username = profile.username;
          displayName = profile.displayName;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followers = [];
          following = [];
        };
        userProfiles := principalMap.put(userProfiles, caller, newProfile);
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
        userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func createPost(image : Storage.ExternalBlob, caption : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create posts");
    };

    let postId = Text.concat("post-", debug_show (Time.now()));
    let newPost : Post = {
      id = postId;
      author = caller;
      image;
      caption;
      timestamp = Time.now();
      likes = [];
    };

    posts := textMap.put(posts, postId, newPost);
    postId;
  };

  public shared ({ caller }) func deletePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete posts");
    };

    switch (textMap.get(posts, postId)) {
      case (null) { Debug.trap("Post not found") };
      case (?post) {
        if (post.author != caller) {
          Debug.trap("Unauthorized: Only the author can delete this post");
        };

        posts := textMap.delete(posts, postId);

        // Remove associated comments
        var commentList = List.nil<(Text, Comment)>();
        for ((id, comment) in textMap.entries(comments)) {
          if (comment.postId == postId) {
            commentList := List.push((id, comment), commentList);
          };
        };
        let commentArray = List.toArray(commentList);
        for ((id, _) in commentArray.vals()) {
          comments := textMap.delete(comments, id);
        };

        // Remove associated activities
        var activityList = List.nil<(Text, Activity)>();
        for ((id, activity) in textMap.entries(activities)) {
          if (activity.postId == postId) {
            activityList := List.push((id, activity), activityList);
          };
        };
        let activityArray = List.toArray(activityList);
        for ((id, _) in activityArray.vals()) {
          activities := textMap.delete(activities, id);
        };
      };
    };
  };

  public query ({ caller }) func getFeed() : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view feed");
    };

    var allPosts = List.nil<Post>();
    for (post in textMap.vals(posts)) {
      allPosts := List.push(post, allPosts);
    };
    let allPostsArray = List.toArray(allPosts);
    Array.sort(
      allPostsArray,
      func(a : Post, b : Post) : { #less; #equal; #greater } {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  public query ({ caller }) func getUserPosts(user : Principal) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view posts");
    };

    var userPosts = List.nil<Post>();
    for (post in textMap.vals(posts)) {
      if (post.author == user) {
        userPosts := List.push(post, userPosts);
      };
    };
    let userPostsArray = List.toArray(userPosts);
    Array.sort(
      userPostsArray,
      func(a : Post, b : Post) : { #less; #equal; #greater } {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  public query ({ caller }) func getMultipleUsersPosts(users : [Principal]) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view posts");
    };

    let userSet = List.toArray(
      Array.foldLeft<Principal, List.List<Principal>>(
        users,
        List.nil(),
        func(acc, user) {
          List.push(user, acc);
        },
      )
    );

    var multipleUsersPosts = List.nil<Post>();
    for (post in textMap.vals(posts)) {
      for (user in userSet.vals()) {
        if (post.author == user) {
          multipleUsersPosts := List.push(post, multipleUsersPosts);
        };
      };
    };

    let postsArray = List.toArray(multipleUsersPosts);
    Array.sort(
      postsArray,
      func(a : Post, b : Post) : { #less; #equal; #greater } {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  public query ({ caller }) func getPostLikes(postId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view post likes");
    };

    switch (textMap.get(posts, postId)) {
      case (null) { 0 };
      case (?post) { post.likes.size() };
    };
  };

  public shared ({ caller }) func likePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can like posts");
    };

    switch (textMap.get(posts, postId)) {
      case (null) { Debug.trap("Post not found") };
      case (?post) {
        if (List.some<Principal>(List.fromArray(post.likes), func(l) { l == caller })) {
          Debug.trap("Already liked");
        };

        let updatedPost : Post = {
          id = post.id;
          author = post.author;
          image = post.image;
          caption = post.caption;
          timestamp = post.timestamp;
          likes = Array.append(post.likes, [caller]);
        };
        posts := textMap.put(posts, postId, updatedPost);

        // Create activity for post owner only if caller is not the post owner
        if (caller != post.author) {
          let activityId = Text.concat("activity-", debug_show (Time.now()));
          let newActivity : Activity = {
            id = activityId;
            activityActor = caller;
            activityType = #like;
            postId;
            commentId = null;
            postOwner = post.author;
            timestamp = Time.now();
          };
          activities := textMap.put(activities, activityId, newActivity);
        };
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unlike posts");
    };

    switch (textMap.get(posts, postId)) {
      case (null) { Debug.trap("Post not found") };
      case (?post) {
        if (not List.some<Principal>(List.fromArray(post.likes), func(l) { l == caller })) {
          Debug.trap("Post not liked");
        };

        let updatedPost : Post = {
          id = post.id;
          author = post.author;
          image = post.image;
          caption = post.caption;
          timestamp = post.timestamp;
          likes = Array.filter(post.likes, func(l : Principal) : Bool { l != caller });
        };
        posts := textMap.put(posts, postId, updatedPost);
      };
    };
  };

  public shared ({ caller }) func addComment(postId : Text, text : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can comment");
    };

    let commentId = Text.concat("comment-", debug_show (Time.now()));
    let newComment : Comment = {
      id = commentId;
      postId;
      author = caller;
      text;
      timestamp = Time.now();
      likes = [];
    };

    comments := textMap.put(comments, commentId, newComment);

    // Create activity for post owner only if caller is not the post owner
    switch (textMap.get(posts, postId)) {
      case (null) {};
      case (?post) {
        if (caller != post.author) {
          let activityId = Text.concat("activity-", debug_show (Time.now()));
          let newActivity : Activity = {
            id = activityId;
            activityActor = caller;
            activityType = #comment;
            postId;
            commentId = ?commentId;
            postOwner = post.author;
            timestamp = Time.now();
          };
          activities := textMap.put(activities, activityId, newActivity);
        };
      };
    };

    commentId;
  };

  public query ({ caller }) func getComments(postId : Text) : async [Comment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view comments");
    };

    var postComments = List.nil<Comment>();
    for (comment in textMap.vals(comments)) {
      if (comment.postId == postId) {
        postComments := List.push(comment, postComments);
      };
    };
    List.toArray(postComments);
  };

  public shared ({ caller }) func likeComment(commentId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can like comments");
    };

    switch (textMap.get(comments, commentId)) {
      case (null) { Debug.trap("Comment not found") };
      case (?comment) {
        if (List.some<Principal>(List.fromArray(comment.likes), func(l) { l == caller })) {
          Debug.trap("Already liked");
        };

        let updatedComment : Comment = {
          id = comment.id;
          postId = comment.postId;
          author = comment.author;
          text = comment.text;
          timestamp = comment.timestamp;
          likes = Array.append(comment.likes, [caller]);
        };
        comments := textMap.put(comments, commentId, updatedComment);

        // Create activity for post owner only if caller is not the post owner
        switch (textMap.get(posts, comment.postId)) {
          case (null) {};
          case (?post) {
            if (caller != post.author) {
              let activityId = Text.concat("activity-", debug_show (Time.now()));
              let newActivity : Activity = {
                id = activityId;
                activityActor = caller;
                activityType = #like;
                postId = comment.postId;
                commentId = ?commentId;
                postOwner = post.author;
                timestamp = Time.now();
              };
              activities := textMap.put(activities, activityId, newActivity);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func unlikeComment(commentId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unlike comments");
    };

    switch (textMap.get(comments, commentId)) {
      case (null) { Debug.trap("Comment not found") };
      case (?comment) {
        if (not List.some<Principal>(List.fromArray(comment.likes), func(l) { l == caller })) {
          Debug.trap("Comment not liked");
        };

        let updatedComment : Comment = {
          id = comment.id;
          postId = comment.postId;
          author = comment.author;
          text = comment.text;
          timestamp = comment.timestamp;
          likes = Array.filter(comment.likes, func(l : Principal) : Bool { l != caller });
        };
        comments := textMap.put(comments, commentId, updatedComment);
      };
    };
  };

  public shared ({ caller }) func followUser(userToFollow : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can follow others");
    };

    if (caller == userToFollow) {
      Debug.trap("Cannot follow yourself");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("Your profile not found") };
      case (?profile) {
        if (List.some<Principal>(List.fromArray(profile.following), func(f) { f == userToFollow })) {
          Debug.trap("Already following");
        };

        let updatedProfile : UserProfile = {
          username = profile.username;
          displayName = profile.displayName;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followers = profile.followers;
          following = Array.append(profile.following, [userToFollow]);
        };
        userProfiles := principalMap.put(userProfiles, caller, updatedProfile);

        switch (principalMap.get(userProfiles, userToFollow)) {
          case (null) {};
          case (?followedProfile) {
            let updatedFollowedProfile : UserProfile = {
              username = followedProfile.username;
              displayName = followedProfile.displayName;
              bio = followedProfile.bio;
              profilePicture = followedProfile.profilePicture;
              followers = Array.append(followedProfile.followers, [caller]);
              following = followedProfile.following;
            };
            userProfiles := principalMap.put(userProfiles, userToFollow, updatedFollowedProfile);
          };
        };
      };
    };
  };

  public shared ({ caller }) func unfollowUser(userToUnfollow : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unfollow others");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("Your profile not found") };
      case (?profile) {
        if (not List.some<Principal>(List.fromArray(profile.following), func(f) { f == userToUnfollow })) {
          Debug.trap("Not following this user");
        };

        let updatedProfile : UserProfile = {
          username = profile.username;
          displayName = profile.displayName;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          followers = profile.followers;
          following = Array.filter(profile.following, func(f : Principal) : Bool { f != userToUnfollow });
        };
        userProfiles := principalMap.put(userProfiles, caller, updatedProfile);

        switch (principalMap.get(userProfiles, userToUnfollow)) {
          case (null) {};
          case (?unfollowedProfile) {
            let updatedUnfollowedProfile : UserProfile = {
              username = unfollowedProfile.username;
              displayName = unfollowedProfile.displayName;
              bio = unfollowedProfile.bio;
              profilePicture = unfollowedProfile.profilePicture;
              followers = Array.filter(unfollowedProfile.followers, func(f : Principal) : Bool { f != caller });
              following = unfollowedProfile.following;
            };
            userProfiles := principalMap.put(userProfiles, userToUnfollow, updatedUnfollowedProfile);
          };
        };
      };
    };
  };

  public query ({ caller }) func getTotalLikesForUser(user : Principal) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view total likes");
    };

    var totalLikes : Nat = 0;
    for (post in textMap.vals(posts)) {
      if (post.author == user) {
        totalLikes += post.likes.size();
      };
    };
    totalLikes;
  };

  public query ({ caller }) func getInbox() : async [Activity] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view inbox");
    };

    var userActivities = List.nil<Activity>();
    for (activity in textMap.vals(activities)) {
      if (activity.postOwner == caller and activity.activityActor != caller) {
        userActivities := List.push(activity, userActivities);
      };
    };

    let userActivitiesArray = List.toArray(userActivities);
    Array.sort(
      userActivitiesArray,
      func(a : Activity, b : Activity) : { #less; #equal; #greater } {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  // New endpoint for optimally preloading recent profile pictures
  public query func getRecentProfilePictures(limit : Int) : async [Storage.ExternalBlob] {
    var allProfiles = List.nil<UserProfile>();
    for (profile in principalMap.vals(userProfiles)) {
      allProfiles := List.push(profile, allProfiles);
    };

    // Convert to array and sort by recency based on posts
    let sortedProfiles = Array.filter<UserProfile>(
      Array.sort(
        List.toArray(allProfiles),
        func(a : UserProfile, b : UserProfile) : { #less; #equal; #greater } {
          // Sort by follower count as a proxy for recency/activity
          if (a.followers.size() > b.followers.size()) {
            #less;
          } else if (a.followers.size() < b.followers.size()) { #greater } else {
            #equal;
          };
        },
      ),
      func(profile) { profile.profilePicture != null },
    );

    let size = Int.abs(limit);
    let profilesToReturn = if (size > sortedProfiles.size()) { sortedProfiles } else {
      Array.tabulate<UserProfile>(size, func(i : Nat) : UserProfile { sortedProfiles[i] });
    };

    Array.map<UserProfile, Storage.ExternalBlob>(
      profilesToReturn,
      func(profile) {
        switch (profile.profilePicture) {
          case (null) { Debug.trap("No profile picture") };
          case (?pic) { pic };
        };
      },
    );
  };
};

