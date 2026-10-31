// Derive small daily lab topics from the personal learning route without changing the source curriculum.
export function buildQueue(curriculum) {
  if (!Array.isArray(curriculum?.weeks)) throw new Error('Expected curriculum.weeks');
  const seen = new Set();
  const queue = [];
  for (const week of curriculum.weeks) {
    if (!Number.isInteger(week.number) || !Array.isArray(week.lessons)) throw new Error('Invalid week');
    for (const lesson of week.lessons) {
      if (typeof lesson !== 'string' || !/^phases\/\d\d-[a-z0-9-]+\/\d\d-[a-z0-9-]+$/.test(lesson)) {
        throw new Error('Unsafe or unknown lesson path');
      }
      if (seen.has(lesson)) continue;
      seen.add(lesson);
      const slug = 'w' + String(week.number).padStart(2, '0') + '-' + lesson.split('/').at(-1);
      queue.push({ slug, lesson, week: week.number, title: lesson.split('/').at(-1).replace(/^\d\d-/, '').replaceAll('-', ' ') });
    }
  }
  return queue;
}
export function selectNext(queue, isDone) {
  return queue.find(item => !isDone(item)) ?? null;
}
