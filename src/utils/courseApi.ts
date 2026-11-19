import { GolfCourse } from '../types';
import { BUILT_IN_COURSES } from './courseDatabase';

const API_KEY_STORAGE_KEY = 'banker_golf_course_api_key';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
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

/**
 * Live search across built-in courses + optional Golf Course API integration
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

  // 2. If API Key is present, query Golf Course API (RapidAPI / Golf-Course-API)
  if (apiKey && cleanQuery.length >= 3) {
    try {
      const response = await fetch(
        `https://golf-course-api.p.rapidapi.com/courses?search=${encodeURIComponent(cleanQuery)}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'golf-course-api.p.rapidapi.com',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.courses) && data.courses.length > 0) {
          const apiCourses: GolfCourse[] = data.courses.map((item: any, idx: number) => {
            const tees = (item.tees || []).map((t: any) => ({
              name: t.name || `Tee ${idx + 1}`,
              rating: t.rating || 72.0,
              slope: t.slope || 125,
              yardage: t.yardage || 6500,
              pars: t.pars || [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 3, 5, 4, 4],
              handicapRanks:
                t.handicapRanks || [7, 3, 15, 1, 11, 5, 17, 9, 13, 8, 16, 2, 10, 6, 18, 4, 14, 12],
            }));

            return {
              id: `api_${item.id || idx}`,
              name: item.name || cleanQuery,
              location: `${item.city || ''}, ${item.state || ''} ${item.country || ''}`.trim(),
              clubName: item.club_name || item.name,
              numHoles: item.num_holes || 18,
              tees: tees.length > 0 ? tees : generateSmartCourse(item.name || cleanQuery).tees,
            };
          });

          // Combine with local matches avoiding duplicates by name
          const existingNames = new Set(localMatches.map((c) => c.name.toLowerCase()));
          const filteredApi = apiCourses.filter((c) => !existingNames.has(c.name.toLowerCase()));
          return [...localMatches, ...filteredApi];
        }
      }
    } catch (err) {
      console.warn('Golf Course API fetch error (falling back to built-in):', err);
    }
  }

  return localMatches;
}
