export const messages = {
  chapters: "Walkthrough chapters",
  scope: "GENERAL SYSTEM ARCHITECTURE",
  diagram:
    "The coding agent exchanges data with the local runtime, which exchanges data with the browser.",
  snapshot:
    "Evidence snapshot: commit 1505b3d. This is a deliberately authored prototype, not a live-generated explainer.",
  explanation: [
    "The coding agent reads the repository and generates questions, explanations, code references, and criteria for written answers. PR quizzes assess changes; product quizzes assess current behaviour. Source fingerprints help detect when a cached product bank needs review.",
    "The local runtime validates the quiz contract and serves the browser UI over loopback. Validation catches malformed data; it cannot prove that an explanation accurately describes the code. That responsibility stays with the agent.",
    "The browser scores multiple-choice answers against the supplied answer key. Written responses travel through the runtime to a waiting agent, which reviews them against criteria and code evidence. Feedback returns to the browser per question.",
    "Review identities protect the boundary between attempts. A retake creates a new attempt, so feedback from the previous one is rejected. An active reviewer is required for written feedback; the runtime does not contain a hidden AI service.",
  ],
  title: "Code Comprehension · Architecture walkthrough",
  brand: "Code Comprehension",
  label: "EXPLAINER / PROTOTYPE",
  read: "The architecture, in brief",
  evidence: "Explore the evidence",
  note: "Prototype · Silent walkthrough · No voice model · No API keys",
  transcript: "Walkthrough text",
  play: "Play walkthrough",
  pause: "Pause",
  replay: "Replay",
  seek: "Walkthrough position",
  loading: "Preparing the walkthrough…",
  error: "The walkthrough could not load. Reload the page to try again.",
  tooLong: "The walkthrough exceeds the three-minute ceiling.",
  reduced:
    "Reduced motion is enabled. Use the illustrated explanation and transcript below, or play the walkthrough when ready.",
};
