import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 text-sm text-primary font-medium mt-3">
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300 mt-3">
      {children}
    </div>
  );
}

function Good({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2.5 text-sm text-green-800 dark:text-green-300 mt-2">
      {children}
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-[3px] border-primary bg-muted/50 pl-3 py-1.5 text-sm italic my-2">
      "{children}"
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold text-primary uppercase tracking-wider mt-4 mb-2">
      {children}
    </div>
  );
}

function Li({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 my-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
          <span className="text-primary shrink-0">→</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function RepGuideContent() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold">Chamber Event Rep Guide</h2>
        <p className="text-sm text-muted-foreground mt-1">
          TSM Roofing SOP — Chamber of Commerce Event Representation. Tap any section to expand.
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">

        {/* 1. Purpose & Your Role */}
        <AccordionItem value="purpose" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">📋</span>
              <span className="font-semibold text-sm">Purpose & Your Role</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              You're not just attending a Chamber event — you're representing TSM Roofing. Every handshake, every conversation, every business card exchange reflects on this company.
            </p>
            <Sub>Your three roles at every event</Sub>
            <Li items={[
              "Brand Ambassador — You are the face of TSM Roofing. Every interaction reflects our values, quality, and professionalism.",
              "Community Member — Engage genuinely. Chamber events are about relationships, not just transactions.",
              "Business Developer — Identify, qualify, and capture leads for residential, commercial, and HOA roofing opportunities.",
            ]} />
            <Good>Goal: collect at least 3 qualified lead contacts per event.</Good>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Before You Go */}
        <AccordionItem value="checklist" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">✅</span>
              <span className="font-semibold text-sm">Before You Go — Mandatory Checklist</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Don't leave the office without checking every box.
            </p>
            <Sub>Materials</Sub>
            <Li items={[
              "TSM Roofing branded business cards — replenish from the office if running low. Do not attend without them.",
              "Full compliance with TSM Roofing dress code — when in doubt, check with your manager before leaving.",
              "Current promotions and active service areas reviewed.",
            ]} />
            <Sub>Research</Sub>
            <Li items={[
              "Review the Chamber's event agenda and attendee list (if available).",
              "Identify 3–5 target contacts or companies you want to connect with.",
              "Know the names of your current local projects — community credibility matters.",
            ]} />
            <Sub>Event fees</Sub>
            <Warn>
              If the event has a registration fee, do not pay out of pocket without manager approval first. Submit the event name, date, and cost at least 2 weeks in advance. Free events don't need pre-approval but should be logged on the shared calendar.
            </Warn>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Attendance Requirements */}
        <AccordionItem value="attendance" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">🎯</span>
              <span className="font-semibold text-sm">Attendance Requirements</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Attendance at the following is mandatory for all TSM Roofing sales reps:
            </p>
            <Li items={[
              "City Mixers — Required for every sales rep, every time. Non-negotiable. If you can't make it, notify your manager in advance with a valid reason.",
              "City Connects — Same attendance standard as Mixers.",
              "Extracurricular Events — Each rep must attend at least one community event per cycle.",
            ]} />
            <Tip>
              Community outreach opportunities are often discussed at Mixers before they're publicly posted. Stay engaged and bring any relevant opportunities back to management immediately. Word-of-mouth intel at these events is exactly what gives TSM an advantage.
            </Tip>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Elevator Pitch */}
        <AccordionItem value="pitch" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">🎤</span>
              <span className="font-semibold text-sm">Elevator Pitch — Use This</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Lead with your name and TSM Roofing — not your job title. Don't say "I'm a sales rep." Say this:
            </p>
            <div className="bg-muted/50 border rounded-lg p-3 text-sm leading-relaxed my-3">
              "Hi, I'm [Name] with TSM Roofing — we specialize in residential and commercial roofing across [service area]. We've been serving local homeowners and businesses for years, we're fully licensed and insured, and we stand behind every job with a workmanship warranty. We'd love to earn your trust — or a referral from someone you know."
            </div>
            <Sub>What to listen for when qualifying leads</Sub>
            <Li items={[
              "Recent storm damage or aging roofs",
              "Commercial buildings or HOA communities needing inspections",
              "New construction projects seeking roofing bids",
              "Business owners who may refer or partner with us",
            ]} />
            <Tip>
              Exchange business cards after a genuine connection — not immediately. Write a quick note on the back of cards you receive: what you discussed, next step needed.
            </Tip>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Working the Room */}
        <AccordionItem value="working" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">🤝</span>
              <span className="font-semibold text-sm">Working the Room</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">You're in. Now what? Here's how to own the room.</p>
            <Sub>Arrival</Sub>
            <Li items={[
              "Arrive at least 15 minutes early.",
              "Check in with Chamber staff, confirm your name badge and TSM's listing.",
              "If TSM has a table or display, set up promptly.",
            ]} />
            <Sub>Networking rules</Sub>
            <Li items={[
              "Do not cluster with TSM coworkers. If multiple reps attend, spread out and work the room independently.",
              "Listen more than you talk. Ask open-ended questions before pitching.",
              "Introduce yourself to at least 2 Chamber board members or staff at every event.",
              "Connect attendees with each other when appropriate — being a connector builds trust.",
            ]} />
            <Sub>Quick wins</Sub>
            <Good>Post up at the food table. It's a goldmine — everyone's standing there thinking the same thing. Start a conversation.</Good>
            <Good>Find the person standing alone. They want someone to talk to — they just don't want to start it. Go be that person.</Good>
            <Good>Lead with a genuine compliment or observation. Gets them talking. Costs you nothing.</Good>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Conversation Starters */}
        <AccordionItem value="starters" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">💬</span>
              <span className="font-semibold text-sm">Conversation Starters & Openers</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Sub>General openers — works on anyone</Sub>
            <Quote>What brought you out tonight?</Quote>
            <Quote>First time at one of these?</Quote>
            <Quote>You been here long or just getting started?</Quote>
            <Quote>You here for anyone specific or just seeing who's around?</Quote>

            <Sub>Steer toward business when the time's right</Sub>
            <Quote>So what do you do — you in [industry] or something totally different?</Quote>
            <Quote>How long you been in the space?</Quote>
            <Quote>What's keeping you busiest right now?</Quote>
            <Quote>What does your day-to-day actually look like?</Quote>

            <Sub>Best follow-up questions</Sub>
            <Quote>What got you into that?</Quote>
            <Quote>What do you like most about it?</Quote>
            <Quote>What's the biggest challenge in your space right now?</Quote>
            <Tip>That last one is your best friend. Challenges are opportunities. File it away and bring it back to the manager.</Tip>

            <Sub>Your exit strategy</Sub>
            <Quote>I'm gonna grab some food while the line's short. Great meeting you.</Quote>
            <Quote>Hey, you should meet [name] — he's in the same space. I'll introduce you, then I've got to track someone down.</Quote>
            <Quote>I've got to get going, but I'd like to stay in touch — you got a card or you on LinkedIn?</Quote>
            <p className="text-sm text-muted-foreground mt-3">
              Get in, make a connection, move on. Repeat. That's how you work a room.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 7. Conduct Standards */}
        <AccordionItem value="conduct" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">🚫</span>
              <span className="font-semibold text-sm">Conduct Standards & What NOT to Do</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              These are non-negotiable at every Chamber event.
            </p>
            <Sub>Professional behavior</Sub>
            <Li items={[
              "Be respectful, attentive, and engaged in all conversations.",
              "Do not interrupt or monopolize conversations.",
              "Avoid politics, religion, or divisive topics.",
              "One drink maximum if alcohol is served. Professionalism is the priority.",
              "Put the phone away during active networking time.",
            ]} />
            <Sub>Competitor protocol</Sub>
            <Li items={[
              "You will run into competitor roofing companies. That's normal.",
              'Be courteous and professional. Do not badmouth or undercut them publicly.',
              'If a prospect mentions a competitor: acknowledge and redirect — "We\'d love the chance to show you what TSM can do."',
            ]} />
            <Sub>Strictly prohibited</Sub>
            <Li items={[
              "Making unauthorized pricing commitments or promises",
              "Representing yourself as an owner or executive if you are not",
              "Disparaging competitors, Chamber members, or TSM staff",
              "Attending while impaired or consuming more than one drink",
              "Using Chamber events for personal sales or side businesses",
              "Sharing confidential TSM info (pricing, margins, vendor names)",
              "Failing to log leads or submit post-event reports",
            ]} />
          </AccordionContent>
        </AccordionItem>

        {/* 8. After the Event */}
        <AccordionItem value="followup" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">📤</span>
              <span className="font-semibold text-sm">After the Event — Follow-Up</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The event is only the beginning. What you do in the 48 hours after is what converts contacts into customers.
            </p>
            <Sub>Timeline</Sub>
            <Li items={[
              "Within 24 hours — Log all new contacts in the CRM. Include where you met them, what was discussed, and next steps.",
              "Within 48 hours — Send personalized follow-up emails or LinkedIn connections to everyone you exchanged cards with.",
              "Within 1 week — Follow up by phone with all warm or qualified leads. Reference your conversation specifically.",
            ]} />
            <Sub>Follow-up rules</Sub>
            <Li items={[
              "All follow-up must come from your TSM Roofing email — not personal accounts.",
              "Reference the Chamber event and your conversation to personalize each message.",
              "Offer a free inspection, consultation, or quote as a next step.",
              "Do not send mass or generic emails. Each follow-up must be individualized.",
            ]} />
            <Sub>Post-event report</Sub>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Submit your Post-Event Report to your manager within 48 hours. Include: number of contacts made, qualified leads captured, noteworthy conversations, and your assessment of the event's value.
            </p>
            <Tip>Never pass a personal cell number as a company contact. All follow-ups use your TSM business contact info.</Tip>
          </AccordionContent>
        </AccordionItem>

        {/* 9. Quick Reference Checklist */}
        <AccordionItem value="quickref" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="text-base">📝</span>
              <span className="font-semibold text-sm">Quick Reference Checklist</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-1">
              <div>
                <div className="text-xs font-semibold mb-3 pb-2 border-b">BEFORE — Did You?</div>
                {[
                  "Get manager approval if event has a fee",
                  "Pack TSM Roofing business cards",
                  "Confirm dress code compliance",
                  "Review current promos & service areas",
                  "Identify 3–5 target contacts",
                ].map((t, i) => (
                  <div key={i} className="flex gap-2 items-start text-sm text-muted-foreground mb-1.5">
                    <span className="text-green-600 shrink-0">☐</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs font-semibold mb-3 pb-2 border-b">AFTER — Did You?</div>
                {[
                  "Log all contacts in CRM (within 24 hrs)",
                  "Send follow-up messages (within 48 hrs)",
                  "Call warm leads (within 1 week)",
                  "Submit Post-Event Report to manager",
                  "Note any expense receipts if applicable",
                ].map((t, i) => (
                  <div key={i} className="flex gap-2 items-start text-sm text-muted-foreground mb-1.5">
                    <span className="text-green-600 shrink-0">☐</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
