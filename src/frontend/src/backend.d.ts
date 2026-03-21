import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Report {
    id: string;
    title: string;
    content: string;
    date: Time;
    createdAt: bigint;
    author: Principal;
    lastUpdatedAt: bigint;
    timestamp: Time;
    hasVoiceTranscript: boolean;
}
export interface UserProfile {
    name: string;
    email: string;
}
export interface ReportStatus {
    userName: string;
    hasSubmittedToday: boolean;
    user: Principal;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllUserProfiles(): Promise<Array<[Principal, UserProfile]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDailyReport(author: Principal, date: bigint): Promise<Report | null>;
    getReportStatusForToday(): Promise<Array<ReportStatus>>;
    getReportsByDate(date: bigint): Promise<Array<Report>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listAllReports(): Promise<Array<Report>>;
    listMyReports(): Promise<Array<Report>>;
    listReportsForToday(): Promise<Array<Report>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitDailyReport(content: string, hasVoiceTranscript: boolean): Promise<void>;
}
