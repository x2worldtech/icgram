import Map "mo:core/Map";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Storage "mo:caffeineai-object-storage/Storage";

module {
  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  type UserProfile = {
    username : Text;
    displayName : Text;
    bio : Text;
    profilePicture : ?Storage.ExternalBlob;
    followers : [Principal];
    following : [Principal];
  };

  // Post shape BEFORE the commentCount field was introduced —
  // matches what's currently persisted in the deployed canister.
  type OldPost = {
    id : Text;
    author : Principal;
    image : Storage.ExternalBlob;
    caption : Text;
    timestamp : Int;
    likes : [Principal];
  };

  // Post shape AFTER the commentCount field was introduced —
  // matches the new Post type in main.mo.
  type NewPost = {
    id : Text;
    author : Principal;
    image : Storage.ExternalBlob;
    caption : Text;
    timestamp : Int;
    likes : [Principal];
    commentCount : ?Nat;
  };

  type Comment = {
    id : Text;
    postId : Text;
    author : Principal;
    text : Text;
    timestamp : Int;
    likes : [Principal];
  };

  type Activity = {
    id : Text;
    activityActor : Principal;
    activityType : { #like; #comment };
    postId : Text;
    commentId : ?Text;
    postOwner : Principal;
    timestamp : Int;
  };

  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  type OldActor = {
    var userProfiles : Map.Map<Principal, UserProfile>;
    var posts : Map.Map<Text, OldPost>;
    var comments : Map.Map<Text, Comment>;
    var activities : Map.Map<Text, Activity>;
    accessControlState : AccessControlState;
  };

  type NewActor = {
    var userProfiles : Map.Map<Principal, UserProfile>;
    var posts : Map.Map<Text, NewPost>;
    var comments : Map.Map<Text, Comment>;
    var activities : Map.Map<Text, Activity>;
    accessControlState : AccessControlState;
  };

  public func run(old : OldActor) : NewActor {
    // Count comments per postId so existing posts get their real count
    // when commentCount is stamped on them.
    let commentCounts = Map.empty<Text, Nat>();
    for (c in old.comments.values()) {
      let current = switch (commentCounts.get(c.postId)) {
        case (null) { 0 };
        case (?n) { n };
      };
      commentCounts.add(c.postId, current + 1);
    };

    // Copy each old post into a new post, adding commentCount.
    // null means "no comments yet" — frontend treats null as 0,
    // addComment will default null → 0 → 1 on the next comment.
    let posts = Map.empty<Text, NewPost>();
    for ((id, p) in old.posts.entries()) {
      posts.add(
        id,
        {
          id = p.id;
          author = p.author;
          image = p.image;
          caption = p.caption;
          timestamp = p.timestamp;
          likes = p.likes;
          commentCount = commentCounts.get(id);
        },
      );
    };

    {
      var userProfiles = old.userProfiles;
      var posts;
      var comments = old.comments;
      var activities = old.activities;
      accessControlState = old.accessControlState;
    };
  };
};
