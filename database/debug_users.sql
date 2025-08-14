-- Run these queries in your Supabase SQL editor to see your current data

-- 1. Check authenticated users
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
ORDER BY created_at;

-- 2. Check household devices (who's registered)
SELECT household_id, user_id, device_id, inserted_at 
FROM household_devices 
ORDER BY inserted_at;

-- 3. Check current household members (probably empty)
SELECT * FROM household_members 
ORDER BY "joinedAt";

-- 4. Get user emails with their IDs for reference
SELECT u.id, u.email, hd.household_id, hd.device_id
FROM auth.users u
JOIN household_devices hd ON u.id = hd.user_id
ORDER BY u.email;
