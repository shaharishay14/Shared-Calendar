import { openDatabaseSync } from 'expo-sqlite';
import { createClient } from '@supabase/supabase-js';

// Configure these via env or app config
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export let supabase = null;
if (SUPABASE_ENABLED) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

// For demo, single shared household/team id. Replace with per-user/team management.
export const HOUSEHOLD_ID = process.env.EXPO_PUBLIC_HOUSEHOLD_ID || 'demo-shared-household';

let databaseInstance;

function getDatabase() {
  if (!databaseInstance) {
    databaseInstance = openDatabaseSync('events.db');
  }
  return databaseInstance;
}

export async function initializeDatabase() {
  const db = getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      endDate TEXT,
      location TEXT,
      lat REAL,
      lng REAL,
      category TEXT,
      createdBy TEXT
    );
  `);
  // Best-effort migration for older installs where endDate column doesn't exist
  try {
    await db.execAsync(`ALTER TABLE events ADD COLUMN endDate TEXT;`);
  } catch (e) {
    // ignore if column already exists
  }
  try {
    await db.execAsync(`ALTER TABLE events ADD COLUMN location TEXT;`);
  } catch (e) {
    // ignore if column already exists
  }
  try {
    await db.execAsync(`ALTER TABLE events ADD COLUMN lat REAL;`);
  } catch (e) {
    // ignore if column already exists
  }
  try {
    await db.execAsync(`ALTER TABLE events ADD COLUMN lng REAL;`);
  } catch (e) {
    // ignore if column already exists
  }
  // Ensure Supabase table exists: you should create this in the Supabase dashboard
  // Table: events (id bigint PK, title text, start timestamptz, end timestamptz, category text, createdBy text, householdId text, updatedAt timestamptz)
}

export async function insertEvent({ title, dateIsoString, endDateIsoString, category, location, lat, lng, createdBy }, onSuccess, onError) {
  try {
    const db = getDatabase();
    await db.runAsync(
      'INSERT INTO events (title, date, endDate, location, lat, lng, category, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
      [title, dateIsoString, endDateIsoString || null, location || null, lat ?? null, lng ?? null, category, createdBy]
    );

    // Supabase write
    if (SUPABASE_ENABLED) {
      const { error } = await supabase.from('events').insert({
        title,
        start: dateIsoString,
        end: endDateIsoString || null,
        location: location || null,
        lat: lat ?? null,
        lng: lng ?? null,
        category,
        createdBy,
        householdId: HOUSEHOLD_ID,
        updatedAt: new Date().toISOString(),
      });
      if (error) {
        console.warn('Supabase insert error:', error.message);
      }
    }
    if (onSuccess) onSuccess();
  } catch (error) {
    if (onError) onError(error);
  }
}

export async function getAllEventsSorted(onResult, onError) {
  try {
    // Prefer Supabase; fallback to local
    if (SUPABASE_ENABLED) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('householdId', HOUSEHOLD_ID)
        .order('start', { ascending: true });
      if (error) throw error;
      const supaRows = (data || []).map((r) => ({
        id: r.id,
        title: r.title,
        date: r.start,
        endDate: r.end,
        location: r.location,
        lat: r.lat,
        lng: r.lng,
        category: r.category,
        createdBy: r.createdBy,
      }));
      // If Supabase returned rows, prefer them. If not, fall back to local cache
      if (supaRows.length > 0) {
        onResult(supaRows);
        return;
      }
      // Fall through to local
    }
    // Local fetch (either SUPABASE not enabled, or cloud returned no rows)
    const db = getDatabase();
    const rows = await db.getAllAsync('SELECT * FROM events ORDER BY date ASC;');
    onResult(rows || []);
    return;
  } catch (error) {
    try {
      const db = getDatabase();
      const rows = await db.getAllAsync('SELECT * FROM events ORDER BY date ASC;');
      onResult(rows || []);
    } catch (e2) {
      if (onError) onError(error);
    }
  }
}

export async function updateEvent({ id, title, dateIsoString, endDateIsoString, category, location, lat, lng, createdBy }, onSuccess, onError) {
  try {
    const db = getDatabase();
    await db.runAsync(
      'UPDATE events SET title = ?, date = ?, endDate = ?, location = ?, lat = ?, lng = ?, category = ?, createdBy = ? WHERE id = ?;',
      [title, dateIsoString, endDateIsoString || null, location || null, lat ?? null, lng ?? null, category, createdBy, id]
    );

    if (SUPABASE_ENABLED) {
      const { error } = await supabase
        .from('events')
        .update({
          title,
          start: dateIsoString,
          end: endDateIsoString || null,
          location: location || null,
          lat: lat ?? null,
          lng: lng ?? null,
          category,
          createdBy,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) {
        console.warn('Supabase update error:', error.message);
      }
    }
    if (onSuccess) onSuccess();
  } catch (error) {
    if (onError) onError(error);
  }
}

export async function deleteEvent(id, onSuccess, onError) {
  try {
    const db = getDatabase();
    await db.runAsync('DELETE FROM events WHERE id = ?;', [id]);
    if (SUPABASE_ENABLED) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete error:', error.message);
      }
    }
    if (onSuccess) onSuccess();
  } catch (error) {
    if (onError) onError(error);
  }
}


