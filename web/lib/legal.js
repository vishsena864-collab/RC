// English-only legal text. These are carefully written drafts, not legal advice: have a lawyer review them for the
// countries you serve before relying on them, and set NEXT_PUBLIC_CONTACT_EMAIL so people can reach you.
//
// Each section has a heading `h` and blocks: a string is a paragraph, { list: [...] } a bullet list and
// { table: { head: [...], rows: [[...]] } } a table. {name}, {contact} and {site} are filled in by LegalPage.

export const LEGAL_UPDATED = "Last updated: 25 October 2026";

export const legal = {
  terms: {
    sections: [
      {
        h: "1. Who can use {name}",
        p: [
          "{name} is only for adults. You must be at least 18 years old, or the age of majority where you live if that is higher. By using any part of the service, including random chat, Underground FM, the Poem Wall and the Graffiti Wall, you confirm that you meet this requirement.",
          "We may ask you to confirm your age, and we may block anyone we believe is under 18.",
        ],
      },
      {
        h: "2. What the service is",
        p: [
          "{name} lets you talk anonymously with strangers, listen to music together in Underground FM rooms, and post to public creative walls. We do not control what other people say or post, and we cannot guarantee who you will meet.",
          "The service is free. Features may change, pause or end at any time.",
        ],
      },
      {
        h: "3. Rules everywhere on {name}",
        p: [
          "You agree not to:",
          {
            list: [
              "harass, threaten, bully or abuse anyone, or post hate speech;",
              "post sexual content involving anyone under 18 (this is illegal and will be reported to the authorities) or any sexual content in spaces not meant for it;",
              "share anyone's private information, including your own, such as full names, addresses, phone numbers, workplaces or schools;",
              "scam, spam, advertise, or post links to get around our link filter;",
              "use bots, scripts or automated tools, or try to overload, probe or break the service;",
              "evade a mute, report, block or ban;",
              "post anything you do not have the right to share, or break any law.",
            ],
          },
        ],
      },
      {
        h: "4. Underground FM rooms",
        p: [
          "Music in Underground FM is streamed directly from Audius, an independent music platform, to your device. {name} does not host, copy or sell music. All rights in the songs belong to the artists and rights holders who uploaded them to Audius, and Audius's own terms apply to its catalogue.",
          "The person holding the controller seat chooses songs and lights for the room. The seat rotates and can pass to anyone in the room. Do not use song requests, the chat or the controls to spam or disrupt the room.",
          "If you believe a song infringes your rights, report it to Audius, which hosts it, and let us know at {contact} so we can stop featuring it.",
        ],
      },
      {
        h: "5. What you post on the walls",
        p: [
          "Poems and artwork you publish on the Poem Wall or Graffiti Wall are public. You keep any rights you have in them. By posting, you give {name} a free, worldwide, non-exclusive licence to store, display and share them on the service and in its weekly winner archive, for as long as they remain on the service.",
          "Only post work you made yourself or have the right to share. We may remove any post at any time, and posts that receive several reports are hidden automatically.",
        ],
      },
      {
        h: "6. Reports, mutes and bans",
        p: [
          "You can report people in random chat and Underground FM rooms, and report wall posts. You can also mute someone in a room, which hides their messages on your device only.",
          "When you report someone we save a short excerpt of their recent messages so a person can review it. We may temporarily or permanently block anyone, with or without notice, to keep the service safe. Several reports from different people can trigger an automatic temporary ban.",
        ],
      },
      {
        h: "7. Your responsibility",
        p: [
          "You are responsible for what you write, play and post. Anything you tell a stranger may be copied or shared by them, so think before you share.",
        ],
      },
      {
        h: "8. No guarantees",
        p: [
          "The service is provided as it is and as available. We do not promise it will always work, be free of errors, or keep any room, message or post. To the extent the law allows, we are not liable for the behaviour of other users, for third-party services such as Audius, or for losses arising from your use of the service. Nothing in these terms limits rights you have under consumer law that cannot be excluded.",
        ],
      },
      {
        h: "9. Changes and contact",
        p: [
          "We may update these terms. The date at the top shows the latest version, and continuing to use the service after a change means you accept it. Questions: {contact}.",
        ],
      },
    ],
  },

  privacy: {
    sections: [
      {
        h: "The short version",
        p: [
          {
            list: [
              "No accounts, no real names, no email sign-up.",
              "No advertising, no analytics trackers, no selling or renting of personal data.",
              "Chats are relayed live and kept only in memory, except a short excerpt when someone files a report.",
              "Music streams straight from Audius to your device; the light show analyses songs inside your browser.",
              "Wall posts are public on purpose and are mostly deleted at each weekly reset.",
            ],
          },
          "The rest of this page explains each part in detail. Our Cookie Policy lists exactly what is stored in your browser.",
        ],
      },
      {
        h: "Who is responsible",
        p: [
          "{name} ({site}) is run by its operator, who decides how your information is used (the \"controller\" under laws such as the GDPR). You can reach us at {contact}.",
        ],
      },
      {
        h: "What we collect and why",
        p: [
          {
            table: {
              head: ["Feature", "What is processed", "Why"],
              rows: [
                ["Every connection", "Your IP address is visible to our hosting providers when you connect. Our realtime server turns it into an opaque keyed code (an HMAC) and does not store, show or log the raw address.", "To run the service and to enforce bans and rate limits."],
                ["Random chat", "Messages you send, relayed to your chat partner and kept briefly in server memory. Your matching preferences (your gender, who you would like to meet, topic and interests), used only to find a match and not stored on the server.", "To deliver the chat and to make reports possible."],
                ["Underground FM", "A random stage name and colour made from a random key your browser creates, the room you are in, room chat lines (the last 40 per room, in memory), reactions, votes, song requests and typing signals.", "To run shared rooms in real time."],
                ["Light show", "Your browser downloads the current song from Audius and analyses it on your device. Only a small summary (tempo and song sections, no audio) is sent to the room.", "To sync the lights to the music for everyone."],
                ["Reports", "The reason you choose, an optional note, the opaque code of the person reported, and up to 12 of their recent messages.", "So a person can review abuse and keep the service safe."],
                ["Poem and Graffiti Walls", "What you publish, your chosen artist tag, likes and reports, a random anonymous ID stored in your browser, and keyed codes used for rate limits.", "To publish the walls, count likes fairly and stop abuse."],
              ],
            },
          },
          "We do not use your information for advertising, profiling or automated decisions with legal effects.",
        ],
      },
      {
        h: "Legal bases",
        p: [
          "Where laws such as the GDPR or UK GDPR apply, we rely on: performing the service you ask for (relaying chats, running rooms, publishing your posts); our legitimate interests in keeping the service safe, secure and working (rate limits, reports, bans); and legal obligations where they apply. We do not currently rely on consent for anything, because we do not use optional cookies or trackers. If that changes we will ask first.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          {
            table: {
              head: ["Information", "Kept for"],
              rows: [
                ["Random chat and room chat messages", "Only in server memory while the chat or room is active; gone when it ends or the server restarts."],
                ["Report excerpts and notes", "Deleted automatically after 7 days."],
                ["Ban records (opaque codes only)", "Until the ban expires."],
                ["Wall posts, likes and reports", "Until the weekly reset (Monday, UTC). The top five posts per wall each week are kept in the public winner archive."],
                ["Data in your browser", "Until you clear it, or until you close the tab for per-tab data. See the Cookie Policy."],
                ["Hosting provider logs", "Set by those providers, usually days to weeks."],
              ],
            },
          },
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "We use these service providers to run {name}. They process data for us under their own security and privacy commitments:",
          {
            list: [
              "Vercel: hosts the website.",
              "Railway: hosts the realtime chat and Underground FM server.",
              "Supabase: hosts the database behind the Poem and Graffiti Walls.",
            ],
          },
          "Audius is an independent service. When you play music, your browser connects to Audius directly, so Audius receives your IP address and the songs you stream under its own privacy policy. Song artwork is also loaded from Audius.",
          "We may disclose information if the law requires it or to protect someone from serious harm, for example reporting child sexual abuse material to the authorities. We never sell or rent personal data.",
        ],
      },
      {
        h: "International transfers",
        p: [
          "Our providers may process data in countries other than yours, including the United States. Where the law requires it, we rely on the safeguards these providers offer, such as standard contractual clauses.",
        ],
      },
      {
        h: "How we protect it",
        p: [
          "Connections are encrypted (HTTPS and secure WebSockets). We keep raw IP addresses out of our application data, strip control characters and links from messages, rate-limit every room action, and restrict what pages may load through a strict Content Security Policy. Reports and bans are stored with restricted file permissions and expire automatically. No method is perfect, so please never share anything you would not want a stranger to keep.",
        ],
      },
      {
        h: "Your rights",
        p: [
          "Depending on where you live, you may have the right to access, correct, delete or object to the use of your personal data, to restrict it, to receive a copy, and to complain to your local data protection authority.",
          "Because {name} has no accounts, we usually cannot link data to you. To make a request, contact us at {contact} with the approximate time and place of the interaction (for example the room and your stage name) and any report details. You can delete everything stored in your browser yourself at any time by clearing this site's data.",
        ],
      },
      {
        h: "Children",
        p: ["{name} is not for anyone under 18. If we learn that a minor has used the service, we block them and delete related data where we can."],
      },
      {
        h: "Changes",
        p: ["We will update this page when our practices change and change the date at the top. Significant changes will be highlighted on the site."],
      },
    ],
  },

  cookies: {
    sections: [
      {
        h: "No tracking cookies",
        p: [
          "{name} does not set any advertising, analytics or tracking cookies, and does not let third parties track you across sites. That is why you do not see a cookie banner: there is nothing optional to agree to.",
          "Our hosting provider may set a short-lived, strictly necessary security cookie if it needs to check that a visitor is not a bot during an attack. It is not used for tracking.",
        ],
      },
      {
        h: "What we store in your browser",
        p: [
          "Some features remember small settings in your browser's local or session storage. This data stays on your device; nothing here is read by us unless a feature sends it to our servers as described in the Privacy Policy.",
          {
            table: {
              head: ["Name", "Type", "What it does", "How long"],
              rows: [
                ["chat.settings.v1", "Local storage", "Your random chat preferences: your gender, who you would like to meet, topic and interests.", "Until you clear site data"],
                ["chatspark.wall.anon.v1", "Local storage", "A random anonymous ID so the walls can recognise your own posts and stop double likes.", "Until you clear site data"],
                ["fm:lights-off", "Local storage", "Remembers if you switched the Underground FM light show off.", "Until you clear site data"],
                ["fm:key", "Session storage", "A random key so refreshing keeps your stage name and, if you are the controller, your seat.", "Until you close the tab"],
                ["fm:room", "Session storage", "The room and song you were in, so a refresh or reconnect puts you back in the same room.", "Until you close the tab or leave the room"],
              ],
            },
          },
          "These are strictly necessary for the features you choose to use, so the law does not require consent for them.",
        ],
      },
      {
        h: "Third parties",
        p: [
          "When you play music in Underground FM, songs and artwork load directly from Audius. Audius may use its own storage or cookies under its own policies. Fonts and icons are served from our own site, not from third-party font services.",
        ],
      },
      {
        h: "How to control it",
        p: [
          "You can clear or block site data in your browser settings at any time. If you block storage, {name} still works, but it will forget your preferences and a refresh will start you in a new room.",
          "If we ever add optional cookies, for example for advertising, we will ask for your consent first where the law requires it and update this page.",
          "Questions: {contact}.",
        ],
      },
    ],
  },
};
