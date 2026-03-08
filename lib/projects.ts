/**
 * Matches a briefing filename against a project name using keyword extraction.
 * Returns true if the briefing likely belongs to the project.
 */
export function briefingMatchesProject(filename: string, projectName: string): boolean {
  const slug = filename.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  // Extract meaningful keywords (>3 chars) from project name
  const keywords = projectName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3);
  return keywords.some(kw => slug.includes(kw));
}
