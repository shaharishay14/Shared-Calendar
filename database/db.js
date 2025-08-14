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
  // Ensure Supabase tables exist: you should create these in the Supabase dashboard
  // Table: events (id bigint PK, title text, start timestamptz, end timestamptz, category text, createdBy text, householdId text, updatedAt timestamptz)
  // Table: household_members (id bigint PK, householdId text, userId text, name text, email text, avatar text, role text, joinedAt timestamptz, isActive boolean)
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

// Household Members Functions
export async function saveHouseholdMember({ name, email, avatar, role = 'member', userId }) {
  try {
    if (!SUPABASE_ENABLED) {
      console.warn('Supabase not enabled, cannot save household member');
      return { success: false, error: 'Database not available' };
    }

    // Get current authenticated user if no userId provided
    let memberUserId = userId;
    if (!memberUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      memberUserId = user.id;
    }

    const { data, error } = await supabase.from('household_members').upsert({
      householdId: HOUSEHOLD_ID,
      userId: memberUserId,
      name,
      email: email || '',
      avatar: avatar || null,
      role,
      joinedAt: new Date().toISOString(),
      isActive: true
    }, {
      onConflict: 'householdId,userId'
    }).select();

    if (error) {
      console.error('Error saving household member:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] };
  } catch (error) {
    console.error('Error saving household member:', error);
    return { success: false, error: error.message };
  }
}

export async function getHouseholdMembers() {
  try {
    if (!SUPABASE_ENABLED) {
      console.warn('Supabase not enabled, returning mock household members');
      return {
        success: true,
        data: [
          {
            id: 1,
            userId: 'demo_user_1',
            name: 'You',
            email: 'you@example.com',
            avatar: null,
            role: 'admin',
            joinedAt: new Date().toISOString(),
            isActive: true
          }
        ]
      };
    }

    const { data, error } = await supabase
      .from('household_members')
      .select('*')
      .eq('householdId', HOUSEHOLD_ID)
      .eq('isActive', true)
      .order('joinedAt', { ascending: true });

    if (error) {
      console.error('Error fetching household members:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching household members:', error);
    return { success: false, error: error.message };
  }
}

export async function removeHouseholdMember(userId) {
  try {
    if (!SUPABASE_ENABLED) {
      console.warn('Supabase not enabled, cannot remove household member');
      return { success: false, error: 'Database not available' };
    }

    const { error } = await supabase
      .from('household_members')
      .update({ isActive: false })
      .eq('householdId', HOUSEHOLD_ID)
      .eq('userId', userId);

    if (error) {
      console.error('Error removing household member:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing household member:', error);
    return { success: false, error: error.message };
  }
}

export async function inviteHouseholdMember(email, role = 'member') {
  try {
    if (!SUPABASE_ENABLED) {
      console.warn('Supabase not enabled, cannot invite household member');
      return { success: false, error: 'Database not available' };
    }

    // Generate a temporary userId for the invite
    const inviteUserId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase.from('household_members').insert({
      householdId: HOUSEHOLD_ID,
      userId: inviteUserId,
      name: email.split('@')[0], // Use email prefix as temporary name
      email,
      avatar: null,
      role,
      joinedAt: new Date().toISOString(),
      isActive: false // Will be activated when they accept
    }).select();

    if (error) {
      console.error('Error inviting household member:', error);
      return { success: false, error: error.message };
    }

    // In a real app, you would send an email invitation here
    console.log('Invitation created for:', email);
    
    return { success: true, data: data?.[0] };
  } catch (error) {
    console.error('Error inviting household member:', error);
    return { success: false, error: error.message };
  }
}


