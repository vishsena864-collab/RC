// Public, safe-for-work categories used on marketing pages and in the chat picker.
// The gated adult category is deliberately NOT here: it never appears on indexable pages.
//
// `avatar` is the number of the illustrated avatar (public/art/avatars/a<N>.webp) shown on the topic card,
// `accent` tints that card.

export const categories = [
  { id: "general", icon: "💬", accent: "#7c6cff", avatar: 5 },
  { id: "music", icon: "🎵", accent: "#ec4899", avatar: 4 },
  { id: "bored", icon: "🥱", accent: "#f59e0b", avatar: 8 },
  { id: "gaming", icon: "🎮", accent: "#22c55e", avatar: 6 },
  { id: "movies", icon: "🎬", accent: "#ef4444", avatar: 3 },
  { id: "tech", icon: "💻", accent: "#06b6d4", avatar: 2 },
  { id: "sports", icon: "⚽", accent: "#3b82f6", avatar: 7 },
  { id: "art", icon: "🎨", accent: "#a855f7", avatar: 1 },
];

export const categoryIds = categories.map((c) => c.id);

export function isCategory(id) {
  return categoryIds.includes(id);
}

export function getCategory(id) {
  return categories.find((c) => c.id === id);
}
