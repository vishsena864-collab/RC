// English-only legal text. These are working drafts, not legal advice: have a lawyer review them for
// your country before you go live, and fill in the operator details in site.js / .env.

export const legal = {
  terms: {
    updated: "Draft v1",
    sections: [
      {
        h: "1. Who can use {name}",
        p: [
          "{name} is only for adults. You must be at least 18 years old, or the age of majority where you live if that is higher. By using the service you confirm that you meet this requirement.",
          "We may ask you to verify your age, and we may block anyone we believe is under 18.",
        ],
      },
      {
        h: "2. What the service is",
        p: [
          "{name} connects you at random with other users for anonymous text conversations. We do not control what other users say and we cannot guarantee who you will be matched with.",
        ],
      },
      {
        h: "3. Rules",
        p: [
          "You agree not to: harass, threaten or abuse others; share hate speech; post sexual content involving anyone under 18 (this is illegal and will be reported to the authorities); share other people's private information; scam or advertise; use bots, scripts or automated tools; try to evade a block; or break any law.",
        ],
      },
      {
        h: "4. Reports and blocks",
        p: [
          "Other users can report you. We may keep the most recent messages of a reported chat to review the report. We may temporarily or permanently block users, with or without notice, to keep the service safe.",
        ],
      },
      {
        h: "5. Your responsibility",
        p: [
          "You are responsible for what you write. Do not share personal information such as your full name, address, phone number, workplace or school. Anything you tell a stranger may be copied or shared by them.",
        ],
      },
      {
        h: "6. No guarantees",
        p: [
          "The service is provided as it is and as available. We do not promise it will always work or be free of errors, and to the extent the law allows we are not liable for the behaviour of users or for losses arising from your use of the service.",
        ],
      },
      {
        h: "7. Changes and contact",
        p: ["We may update these terms. Continuing to use the service after a change means you accept it. Questions: {email}."],
      },
    ],
  },

  privacy: {
    updated: "Draft v1",
    sections: [
      {
        h: "What we collect",
        p: [
          "No account, name or email is needed. Your IP address is necessarily visible to the hosting network when you connect, but we do not display it to other chat users, use it for geolocation, or write raw IP addresses to application-level report and ban files. For abuse prevention, the chat server derives an opaque keyed identifier from the connection address. Our network and hosting providers may independently retain connection metadata.",
        ],
      },
      {
        h: "Your chats",
        p: [
          "Text messages are relayed by the server rather than connecting participants directly. Recent messages are kept temporarily in server memory for abuse reporting. If a user reports a chat, up to the last 12 messages of that conversation and the report reason may be saved for safety review. Movie game answers and clues are checked on the server; the results are not saved to a user profile.",
        ],
      },
      {
        h: "What we store and for how long",
        p: [
          "Reports, including short chat excerpts and opaque anti-abuse identifiers, are automatically purged after seven days by default. Temporary bans are retained until they expire; they use keyed fingerprints, not plaintext IPs. Matching preferences are stored in your browser and transmitted to the service when you seek a match. Backups, hosting logs and legal preservation requests may require separate retention controls.",
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "We do not sell personal data. We may share information with law enforcement when the law requires it or to protect someone from harm. Our hosting and network providers process traffic on our behalf.",
        ],
      },
      {
        h: "Cookies",
        p: ["We do not use advertising or tracking cookies. If this changes, for example when ads are added, we will ask for consent where the law requires it."],
      },
      {
        h: "Your rights",
        p: ["Depending on where you live you may have the right to access or delete data about you. Contact us at {email} with the approximate time of an interaction and any report reference. Please do not email your IP address or private chat messages unless necessary."],
      },
      {
        h: "Children",
        p: ["{name} is not for anyone under 18. If we learn that a minor has used the service, we block them and delete related data where we can."],
      },
    ],
  },
};
