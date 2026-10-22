export const SPARK_GOAL = 6;

function hashRoom(value = "") {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function sparkIdentity(roomId, promptCount) {
  const hash = hashRoom(roomId);
  return {
    number: 100 + (hash % 900),
    palette: hash % 5,
    promptIndex: promptCount ? hash % promptCount : 0,
  };
}
