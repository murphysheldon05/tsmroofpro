export interface WalkthroughStep {
  route: string;
  target: string | null; // data-tutorial attribute, null for final step (no highlight)
  description: string;
  isFinal?: boolean;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    route: "/command-center",
    target: "command-center-header",
    description:
      "Welcome to TSM Roof Pro Hub. This is your command center. Everything you need is right here.",
  },
  {
    route: "/command-center",
    target: "sidebar-profile",
    description:
      "Set up your profile. Add your photo, bio, and contact info so your team knows who you are.",
  },
  {
    route: "/commissions",
    target: "sidebar-commissions",
    description:
      "This is where the money lives. Submit your commissions here after every closed deal.",
  },
  {
    route: "/commissions",
    target: "submit-commission",
    description:
      "Hit Submit Commission, fill out the form, and submit. It goes to compliance review, then accounting, then you get paid. Simple.",
  },
  {
    route: "/commissions",
    target: "request-draw",
    description:
      "Need a draw? Hit Request a Draw. Make sure you check every eligibility box or it won't go through.",
  },
  {
    route: "/commissions",
    target: "pay-run-cutoff",
    description:
      "Heads up — submit by Tuesday at 3PM MST to hit this week's pay run. After that it rolls to next week.",
  },
  {
    route: "/commissions",
    target: "commission-pipeline",
    description:
      "Track every commission you've submitted right here. See the status, which phase it's in, and when you're getting paid.",
  },
  {
    route: "/message-center",
    target: "sidebar-message-center",
    description:
      "This is the team feed. Post your wins, see announcements, tag teammates. Keep it positive.",
  },
  {
    route: "/playbook-library",
    target: "sidebar-playbook-library",
    description:
      "Everything you need to know about how we operate is in here. Read it. Know it.",
  },
  {
    route: "/command-center",
    target: null,
    description: "You're all set. Go close some deals.",
    isFinal: true,
  },
];
