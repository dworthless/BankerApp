import { GolfCourse, CourseTeeBox } from '../types';
import { BUILT_IN_COURSES } from './courseDatabase';

const API_KEY_STORAGE_KEY = 'banker_golf_course_api_key';

export function getStoredApiKey(): string {
  try {
    const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
    // Check environment variable if available
    const envKey = (import.meta as any).env?.VITE_GOLF_COURSE_API_KEY;
    return typeof envKey === 'string' ? envKey.trim() : '';
  } catch {
    return '';
  }
}

export function saveStoredApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  } catch (err) {
    console.error('Failed to save API key:', err);
  }
}

/**
 * Normalizes course name/location search
 */
function matchesQuery(course: GolfCourse, q: string): boolean {
  const term = q.toLowerCase().trim();
  if (!term) return true;
  return (
    course.name.toLowerCase().includes(term) ||
    course.location.toLowerCase().includes(term) ||
    (course.clubName && course.clubName.toLowerCase().includes(term)) ||
    false
  );
}

/**
 * Generate a smart fallback scorecard for any course name if not in database
 */
export function generateSmartCourse(name: string, location = 'Custom Course'): GolfCourse {
  const pars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 3, 5, 4, 4];
  const handicapRanks = [7, 3, 15, 1, 11, 5, 17, 9, 13, 8, 16, 2, 10, 6, 18, 4, 14, 12];

  return {
    id: `custom_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: name.trim(),
    location: location.trim(),
    numHoles: 18,
    tees: [
      {
        name: 'Blue / Tournament Tees',
        rating: 72.8,
        slope: 135,
        yardage: 6750,
        pars,
        handicapRanks,
      },
      {
        name: 'White / Regular Tees',
        rating: 70.4,
        slope: 128,
        yardage: 6250,
        pars,
        handicapRanks,
      },
      {
        name: 'Gold / Forward Tees',
        rating: 68.2,
        slope: 120,
        yardage: 5600,
        pars,
        handicapRanks,
      },
    ],
  };
}

// In-memory cache for fetched course details
const courseDetailsCache: Record<string, GolfCourse> = {};

/**
 * Fetch full scorecard details for a specific course ID from GolfCourseAPI
 */
export async function fetchGolfCourseDetails(courseId: string, apiKey: string): Promise<GolfCourse | null> {
  if (courseDetailsCache[courseId]) {
    return courseDetailsCache[courseId];
  }

  try {
    const res = await fetch(`https://api.golfcourseapi.com/v1/courses/${courseId}`, {
      headers: {
        Authorization: `Key ${apiKey}`,
      },
    });

    if (!res.ok) {
      console.warn(`GolfCourseAPI details returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const c = data.course;
    if (!c) return null;

    const allTees: CourseTeeBox[] = [];

    // Parse male tees
    if (c.tees?.male && Array.isArray(c.tees.male)) {
      c.tees.male.forEach((t: any) => {
        if (t.holes && Array.isArray(t.holes)) {
          allTees.push({
            name: `${t.tee_name || 'Men'}`,
            rating: t.course_rating,
            slope: t.slope_rating,
            yardage: t.total_yards,
            pars: t.holes.map((h: any) => h.par || 4),
            handicapRanks: t.holes.map((h: any, idx: number) => h.handicap || idx + 1),
          });
        }
      });
    }

    // Parse female tees
    if (c.tees?.female && Array.isArray(c.tees.female)) {
      c.tees.female.forEach((t: any) => {
        if (t.holes && Array.isArray(t.holes)) {
          allTees.push({
            name: `${t.tee_name || 'Women'}`,
            rating: t.course_rating,
            slope: t.slope_rating,
            yardage: t.total_yards,
            pars: t.holes.map((h: any) => h.par || 4),
            handicapRanks: t.holes.map((h: any, idx: number) => h.handicap || idx + 1),
          });
        }
      });
    }

    const fullCourse: GolfCourse = {
      id: c.id,
      name: c.course_name || c.club_name,
      clubName: c.club_name,
      location: `${c.location?.city || ''}, ${c.location?.state || ''} ${c.location?.country || ''}`.trim(),
      numHoles: 18,
      tees: allTees.length > 0 ? allTees : generateSmartCourse(c.course_name).tees,
    };

    courseDetailsCache[courseId] = fullCourse;
    return fullCourse;
  } catch (err) {
    console.error('Failed to fetch GolfCourseAPI details:', err);
    return null;
  }
}

/**
 * Live search across built-in courses + Golf Course API integration
 */
export async function searchGolfCourses(
  query: string,
  apiKeyOverride?: string
): Promise<GolfCourse[]> {
  const cleanQuery = query.trim();
  const apiKey = apiKeyOverride || getStoredApiKey();

  // 1. Search local offline database
  const localMatches = cleanQuery
    ? BUILT_IN_COURSES.filter((c) => matchesQuery(c, cleanQuery))
    : BUILT_IN_COURSES;

  // 2. Query Golf Course API (api.golfcourseapi.com)
  if (apiKey && cleanQuery.length >= 2) {
    try {
      const response = await fetch(
        `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(cleanQuery)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Key ${apiKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.courses) && data.courses.length > 0) {
          // Fetch detailed scorecards for the top 5 matches in parallel
          const topCourses = data.courses.slice(0, 5);
          const detailedPromises = topCourses.map(async (item: any) => {
            const detailed = await fetchGolfCourseDetails(item.id, apiKey);
            if (detailed) return detailed;

            return {
              id: item.id,
              name: item.course_name || item.club_name,
              clubName: item.club_name,
              location: `${item.location?.city || ''}, ${item.location?.state || ''} ${item.location?.country || ''}`.trim(),
              numHoles: 18,
              tees: generateSmartCourse(item.course_name || item.club_name).tees,
            };
          });

          const apiResults = await Promise.all(detailedPromises);
          const validApi = apiResults.filter(Boolean) as GolfCourse[];

          // Combine with local matches avoiding duplicates
          const seenIds = new Set<string>();
          const combined: GolfCourse[] = [];

          // Local matches first
          localMatches.forEach((c) => {
            seenIds.add(c.name.toLowerCase());
            combined.push(c);
          });

          // API matches
          validApi.forEach((c) => {
            if (!seenIds.has(c.name.toLowerCase())) {
              seenIds.add(c.name.toLowerCase());
              combined.push(c);
            }
          });

          return combined;
        }
      }
    } catch (err) {
      console.warn('GolfCourseAPI fetch error (falling back to built-in):', err);
    }
  }

  return localMatches;
}
