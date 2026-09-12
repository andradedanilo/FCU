import { readFile } from 'node:fs/promises';
const files = ['README.md', 'AGENTS.md', 'PROJECT_BRIEF.md', ...['GAME','ARCHITECTURE','DATA','ROADMAP','RESEARCH'].map(n => `docs/${n}.md`)];
for (const file of files) {
  const bytes = await readFile(file);
  if (bytes.some(b => b > 127)) throw new Error(`Non-ASCII documentation: ${file}`);
}
console.log(`ASCII documentation: ${files.length} files passed`);
