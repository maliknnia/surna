import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import { avatarUrl, actionPhotoUrl } from './seedImages';

function uuid() { return crypto.randomUUID(); }

/** Remove any rows still pointing at @surna.app users (handles tables added after seed was written). */
async function purgeRemainingSeedUserReferences() {
  for (let pass = 0; pass < 30; pass++) {
    const { rows } = await db.execute<{ table_name: string; column_name: string }>(sql`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users' AND ccu.column_name = 'id'
        AND tc.table_name <> 'users'
    `);
    let changed = 0;
    for (const { table_name, column_name } of rows) {
      const del = await db.execute(sql.raw(
        `DELETE FROM "${table_name}" WHERE "${column_name}" IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`,
      ));
      changed += del.rowCount ?? 0;
      try {
        const upd = await db.execute(sql.raw(
          `UPDATE "${table_name}" SET "${column_name}" = NULL WHERE "${column_name}" IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`,
        ));
        changed += upd.rowCount ?? 0;
      } catch {
        /* column not nullable */
      }
    }
    if (changed === 0) break;
  }
}

const sports = ['Basketball', 'Soccer', 'Tennis', 'Boxing', 'MMA', 'Running', 'Swimming', 'CrossFit', 'Volleyball', 'Baseball'];
const cities = ['Los Angeles', 'New York', 'Chicago', 'Miami', 'Houston', 'Phoenix', 'Atlanta', 'Denver', 'Seattle', 'Portland'];

const cityCoords: Record<string, { lat: string; lng: string }> = {
  'Los Angeles': { lat: '34.0522', lng: '-118.2437' },
  'New York': { lat: '40.7128', lng: '-74.0060' },
  'Chicago': { lat: '41.8781', lng: '-87.6298' },
  'Miami': { lat: '25.7617', lng: '-80.1918' },
  'Houston': { lat: '29.7604', lng: '-95.3698' },
  'Phoenix': { lat: '33.4484', lng: '-112.0740' },
  'Atlanta': { lat: '33.7490', lng: '-84.3880' },
  'Denver': { lat: '39.7392', lng: '-104.9903' },
  'Seattle': { lat: '47.6062', lng: '-122.3321' },
  'Portland': { lat: '45.5152', lng: '-122.6784' },
};

