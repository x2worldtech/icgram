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

  // The persisted state already stores Post WITH commentCount
  // (a previous migration brought it to this shape). OldPost and NewPost
  // are therefore identical — this migration is a structural pass-through
  // that only exists to satisfy the explicit-migration declaration in main.mo.
  type Post = {
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
    var posts : Map.Map<Text, Post>;
    var comments : Map.Map<Text, Comment>;
    var activities : Map.Map<Text, Activity>;
    accessControlState : AccessControlState;
  };

  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    old;
  };
};
