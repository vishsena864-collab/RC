// Phase 3: reviewed English-only acquisition copy.
// This deliberately does not synthesize translations or create extra indexable URLs.
export const EN_TOPIC_SEO = {
  general: {
    title: "Free Random Chat With Strangers | ChatSpark",
    description: "Start a free, anonymous text chat with a stranger. No account or camera needed. Pick a topic and skip anytime. ChatSpark is for adults 18+.",
    heading: "Ways to start a random conversation",
    introduction: "Not sure what to say first? These are conversation starters, not automated messages. You choose what to send.",
    prompts: ["What's one small thing that made your day better?", "If you could restart a hobby tomorrow, what would it be?", "What's a harmless opinion you will defend forever?"]
  },
  music: {
    title: "Music Chat With Strangers | ChatSpark",
    description: "Chat about artists, albums and favorite songs with a random stranger. Try interest tags or explore Underground FM's shared music rooms. Adults 18+.",
    heading: "Music conversations worth starting",
    introduction: "Start with a real question about someone else's taste, then see where the conversation goes.",
    prompts: ["Which song deserves more attention than it gets?", "What album would you play for someone hearing your favorite genre for the first time?", "Which concert would you travel anywhere to see?"],
    links: [{href:"/underground",text:"Explore Underground FM's listening rooms"}]
  },
  bored: {
    title: "Bored? Try Random Text Chat | ChatSpark",
    description: "Bored online? Meet a random stranger in a free, text-only chat. Share a question, try a two-person game, or skip to a new match. Adults 18+.",
    heading: "Three things to say when you're bored",
    introduction: "Try a quick opening line instead of waiting for the perfect conversation.",
    prompts: ["Name three things within reach; I'll invent a story using them.", "Would you rather visit the past for one day or the future for one hour?", "What's the most surprising good recommendation you have received?"]
  },
  gaming: {
    title: "Gaming Chat With Strangers | ChatSpark",
    description: "Meet strangers who enjoy gaming. Talk about favorite games, tricky levels and new releases in a free, text-only chat. No signup. Adults 18+.",
    heading: "Gaming icebreakers",
    introduction: "You don't need to be on the same console or platform to talk games.",
    prompts: ["Which game would you love to experience again for the first time?", "What's the most memorable boss fight you've beaten?", "Which underrated multiplayer game should more people try?"]
  },
  movies: {
    title: "Movies & TV Chat With Strangers | ChatSpark",
    description: "Discuss movies, TV series, plot twists and recommendations with a random stranger. Text only, no camera or signup. ChatSpark is for adults 18+.",
    heading: "Start a movie or TV conversation",
    introduction: "Keep spoilers optional and learn what another stranger likes to watch.",
    prompts: ["What film would you recommend without revealing anything about its plot?", "Which TV character changed your opinion halfway through a series?", "What movie ending do you still think about?"]
  },
  tech: {
    title: "Tech Chat With Strangers | ChatSpark",
    description: "Talk gadgets, coding, AI and technology with a random stranger. Free anonymous text chat with optional interest tags. Adults 18+.",
    heading: "Tech questions to break the ice",
    introduction: "Share an idea, ask about a project, or compare how technology actually fits into daily life.",
    prompts: ["What's one piece of technology you wish worked differently?", "Which tool saved you the most time this year?", "What small project would you build with a weekend and no budget?"]
  },
  sports: {
    title: "Sports Chat With Strangers | ChatSpark",
    description: "Meet strangers to talk teams, matches, training and memorable sporting moments. Free text chat without accounts or cameras. Adults 18+.",
    heading: "Start talking sport",
    introduction: "Ask about a shared interest before assuming someone follows the same league.",
    prompts: ["Which sporting moment do you wish you could see live?", "What rule would you change in your favorite sport?", "Which underdog performance still impresses you?"]
  },
  art: {
    title: "Art Chat With Strangers | ChatSpark",
    description: "Chat about drawing, design, writing and creative ideas with strangers. Explore ChatSpark's graffiti and poetry walls. Free text chat for adults 18+.",
    heading: "Creative conversation starters",
    introduction: "Talk about what you're making, or explore the creative walls together.",
    prompts: ["What artwork made you stop and look twice?", "Do you find it easier to start or finish a creative project?", "What everyday object would you turn into an illustration?"],
    links: [
      {href:"/graffiti-wall",text:"Draw in the Graffiti Wall studio"},
      {href:"/poem-wall",text:"Write on the Poem Wall"}
    ]
  }
};

export const EN_EXPERIENCE_SEO = {
  underground: {
    title: "Listen to Music With Strangers | Underground FM",
    description: "Explore Underground FM: a shared music room where strangers take turns as controller, select tracks and react to the vibe. Text-first. Adults 18+.",
    heading: "Listen to music with strangers",
    intro: "Join a shared listening room, discover songs and shape the vibe with other listeners. The active controller chooses what plays; available streams depend on the music provider.",
  },
  "graffiti-wall": {
    title: "Online Graffiti Wall & Art Battles | ChatSpark",
    description: "Paint online graffiti with spray, neon and drawing tools. Join timed art challenges, vote on creations or publish to the weekly wall. Adults 18+.",
    heading: "An online graffiti wall for creative strangers",
    intro: "Paint with browser-based graffiti tools, enter a timed room with an automatic prompt, or publish an original artwork to the weekly wall.",
  },
  "poem-wall": {
    title: "Online Poetry Writing Challenge | ChatSpark",
    description: "Write anonymous poetry, join seven-minute writing challenges and vote for original poems. Explore the weekly Poem Wall. Free for adults 18+.",
    heading: "Write poems and challenge other strangers",
    intro: "Leave an original poem on the weekly wall, or join a seven-minute room challenge with an automatic topic and a separate voting round.",
  }
};
for (const [slug, copy] of Object.entries({...EN_TOPIC_SEO,...EN_EXPERIENCE_SEO})) {
  if (copy.title.length >= 60 || copy.description.length >= 155) {
    throw new Error(`Phase 3 SEO copy over editorial length target for ${slug}: ${copy.title.length}/${copy.description.length}`);
  }
}
