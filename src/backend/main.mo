import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  
  public type Report = {
    id : Text;
    title : Text;
    content : Text;
    createdAt : Int;
    lastUpdatedAt : Int;
    author : Principal;
    timestamp : Time.Time;
    hasVoiceTranscript : Bool;
    date : Time.Time;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  public type ReportStatus = {
    user : Principal;
    userName : Text;
    hasSubmittedToday : Bool;
  };

  // Data storage
  let reports = Map.empty<Text, Report>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Helper function to convert Time.Time to plain date (year/month/day as Int)
  func toPlainDate(timestamp : Time.Time) : Int {
    // Convert to days since epoch
    timestamp / (24 * 60 * 60 * 1_000_000_000);
  };

  // Required profile management functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Daily report submission - authenticated users only
  public shared ({ caller }) func submitDailyReport(content : Text, hasVoiceTranscript : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit reports");
    };

    // Ensure user has a profile
    let userProfile = switch (userProfiles.get(caller)) {
      case (?profile) { profile };
      case (null) {
        let tempProfile : UserProfile = {
          name = "User " # caller.toText();
          email = caller.toText() # "@icp0.io";
        };
        userProfiles.add(caller, tempProfile);
        tempProfile;
      };
    };

    let today = toPlainDate(Time.now());
    let existingReportKey = caller.toText() # Int.toText(today);

    switch (reports.get(existingReportKey)) {
      // Create new report
      case (null) {
        let newReport : Report = {
          id = existingReportKey;
          title = "Daily Report - " # userProfile.name;
          content;
          createdAt = Time.now();
          lastUpdatedAt = Time.now();
          author = caller;
          timestamp = Time.now();
          hasVoiceTranscript;
          date = Time.now();
        };
        reports.add(existingReportKey, newReport);
      };
      // Update existing report
      case (?existingReport) {
        let updatedReport : Report = {
          id = existingReport.id;
          content;
          title = existingReport.title;
          createdAt = existingReport.createdAt;
          lastUpdatedAt = Time.now();
          author = existingReport.author;
          timestamp = existingReport.timestamp;
          hasVoiceTranscript;
          date = existingReport.date;
        };
        reports.add(existingReportKey, updatedReport);
      };
    };
  };

  // Get a specific daily report - users can view their own, admins can view all
  public query ({ caller }) func getDailyReport(author : Principal, date : Int) : async ?Report {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view reports");
    };
    
    if (caller != author and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own reports");
    };

    let key = author.toText() # Int.toText(date);
    reports.get(key);
  };

  // List reports for today - users see their own, admins see all
  public query ({ caller }) func listReportsForToday() : async [Report] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list reports");
    };

    let today = toPlainDate(Time.now());
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    
    reports.values().toArray().filter(
      func(report : Report) : Bool {
        let isToday = toPlainDate(report.timestamp) == today;
        let canView = isAdmin or report.author == caller;
        isToday and canView;
      }
    );
  };

  // Get all reports for a specific date - admin only
  public query ({ caller }) func getReportsByDate(date : Int) : async [Report] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view reports by date");
    };

    reports.values().toArray().filter(
      func(report : Report) : Bool {
        toPlainDate(report.timestamp) == date;
      }
    );
  };

  // Get report status for all team members today - admin only
  public query ({ caller }) func getReportStatusForToday() : async [ReportStatus] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view team report status");
    };

    let today = toPlainDate(Time.now());
    let allUsers = userProfiles.entries().toArray();

    allUsers.map(
      func((userId : Principal, profile : UserProfile)) : ReportStatus {
        let key = userId.toText() # Int.toText(today);
        let hasSubmitted = switch (reports.get(key)) {
          case (null) { false };
          case (_) { true };
        };
        {
          user = userId;
          userName = profile.name;
          hasSubmittedToday = hasSubmitted;
        };
      }
    );
  };

  // List all user profiles - admin only
  public query ({ caller }) func getAllUserProfiles() : async [(Principal, UserProfile)] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can list all users");
    };
    userProfiles.entries().toArray();
  };

  // List my own reports - authenticated users only
  public query ({ caller }) func listMyReports() : async [Report] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list their reports");
    };

    reports.values().toArray().filter(
      func(report : Report) : Bool {
        report.author == caller;
      }
    );
  };

  // List all reports - admin only
  public query ({ caller }) func listAllReports() : async [Report] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can list all reports");
    };

    reports.values().toArray();
  };
};
