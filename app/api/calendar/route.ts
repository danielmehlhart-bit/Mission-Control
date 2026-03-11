import { NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/google-calendar";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export type LinkedPerson = { id: string; name: string; email: string };
export type LinkedProject = { id: string; name: string; color: string };

export type EnrichedCalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees: string[];
  location?: string;
  description?: string;
  linkedPeople: LinkedPerson[];
  linkedProject?: LinkedProject;
};

export async function GET() {
  // If credentials not configured → return gracefully disabled
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ events: [], disabled: true });
  }

  try {
    const [rawEvents, db] = await Promise.all([
      getUpcomingEvents(60),
      Promise.resolve(getDb()),
    ]);

    // Load all people with email
    const people = db
      .prepare("SELECT id, name, email, project FROM people WHERE email IS NOT NULL AND email != ''")
      .all() as { id: string; name: string; email: string; project?: string }[];

    // Load all projects for linking
    const projects = db
      .prepare("SELECT id, name, color FROM projects")
      .all() as { id: string; name: string; color: string }[];

    const emailToPerson = new Map(people.map(p => [p.email.toLowerCase(), p]));
    const projectsByName = new Map(projects.map(p => [p.name.toLowerCase(), p]));

    const enriched: EnrichedCalendarEvent[] = rawEvents.map(event => {
      const linkedPeople: LinkedPerson[] = [];

      for (const attendeeEmail of event.attendees) {
        const person = emailToPerson.get(attendeeEmail.toLowerCase());
        if (person) {
          linkedPeople.push({ id: person.id, name: person.name, email: person.email });
        }
      }

      // Find linked project via people's project field
      let linkedProject: LinkedProject | undefined;
      for (const lp of linkedPeople) {
        const person = emailToPerson.get(lp.email.toLowerCase());
        if (person?.project) {
          const proj = projectsByName.get(person.project.toLowerCase());
          if (proj) {
            linkedProject = proj;
            break;
          }
        }
      }

      return { ...event, linkedPeople, linkedProject };
    });

    return NextResponse.json({ events: enriched, disabled: false });
  } catch (err) {
    console.error("Calendar API error:", err);
    return NextResponse.json(
      { events: [], disabled: false, error: String(err) },
      { status: 500 }
    );
  }
}