const LOCAL_DEV_ID = 'local-dev-user';
const IMG = (id: string, w: number, h: number, extra = '') =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=85${extra}`;

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
];

/** Athletic portraits — diverse faces (50) */
const profileIds = [
  '1571011273684-49f92094c40d', '1594381898411-846e442a8b68', '1568602471122-7832951ccda0',
  '1619895862022-09128b1d002b', '1544005313-94ddf0286df2', '1531123415900-1b6cef8c6d5d',
  '1506794778202-cad84cf45f1d', '1534528741775-53994a69daeb', '1529629858514-ef1a0a1f8355',
  '1524504388940-b1c1722653e1', '1507003211169-0a1dd7228f2d', '1494790108377-be9c29b29330',
  '1552374196-c4e7ffc6e126', '1580489944761-15a19d654956', '1519345182560-3f2917c472ef',
  '1488426862026-3ee34a7d66df', '1539571696357-5a69c17a67c6', '1517841905240-472988babdf9',
  '1500648767791-00dcc994a43e', '1472099645785-5658abf4ff4e', '1438761681033-6461ffad8d80',
  '1542206395-9feb3edaa68d', '1504257432389-52343af06ae3', '1546961342-ea5f71b193f3',
  '1531746020798-e6953c6e8e04', '1522075469751-3a6694fb2f61', '1574680096145-d05b474e2155',
  '1601422407696-bc8942f6b527', '1612349317150-e413f6a5b16d', '1599566150163-29194dcaad36',
  '1557862921-05058cbe0fd4', '1560250097-0b93528c311a', '1573496359142-b8d87734a5b2',
  '1582750433449-648ed127bb54', '1502823403499-6ccfcf4fb453', '1519085361429-33805a1261a6',
  '1521119989653-83d4a6931981', '1508214751196-bcfd4ca60f7e', '1527982312252-2baf995ed2a0',
  '1544717297-f4c7a43f5d77', '1552053831-7157e71027ef', '1566492031773-ba4f1271a0d6',
  '1573497013790-ba1addc7ef90', '1580894693352-766e026a1ead', '1595154347125-14fe0368181b',
  '1601452610641-aea6a62fece7', '1619896323609-2e64b655d4b8', '1622273898391-a5e2e8d1f1d0',
  '1633332756048-646a840f6c03', '1649972904349-6e44c42644a7',
];
const profileImages = profileIds.map((id) => IMG(id, 256, 256, '&crop=face'));

/** Feed / story action shots */
const postImages = [
  IMG('1546519638-68d0994c5a0a', 800, 533), // basketball dunk
  IMG('1574629810360-7efbbe195018', 800, 533), // soccer
  IMG('1554068545-4d6fbe637681', 800, 533), // swimming
  IMG('1534438327276-14e9ded8db37', 800, 533), // gym lift
  IMG('1622163640459-1b9a4661f851', 800, 533), // tennis
  IMG('1599058917212-d750089bc07e', 800, 533), // football
  IMG('1517649763962-0c623066013b', 800, 533), // stadium
  IMG('1461896836934-bd45ba51ce6a', 800, 533), // track
  IMG('1571019614242-c5c5dee9f50a', 800, 533), // crossfit
  IMG('1552674605-db6ffd4facb5', 800, 533), // running
  IMG('1526676037777-05a232554f77', 800, 533), // volleyball
  IMG('1517838277536-f5f99be501cd', 800, 533), // weights
  IMG('1541534741688-6078c6bfb5c5', 800, 533), // boxing ring
  IMG('1431324155629-1a6deb1dec8d', 800, 533), // stadium crowd
  IMG('1518611012118-696072aa579a', 800, 533), // yoga stretch
  IMG('1571907483441-8b5d0d2c8f0a', 800, 533), // basketball court
  IMG('1558618666-fcd25c85cd64', 800, 533), // cycling
  IMG('1517644712207-74307c90dcef', 800, 533), // baseball
  IMG('1594381898411-846e442a8b68', 800, 533), // boxing training
  IMG('1612872087720-bb4e2ef0d23b', 800, 533), // beach volleyball
  IMG('1551959289-2d0c88e6fa9d', 800, 533), // marathon
  IMG('1517640808954-2b64cc3a0999', 800, 533), // ski/snow
  IMG('1504450758481-73337685323d', 800, 533), // basketball team
  IMG('1576678927532-48a598b2a901', 800, 533), // gym floor
  IMG('1587280501635-65c1523bf8e4', 800, 533), // mma mat
  IMG('1629909613654-28e377c9fb7a', 800, 533), // pool lanes
  IMG('1594736797933-d0c29f0b8a0a', 800, 533), // climbing
  IMG('1519868264361-a753cca77e83', 800, 533), // hiking trail
  IMG('1521417535008-fd1fb9c83ffb', 800, 533), // cricket/field
  IMG('1471295253337-35ce241ef13a', 800, 533), // skate park
];

const productImages = [
  IMG('1606107557195-0e29a4b5b4aa', 600, 600), // sneakers
  IMG('1542291026-7eec264c27ff', 600, 600), // red nike
  IMG('1556906781-9a412961c28c', 600, 600), // shoes stack
  IMG('1585232004423-244e0e6904e3', 600, 600), // boxing gloves
  IMG('1518611012118-696072aa579a', 600, 600), // yoga mat
  IMG('1571907483441-8b5d0d2c8f0a', 600, 600), // basketball
  IMG('1534438327276-14e9ded8db37', 600, 600), // dumbbells
  IMG('1553062407-98eeb64c6a62', 600, 600), // jersey
  IMG('1591047139829-de83cb6f6300', 600, 600), // smartwatch
  IMG('1517838277536-f5f99be501cd', 600, 600), // kettlebell
  IMG('1515886656127-29b0c0c3fc0e', 600, 600), // apparel
  IMG('1523275335684-37898b6baf30', 600, 600), // product flat
  IMG('1542291026-7eec264c27ff', 600, 600),
  IMG('1460353589951-6ebe2a0ebd71', 600, 600), // shoes
  IMG('1556909114-f6a05c80c547', 600, 600), // bottle
];

const venueCovers = [
  IMG('1534438327276-14e9ded8db37', 900, 500), // gym interior
  IMG('1571907483441-8b5d0d2c8f0a', 900, 500), // court
  IMG('1576678927532-48a598b2a901', 900, 500), // fitness floor
  IMG('1629909613654-28e377c9fb7a', 900, 500), // pool
  IMG('1546519638-68d0994c5a0a', 900, 500), // arena
  IMG('1517649763962-0c623066013b', 900, 500), // stadium night
  IMG('1558618666-fcd25c85cd64', 900, 500), // outdoor track
  IMG('1612872087720-bb4e2ef0d23b', 900, 500), // beach courts
  IMG('1587280501635-65c1523bf8e4', 900, 500), // dojo
  IMG('1517644712207-74307c90dcef', 900, 500), // field
];

const teamCovers = [
  IMG('1504450758481-73337685323d', 900, 400),
  IMG('1574629810360-7efbbe195018', 900, 400),
  IMG('1517649763962-0c623066013b', 900, 400),
  IMG('1541534741688-6078c6bfb5c5', 900, 400),
  IMG('1526676037777-05a232554f77', 900, 400),
  IMG('1552674605-db6ffd4facb5', 900, 400),
  IMG('1554068545-4d6fbe637681', 900, 400),
  IMG('1622163640459-1b9a4661f851', 900, 400),
  IMG('1599058917212-d750089bc07e', 900, 400),
  IMG('1517644712207-74307c90dcef', 900, 400),
  IMG('1461896836934-bd45ba51ce6a', 900, 400),
  IMG('1571019614242-c5c5dee9f50a', 900, 400),
];

const teamLogos = [
  IMG('1546519638-68d0994c5a0a', 200, 200),
  IMG('1574629810360-7efbbe195018', 200, 200),
  IMG('1554068545-4d6fbe637681', 200, 200),
  IMG('1534438327276-14e9ded8db37', 200, 200),
  IMG('1622163640459-1b9a4661f851', 200, 200),
  IMG('1599058917212-d750089bc07e', 200, 200),
  IMG('1526676037777-05a232554f77', 200, 200),
  IMG('1517644712207-74307c90dcef', 200, 200),
  IMG('1541534741688-6078c6bfb5c5', 200, 200),
  IMG('1552674605-db6ffd4facb5', 200, 200),
  IMG('1461896836934-bd45ba51ce6a', 200, 200),
  IMG('1571019614242-c5c5dee9f50a', 200, 200),
];

const seedUsers = [
  {
    firstName: 'Aisha',
    lastName: 'Okafor',
    username: 'aisha_swim',
    sport: 'Swimming',
    bio: 'NCAA freestyler · open-water prep · technique-first coaching in Atlanta',
    location: 'Atlanta',
    profileImage: IMG('1594381898411-8465977d70af', 400, 400),
  },
  {
    firstName: 'Elena',
    lastName: 'Volkov',
    username: 'elena_tennis',
    sport: 'Tennis',
    bio: 'D1 background · USTA pathway · match-play focused sessions in NYC',
    location: 'New York',
    profileImage: IMG('1544005313-94ddf0286df2', 400, 400),
  },
];

const teamData = [
  { name: 'Atlanta Swim Club', sport: 'Swimming', location: 'Atlanta', description: 'Masters training group — technique-first pool sessions.', members: 2 },
  { name: 'Metro Tennis Collective', sport: 'Tennis', location: 'New York', description: 'Match-play and drill nights for 4.0+ players.', members: 2 },
];

const postContent = [
  { content: 'Morning swim session was perfect. Hit my 100m free goal time. Coach says I\'m on track for Nationals 🏊', sport: 'Swimming', hashtags: ['swimming', 'freestyle', 'nationals'] },
  { content: 'Amazing doubles match today. Down 4-6, 3-5 and we came back to win in a super tiebreak! Tennis is mental 🎾', sport: 'Tennis', hashtags: ['tennis', 'comeback', 'doubles'] },
];

const eventData = [
  { title: 'Masters Swim Meet', description: 'USMS sanctioned meet. Events from 50m to 1500m.', eventType: 'competition', sport: 'Swimming', location: 'Georgia Tech Aquatics, Atlanta', maxParticipants: 24, daysFromNow: 5 },
  { title: 'Mixed Doubles Social', description: 'Casual mixed doubles round robin. Snacks provided.', eventType: 'social', sport: 'Tennis', location: 'Metro Tennis Center, NYC', maxParticipants: 12, daysFromNow: 3 },
];

const productData = [
  { name: 'Pro Basketball Shoes - Air Max Elite', description: 'Lightweight, responsive basketball shoes with ankle support and grip. Used by pros.', price: '189.99', category: 'equipment', brand: 'Nike', stock: 45 },
  { name: 'Running Watch GPS Pro', description: 'Advanced GPS running watch with heart rate, pace alerts, and training plans built in.', price: '349.99', category: 'equipment', brand: 'Garmin', stock: 30 },
  { name: 'MMA Training Gloves 7oz', description: 'Premium leather MMA sparring gloves. Great wrist support and padding.', price: '79.99', category: 'equipment', brand: 'Hayabusa', stock: 60 },
  { name: 'Tennis Racket Pro Staff 97', description: 'Control-oriented racket for advanced players. 97 sq in head. 11.65oz.', price: '269.99', category: 'equipment', brand: 'Wilson', stock: 25 },
  { name: 'CrossFit Lifting Belt', description: 'Competition-grade leather lifting belt. 4-inch width. IPF approved.', price: '89.99', category: 'equipment', brand: 'Rogue', stock: 40 },
  { name: 'Swim Goggles Pro Mirror', description: 'Anti-fog mirrored swim goggles. UV protection. Hydrodynamic low profile.', price: '34.99', category: 'equipment', brand: 'Speedo', stock: 100 },
  { name: 'Boxing Hand Wraps 180"', description: 'Semi-elastic cotton hand wraps. Thumb loop. Machine washable. 180 inches.', price: '14.99', category: 'equipment', brand: 'Everlast', stock: 200 },
  { name: 'Compression Running Shorts', description: 'Lightweight compression shorts with phone pocket. Moisture-wicking fabric.', price: '54.99', category: 'apparel', brand: 'Under Armour', stock: 75 },
  { name: 'Whey Protein Isolate 5lb', description: 'Clean protein isolate. 25g protein per serving. Low carb, no fillers.', price: '64.99', category: 'nutrition', brand: 'Optimum Nutrition', stock: 90 },
  { name: 'Foam Roller Pro 24"', description: 'High-density foam roller for muscle recovery and mobility work.', price: '29.99', category: 'accessories', brand: 'TriggerPoint', stock: 120 },
  { name: 'Athletic Tape Premium Roll', description: 'Medical-grade athletic tape for joint support. Hypoallergenic adhesive.', price: '12.99', category: 'accessories', brand: 'Mueller', stock: 300 },
  { name: 'Soccer Cleats Elite FG', description: 'Firm ground soccer cleats. Lightweight Flyknit upper. Excellent ball control.', price: '224.99', category: 'equipment', brand: 'Nike', stock: 35 },
  { name: 'Pre-Workout Energy Formula', description: 'Clean energy pre-workout. Beta-alanine, citrulline, caffeine. No crash.', price: '39.99', category: 'nutrition', brand: 'Ghost', stock: 80 },
  { name: 'Resistance Band Set (5 Bands)', description: 'Set of 5 resistance bands with handles. Light to heavy resistance levels.', price: '24.99', category: 'accessories', brand: 'Fit Simplify', stock: 150 },
  { name: 'Training Backpack 40L', description: 'Water-resistant training backpack. Shoe compartment, wet/dry pockets.', price: '79.99', category: 'accessories', brand: 'Nike', stock: 50 },
];

const placeData = [
  { name: 'Georgia Tech Aquatic Center', category: 'pool', sports: ['Swimming'], bio: 'Olympic-quality pool facility. 50m competition pool.', address: '750 Ferst Dr NW', city: 'Atlanta', state: 'GA', latitude: '33.7756', longitude: '-84.3963', amenities: ['indoor', 'timing-system', 'coaching'] },
  { name: 'Metro Tennis Center', category: 'court', sports: ['Tennis'], bio: 'Lighted hard courts with pro shop and coaching.', address: '340 W 96th St', city: 'New York', state: 'NY', latitude: '40.7930', longitude: '-73.9710', amenities: ['lights', 'pro-shop', 'coaching'] },
];

async function runSeed() {
  console.log('Starting seed...');

  console.log('Ensuring DB columns for events/coaches...');
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_id varchar`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS starts_at timestamptz`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS ends_at timestamptz`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility varchar DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity integer`);
  await db.execute(sql`ALTER TABLE coaches ADD COLUMN IF NOT EXISTS weekly_availability jsonb`);
  await db.execute(sql`ALTER TABLE coaches ADD COLUMN IF NOT EXISTS profile_json jsonb DEFAULT '{}'::jsonb`);

  console.log('Cleaning existing seed data...');
  await db.execute(sql`DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE author_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM post_comments WHERE post_id IN (SELECT id FROM posts WHERE author_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM event_participants WHERE event_id IN (SELECT id FROM events WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM match_participants WHERE match_id IN (SELECT id FROM competitive_matches WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM competitive_matches WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM events WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM posts WHERE author_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM team_stats WHERE team_id IN (SELECT id FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM teams WHERE captain_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM coaches WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM places WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM story_viewers WHERE story_id IN (SELECT id FROM stories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM story_replies WHERE story_id IN (SELECT id FROM stories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM stories WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM instant_team_members WHERE team_id IN (SELECT id FROM instant_teams WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app'))`);
  await db.execute(sql`DELETE FROM instant_teams WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM messages WHERE sender_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR receiver_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR related_entity_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM saved_posts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM point_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM user_follows WHERE follower_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR followed_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM user_levels WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM post_shares WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM event_rsvps WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM team_join_requests WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR reviewed_by IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR blocked_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM user_referrals WHERE referrer_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app') OR referred_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`UPDATE team_stats SET top_player_id = NULL WHERE top_player_id IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM community_routes WHERE discovered_by IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await db.execute(sql`DELETE FROM free_play_spots WHERE discovered_by IN (SELECT id FROM users WHERE email LIKE '%@surna.app')`);
  await purgeRemainingSeedUserReferences();
  await db.execute(sql`DELETE FROM users WHERE email LIKE '%@surna.app'`);
  console.log('Cleaned!');

  // 1. Create two showcase athletes
  console.log('Creating 2 showcase users...');
  const createdUsers: any[] = [];
  for (let i = 0; i < seedUsers.length; i++) {
    const u = seedUsers[i];
    const [user] = await db.insert(users).values({
      id: uuid(),
      email: `${u.username}@surna.app`,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      displayName: `${u.firstName} ${u.lastName}`,
      profileImageUrl: (u as { profileImage?: string }).profileImage ?? avatarUrl(u.username),
      bio: u.bio,
      sport: u.sport,
      primarySport: u.sport,
      location: u.location,
      skillLevel: ['beginner', 'intermediate', 'advanced', 'elite'][i % 4],
      verified: true,
      emailVerified: true,
      profileType: 'normal',
      profileJson: {
        profilePathChosenAt: new Date().toISOString(),
        profileSetupCompletedAt: new Date().toISOString(),
        onboardingSkipped: true,
      },
      position: ['Point Guard', 'Striker', 'Midfielder', 'Setter', 'Pitcher', 'Forward', 'Libero', 'Center'][i % 8],
      availability: ['Weekends', 'Evenings', 'Mornings', 'Flexible'][i % 4],
      lookingFor: ['competitive', 'training', 'fun', 'coaching'][i % 4],
    }).returning();
    createdUsers.push(user);
  }
  console.log(`Created ${createdUsers.length} users`);

  // 2. Create user levels (using raw SQL since schema may differ from DB)
  console.log('Creating user levels...');
  for (let i = 0; i < createdUsers.length; i++) {
    const level = Math.floor(Math.random() * 50) + 1;
    const totalXp = level * 150 + Math.floor(Math.random() * 500);
    const xpNext = (level + 1) * 150;
    await db.execute(sql`INSERT INTO user_levels (id, user_id, level, total_points, points_to_next_level) VALUES (${uuid()}, ${createdUsers[i].id}, ${level}, ${totalXp}, ${xpNext})`);
  }

  // 3. Mutual follows between showcase athletes
  console.log('Creating follows...');
  if (createdUsers.length >= 2) {
    await db.execute(sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${createdUsers[0].id}, ${createdUsers[1].id})`);
    await db.execute(sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${createdUsers[1].id}, ${createdUsers[0].id})`);
  }

  // 4. Create places
  console.log('Creating places...');
  const createdPlaces: any[] = [];
  for (let pi = 0; pi < placeData.length; pi++) {
    const p = placeData[pi];
    const owner = createdUsers[pi % createdUsers.length];
    const placeId = uuid();
    const sportsStr = `{${p.sports.join(',')}}`;
    const amenitiesStr = p.amenities ? `{${p.amenities.join(',')}}` : null;
    const avgRating = (3.5 + Math.random() * 1.5).toFixed(2);
    const profileImg = venueCovers[pi % venueCovers.length];
    const coverImg = venueCovers[(pi + 3) % venueCovers.length];
    await db.execute(sql`INSERT INTO places (id, owner_id, name, category, sports, bio, address, city, state, country, latitude, longitude, amenities, is_verified, average_rating, profile_image_url, cover_image_url) VALUES (${placeId}, ${owner.id}, ${p.name}, ${p.category}, ${sportsStr}::text[], ${p.bio}, ${p.address}, ${p.city}, ${p.state}, 'USA', ${p.latitude}, ${p.longitude}, ${amenitiesStr}::text[], true, ${avgRating}, ${profileImg}, ${coverImg})`);
    createdPlaces.push({ id: placeId });
  }
  console.log(`Created ${createdPlaces.length} places`);

  // 5. Create teams
  console.log('Creating teams...');
  const createdTeams: any[] = [];
  for (let i = 0; i < teamData.length; i++) {
    const t = teamData[i];
    const captain = createdUsers[i * 4 % createdUsers.length];
    const slug = t.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const tid = uuid();
    const plId = createdPlaces[i % createdPlaces.length]?.id;
    const ratingVal = (3 + Math.random() * 2).toFixed(1);
    const ratingCnt = Math.floor(Math.random() * 50) + 5;
    const followersCnt = Math.floor(Math.random() * 200) + 20;
    const isVerified = i < 5;
    const logo = teamLogos[i % teamLogos.length];
    const cover = teamCovers[i % teamCovers.length];
    await db.execute(sql`INSERT INTO teams (id, name, slug, description, sport, location, captain_id, place_id, logo, cover, verified, rating, rating_count, followers_count, is_public, max_members, current_members) VALUES (${tid}, ${t.name}, ${slug}, ${t.description}, ${t.sport}, ${t.location}, ${captain.id}, ${plId}, ${logo}, ${cover}, ${isVerified}, ${ratingVal}, ${ratingCnt}, ${followersCnt}, true, 25, ${t.members})`);
    const team = { id: tid };
    createdTeams.push(team);

    await db.execute(sql`INSERT INTO team_members (id, team_id, user_id, role) VALUES (${uuid()}, ${team.id}, ${captain.id}, 'captain')`);

    const memberIndices = new Set<number>();
    const captainIdx = createdUsers.indexOf(captain);
    for (let m = 0; m < Math.min(t.members - 1, 8); m++) {
      let idx = Math.floor(Math.random() * createdUsers.length);
      while (idx === captainIdx || memberIndices.has(idx)) {
        idx = Math.floor(Math.random() * createdUsers.length);
      }
      memberIndices.add(idx);
      const role = m === 0 ? 'co-captain' : 'member';
      await db.execute(sql`INSERT INTO team_members (id, team_id, user_id, role) VALUES (${uuid()}, ${team.id}, ${createdUsers[idx].id}, ${role})`);
    }
  }
  console.log(`Created ${createdTeams.length} teams`);

  // 6. Create fake coach accounts (demo / @surna.app only)
  console.log('Creating coaches...');
  const { FAKE_COACH_PERSONAS, buildCoachSeedRow } = await import('./coachSeedPersonas');

  for (const persona of FAKE_COACH_PERSONAS) {
    const u = createdUsers[persona.userIndex];
    const row = buildCoachSeedRow(persona, u.id, persona.userIndex);
    await db.execute(sql`INSERT INTO coaches (id, user_id, specialties, experience, certifications, hourly_rate, weekly_availability, profile_json, bio, is_verified, is_active) VALUES (${uuid()}, ${u.id}, ${row.specsArr}::text[], ${row.exp}, ${row.certsStr}::text[], ${row.rate}, ${row.weeklyAvail}::jsonb, ${row.profileJson}::jsonb, ${row.coachBio}, ${persona.verified}, true)`);
  }
  console.log(`Created ${FAKE_COACH_PERSONAS.length} fake coach accounts`);

  // 7. Create posts (one per showcase athlete)
  console.log('Creating posts...');
  const createdPosts: any[] = [];
  for (let i = 0; i < postContent.length; i++) {
    const p = postContent[i];
    const author = createdUsers[i % createdUsers.length];
    const hasImage = Math.random() > 0.12;
    const isVideo = !hasImage && Math.random() > 0.7;
    const pid = uuid();
    const imgUrl = hasImage ? actionPhotoUrl(`post-${i}-${author.username}`, 800, 533) : null;
    const vidUrl = isVideo ? SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length] : null;
    const mType = isVideo ? 'video' : hasImage ? 'image' : 'text';
    const pType = isVideo ? 'video' : hasImage ? 'image' : 'text';
    const likes = Math.floor(Math.random() * 100) + 5;
    const comments = Math.floor(Math.random() * 30) + 1;
    const shares = Math.floor(Math.random() * 15);
    const created = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    const hashtagsStr = p.hashtags ? `{${p.hashtags.join(',')}}` : null;
    await db.execute(sql`INSERT INTO posts (id, author_id, content, image_url, video_url, media_type, sport, hashtags, visibility, post_type, likes_count, comments_count, shares_count, created_at) VALUES (${pid}, ${author.id}, ${p.content}, ${imgUrl}, ${vidUrl}, ${mType}, ${p.sport}, ${hashtagsStr}::text[], 'public', ${pType}, ${likes}, ${comments}, ${shares}, ${created.toISOString()})`);
    createdPosts.push({ id: pid });
  }
  console.log(`Created ${createdPosts.length} posts`);

  // 8. Create likes and comments on posts
  console.log('Creating likes and comments...');
  for (const post of createdPosts) {
    const numLikes = Math.floor(Math.random() * 8) + 2;
    const likedBy = new Set<number>();
    for (let l = 0; l < numLikes; l++) {
      let idx = Math.floor(Math.random() * createdUsers.length);
      while (likedBy.has(idx)) idx = Math.floor(Math.random() * createdUsers.length);
      likedBy.add(idx);
      await db.execute(sql`INSERT INTO post_likes (id, post_id, user_id) VALUES (${uuid()}, ${post.id}, ${createdUsers[idx].id})`);
    }

    const comments = [
      'This is amazing! Keep it up! 💪',
      'Incredible work, so inspiring!',
      'Next level stuff right here 🔥',
      'Respect! Hard work pays off',
      'Let\'s gooo! Beast mode!',
      'You\'re killing it! 🏆',
      'What a performance! Congrats!',
      'Training partner goals right here',
    ];
    const numComments = Math.floor(Math.random() * 4) + 1;
    for (let c = 0; c < numComments; c++) {
      const commenter = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const commentText = comments[Math.floor(Math.random() * comments.length)];
      await db.execute(sql`INSERT INTO post_comments (id, post_id, author_id, content) VALUES (${uuid()}, ${post.id}, ${commenter.id}, ${commentText})`);
    }
  }

  // 9. Create events (raw SQL - actual columns: creator_id, title, description, starts_at, ends_at, location, visibility, capacity, place_id)
  console.log('Creating events...');
  const createdEvents: any[] = [];
  for (let i = 0; i < eventData.length; i++) {
    const e = eventData[i];
    const creator = createdUsers[i * 3 % createdUsers.length];
    const startsAt = new Date(Date.now() + e.daysFromNow * 24 * 60 * 60 * 1000);
    startsAt.setHours(Math.floor(Math.random() * 6) + 14, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
    const eid = uuid();
    const placeId = createdPlaces[i % createdPlaces.length]?.id;

    await db.execute(sql`INSERT INTO events (id, creator_id, organizer_id, title, description, event_type, sport, starts_at, ends_at, start_date, end_date, location, visibility, capacity, place_id, is_public) VALUES (${eid}, ${creator.id}, ${creator.id}, ${e.title}, ${e.description}, ${e.eventType}, ${e.sport}, ${startsAt.toISOString()}, ${endsAt.toISOString()}, ${startsAt.toISOString()}, ${endsAt.toISOString()}, ${e.location}, 'public', ${e.maxParticipants}, ${placeId}, true)`);
    createdEvents.push({ id: eid });

    const numParticipants = Math.floor(Math.random() * 8) + 3;
    const participating = new Set<number>();
    for (let p = 0; p < numParticipants; p++) {
      let idx = Math.floor(Math.random() * createdUsers.length);
      while (participating.has(idx)) idx = Math.floor(Math.random() * createdUsers.length);
      participating.add(idx);
      await db.execute(sql`INSERT INTO event_participants (id, event_id, user_id) VALUES (${uuid()}, ${eid}, ${createdUsers[idx].id})`);
    }
  }
  console.log(`Created ${createdEvents.length} events`);

  // 10. Products skipped — showcase seed stays minimal

  // 11. Competitive matches skipped
  console.log('Creating stories...');
  let storyCount = 0;
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
  const storyCaptions = [
    'Pool lanes booked for 6am 🏊',
    'Serve clinic spots open 🎾',
  ];
  for (let i = 0; i < createdUsers.length; i++) {
    const author = createdUsers[i];
    const sid = uuid();
    const isVideo = false;
    const caption = storyCaptions[i % storyCaptions.length];
    await db.execute(sql`INSERT INTO stories (id, user_id, owner_type, owner_id, media_url, media_type, thumbnail_url, caption, visibility, view_count, expires_at) VALUES (${sid}, ${author.id}, 'person', ${author.id}, ${postImages[i % postImages.length]}, 'image', null, ${caption}, 'public', ${12 + i * 3}, ${expiresAt})`);
    storyCount++;
    const otherIdx = i === 0 ? 1 : 0;
    if (createdUsers[otherIdx]) {
      await db.execute(sql`INSERT INTO story_viewers (id, story_id, viewer_id) VALUES (${uuid()}, ${sid}, ${createdUsers[otherIdx].id})`);
    }
  }
  console.log(`Created ${storyCount} stories`);

  // 13. Instant join teams
  console.log('Creating instant teams...');
  const instantNames = [
    { name: 'Morning swim set', sport: 'Swimming', location: 'Atlanta' },
    { name: 'Tennis doubles tonight', sport: 'Tennis', location: 'New York' },
  ];
  for (let i = 0; i < instantNames.length; i++) {
    const row = instantNames[i];
    const creator = createdUsers[i % createdUsers.length];
    const loc = row.location;
    const coords = cityCoords[loc] || cityCoords['Atlanta'];
    const tid = uuid();
    const start = new Date(Date.now() + (i + 1) * 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const needed = 4;
    const joined = 2;
    await db.execute(sql`INSERT INTO instant_teams (id, creator_id, name, sport, description, lat, lng, location_name, start_time, end_time, players_needed, players_joined, skill_level, visibility, status) VALUES (${tid}, ${creator.id}, ${row.name}, ${row.sport}, ${'Looking for players — all welcome!'}, ${coords.lat}, ${coords.lng}, ${loc}, ${start.toISOString()}, ${end.toISOString()}, ${needed}, ${joined}, 'any', 'public', 'active')`);
    await db.execute(sql`INSERT INTO instant_team_members (id, team_id, user_id, status) VALUES (${uuid()}, ${tid}, ${creator.id}, 'joined')`);
    const member = createdUsers[(i + 1) % createdUsers.length];
    if (member.id !== creator.id) {
      await db.execute(sql`INSERT INTO instant_team_members (id, team_id, user_id, status) VALUES (${uuid()}, ${tid}, ${member.id}, 'joined')`);
    }
  }
  console.log(`Created ${instantNames.length} instant teams`);

  // 14. Direct messages
  console.log('Creating messages...');
  const dmSnippets = [
    'Pool lanes booked for 6am — see you there 🏊',
    'Serve clinic spots are open — want the 7pm slot?',
  ];
  let msgCount = 0;
  if (createdUsers.length >= 2) {
    await db.execute(sql`INSERT INTO messages (id, sender_id, receiver_id, content, message_type, is_read) VALUES (${uuid()}, ${createdUsers[0].id}, ${createdUsers[1].id}, ${dmSnippets[0]}, 'text', false)`);
    await db.execute(sql`INSERT INTO messages (id, sender_id, receiver_id, content, message_type, is_read) VALUES (${uuid()}, ${createdUsers[1].id}, ${createdUsers[0].id}, ${dmSnippets[1]}, 'text', true)`);
    msgCount = 2;
  }
  console.log(`Created ${msgCount} messages`);

  // 15. Point transactions (gamification)
  console.log('Creating point transactions...');
  for (let i = 0; i < createdUsers.length; i++) {
    const pts = Math.floor(Math.random() * 500) + 50;
    await db.execute(sql`INSERT INTO point_transactions (id, user_id, points, action, description) VALUES (${uuid()}, ${createdUsers[i].id}, ${pts}, 'challenge_completed', ${'Completed weekly challenge'})`);
  }

  // 16. Local dev user hooks (follows, notifications, DMs)
  console.log('Linking local dev user...');
  await db.insert(users).values({
    id: LOCAL_DEV_ID,
    email: 'dev@surna.local',
    firstName: 'Local',
    lastName: 'Developer',
    username: 'localdev',
    displayName: 'Local Developer',
    profileImageUrl: profileImages[0],
    sport: 'Basketball',
    primarySport: 'Basketball',
    bio: 'Local development account',
    verified: true,
    emailVerified: true,
  }).onConflictDoNothing();
  await db.execute(sql`UPDATE users SET profile_image_url = ${profileImages[0]}, email_verified = true WHERE id = ${LOCAL_DEV_ID}`);

  for (let i = 0; i < createdUsers.length; i++) {
    await db.execute(sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${LOCAL_DEV_ID}, ${createdUsers[i].id})`);
    await db.execute(sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${createdUsers[i].id}, ${LOCAL_DEV_ID})`);
  }

  const notifTypes = [
    { type: 'like', title: 'New like', message: 'Aisha liked your post' },
    { type: 'comment', title: 'New comment', message: 'Elena commented on your highlight' },
    { type: 'follow', title: 'New follower', message: 'Aisha started following you' },
    { type: 'team_invite', title: 'Team invite', message: 'You were invited to Atlanta Swim Club' },
    { type: 'event', title: 'Event reminder', message: 'Masters Swim Meet starts in 2 hours' },
  ];
  for (let i = 0; i < notifTypes.length; i++) {
    const n = notifTypes[i];
    await db.execute(sql`INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (${uuid()}, ${LOCAL_DEV_ID}, ${n.type}, ${n.title}, ${n.message}, ${i > 2})`);
  }

  if (createdUsers[0]) {
    await db.execute(sql`INSERT INTO messages (id, sender_id, receiver_id, content, message_type, is_read) VALUES (${uuid()}, ${createdUsers[0].id}, ${LOCAL_DEV_ID}, ${dmSnippets[0]}, 'text', false)`);
  }

  await db.execute(sql`DELETE FROM user_levels WHERE user_id = ${LOCAL_DEV_ID}`);
  await db.execute(sql`INSERT INTO user_levels (id, user_id, level, total_points, points_to_next_level) VALUES (${uuid()}, ${LOCAL_DEV_ID}, 12, 1800, 2000)`);

  console.log('\n✅ Seed complete!');
  console.log(`  ${createdUsers.length} showcase users`);
  console.log(`  ${createdTeams.length} teams`);
  console.log(`  ${FAKE_COACH_PERSONAS.length} coach profiles`);
  console.log(`  ${createdPosts.length} posts`);
  console.log(`  ${createdEvents.length} events`);
  console.log(`  ${createdPlaces.length} places`);
  console.log(`  ${storyCount} stories`);
  console.log(`  ${instantNames.length} instant join games`);
  console.log(`  ${msgCount} messages`);
  console.log(`  Local dev (${LOCAL_DEV_ID}) linked with follows + notifications`);
}

export { runSeed };

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/seed-data.ts');
if (isDirectRun) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
