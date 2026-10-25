export const VERSION = 1;
export function emptyProgress() {
  return { version: VERSION, tasks: {}, notes: {}, hours: {}, evidence: {}, quizzes: {} };
}
export function taskIds(curriculum) {
  return new Set(curriculum.weeks.flatMap(w => w.tasks.map(t => t.id)));
}
export function validateProgress(value, curriculum) {
  if (!value || value.version !== VERSION) throw new Error('Expected a version 1 progress export.');
  const validTasks = taskIds(curriculum);
  const weeks = new Set(curriculum.weeks.map(w => String(w.number)));
  const lessons = new Set(curriculum.weeks.flatMap(w => w.lessons));
  const result = emptyProgress();
  for (const field of ['tasks', 'notes', 'hours', 'evidence', 'quizzes']) {
    const map = value[field];
    if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error(`Invalid ${field}.`);
    for (const [key, item] of Object.entries(map)) {
      if (field === 'tasks') {
        if (!validTasks.has(key) || typeof item !== 'boolean') throw new Error('Unknown task or invalid completion.');
      } else if (field === 'quizzes') {
        if (!lessons.has(key) || !item || !Number.isInteger(item.correct) || !Number.isInteger(item.total) || item.total < 1 || item.correct < 0 || item.correct > item.total) throw new Error('Invalid quiz score.');
        result.quizzes[key] = { correct: item.correct, total: item.total };
        continue;
      } else {
        if (!weeks.has(key)) throw new Error('Unknown week.');
        if (field === 'hours') {
          if (typeof item !== 'number' || !Number.isFinite(item) || item < 0 || item > 1000) throw new Error('Hours must be between 0 and 1000.');
        } else if (typeof item !== 'string' || item.length > 20000) throw new Error('Notes and evidence must be text under 20,000 characters.');
      }
      Object.defineProperty(result[field], key, { value: item, enumerable: true, writable: true, configurable: true });
    }
  }
  return result;
}
export function summarize(progress, curriculum) {
  const ids = taskIds(curriculum);
  const done = [...ids].filter(id => progress.tasks[id]).length;
  return { done, total: ids.size, percent: Math.round(done / ids.size * 100), hours: Object.values(progress.hours).reduce((a,b) => a+b, 0) };
}
