import type { AudioIssueSeverity, AudioWarning } from "./types";

export type AudioInputErrorCode =
  | "analysis_cancelled"
  | "decode_failed"
  | "empty_file"
  | "not_audio"
  | "unsupported_audio";

export interface UserFacingAudioIssue {
  code: AudioInputErrorCode;
  message: string;
  why: string;
  nextStep: string;
  severity: AudioIssueSeverity;
  recoverable: boolean;
}

export class AudioInputError extends Error {
  readonly code: AudioInputErrorCode;
  readonly why: string;
  readonly nextStep: string;
  readonly severity: AudioIssueSeverity;
  readonly recoverable: boolean;

  constructor(issue: UserFacingAudioIssue) {
    super(issue.message);
    this.name = "AudioInputError";
    this.code = issue.code;
    this.why = issue.why;
    this.nextStep = issue.nextStep;
    this.severity = issue.severity;
    this.recoverable = issue.recoverable;
  }
}

export function audioInputError(issue: UserFacingAudioIssue): AudioInputError {
  return new AudioInputError(issue);
}

export function cancelledAudioError(): AudioInputError {
  return audioInputError({
    code: "analysis_cancelled",
    message: "Audio analysis was cancelled.",
    why: "The previous job was stopped before it could replace the current project.",
    nextStep: "Choose another file or start the export again.",
    severity: "info",
    recoverable: true,
  });
}

export function toUserFacingAudioIssue(error: unknown): UserFacingAudioIssue {
  if (error instanceof AudioInputError) {
    return {
      code: error.code,
      message: error.message,
      why: error.why,
      nextStep: error.nextStep,
      severity: error.severity,
      recoverable: error.recoverable,
    };
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return toUserFacingAudioIssue(cancelledAudioError());
  }

  return {
    code: "decode_failed",
    message: "This file could not be decoded as audio.",
    why:
      error instanceof Error
        ? error.message
        : "The browser rejected the audio bytes.",
    nextStep:
      "Try exporting the source as MP3, WAV, M4A, or OGG and load it again.",
    severity: "error",
    recoverable: true,
  };
}

export function issueToWarning(issue: UserFacingAudioIssue): AudioWarning {
  return {
    code: issue.code,
    title: issue.message,
    message: issue.message,
    why: issue.why,
    nextStep: issue.nextStep,
    severity: issue.severity,
    confidence: 1,
  };
}
