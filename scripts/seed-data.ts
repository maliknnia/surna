import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

function uuid() { return crypto.randomUUID(); }

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
  { firstName: 'Marcus', lastName: 'Johnson', username: 'marcusj_hoops', sport: 'Basketball', bio: 'Point guard | LA Ballers captain | Hoop dreams never die', location: 'Los Angeles' },
  { firstName: 'Sophia', lastName: 'Chen', username: 'sophia_runs', sport: 'Running', bio: 'Marathon runner | 3:12 PR | Chasing the next mile', location: 'New York' },
  { firstName: 'DeAndre', lastName: 'Williams', username: 'dre_mma', sport: 'MMA', bio: 'Amateur MMA fighter | BJJ purple belt | Training daily', location: 'Miami' },
  { firstName: 'Isabella', lastName: 'Rodriguez', username: 'bella_tennis', sport: 'Tennis', bio: 'Tennis player | USTA 4.5 | Love-all starts here', location: 'Houston' },
  { firstName: 'James', lastName: 'Mitchell', username: 'jmitch_crossfit', sport: 'CrossFit', bio: 'CrossFit competitor | Regional qualifier | WOD warrior', location: 'Denver' },
  { firstName: 'Aisha', lastName: 'Okafor', username: 'aisha_swim', sport: 'Swimming', bio: 'Competitive swimmer | Freestyle specialist | Pool is life', location: 'Atlanta' },
  { firstName: 'Tyler', lastName: 'Brooks', username: 'tbrooks_box', sport: 'Boxing', bio: 'Golden Gloves winner | Training at Mayweather Gym', location: 'Chicago' },
  { firstName: 'Maya', lastName: 'Patel', username: 'maya_yoga_fit', sport: 'CrossFit', bio: 'Yoga + CrossFit hybrid athlete | Mind body connection', location: 'Portland' },
  { firstName: 'Jordan', lastName: 'Davis', username: 'jd_soccer', sport: 'Soccer', bio: 'Midfielder | Semi-pro league | Always on the pitch', location: 'Seattle' },
  { firstName: 'Camille', lastName: 'Dupont', username: 'camille_volley', sport: 'Volleyball', bio: 'Beach volleyball player | Sand is my court', location: 'Los Angeles' },
  { firstName: 'Ryan', lastName: 'Kim', username: 'rkim_baseball', sport: 'Baseball', bio: 'Pitcher | 92mph fastball | Diamond grinder', location: 'Phoenix' },
  { firstName: 'Zara', lastName: 'Thompson', username: 'zara_track', sport: 'Running', bio: '400m sprinter | State champion | Speed kills', location: 'Atlanta' },
  { firstName: 'Carlos', lastName: 'Mendez', username: 'carlos_boxing', sport: 'Boxing', bio: 'Pro boxing prospect | 8-0 record | Mexican style warrior', location: 'Los Angeles' },
  { firstName: 'Leah', lastName: 'Anderson', username: 'leah_swim', sport: 'Swimming', bio: 'Open water swimmer | Ironman finisher | No limits', location: 'Miami' },
  { firstName: 'Darius', lastName: 'Brown', username: 'dbrown_hoops', sport: 'Basketball', bio: 'Shooting guard | AAU veteran | Buckets only', location: 'Chicago' },
  { firstName: 'Elena', lastName: 'Volkov', username: 'elena_tennis', sport: 'Tennis', bio: 'Former college tennis | Coaching + competing', location: 'New York' },
  { firstName: 'Andre', lastName: 'Jackson', username: 'aj_football', sport: 'Soccer', bio: 'Striker | Club team captain | Goals on goals', location: 'Houston' },
  { firstName: 'Mia', lastName: 'Tanaka', username: 'mia_crossfit', sport: 'CrossFit', bio: 'CrossFit Games hopeful | Lifting heavy things', location: 'Denver' },
  { firstName: 'Omar', lastName: 'Hassan', username: 'omar_mma', sport: 'MMA', bio: 'Muay Thai + Wrestling | Fight camp life', location: 'Phoenix' },
  { firstName: 'Jasmine', lastName: 'Wright', username: 'jas_volleyball', sport: 'Volleyball', bio: 'Indoor volleyball | Setter | NCAA D2 alum', location: 'Seattle' },
  { firstName: 'Kevin', lastName: 'OBrien', username: 'kob_run', sport: 'Running', bio: 'Ultra runner | 100-miler finisher | Mountain goat', location: 'Denver' },
  { firstName: 'Nia', lastName: 'Carter', username: 'nia_box', sport: 'Boxing', bio: 'Women boxing advocate | Training + competing', location: 'New York' },
  { firstName: 'Liam', lastName: 'Nguyen', username: 'liam_swim', sport: 'Swimming', bio: 'Backstroke specialist | Club team swimmer', location: 'Portland' },
  { firstName: 'Aaliyah', lastName: 'James', username: 'aaliyah_soccer', sport: 'Soccer', bio: 'Goalkeeper | NWSL draft eligible | Shot stopper', location: 'Chicago' },
  { firstName: 'Brandon', lastName: 'Torres', username: 'btorres_mma', sport: 'MMA', bio: 'Jiu-jitsu black belt | Competing at 170lbs', location: 'Miami' },
  { firstName: 'Chloe', lastName: 'Baker', username: 'chloe_tennis', sport: 'Tennis', bio: 'Doubles specialist | Mixed doubles champion', location: 'Atlanta' },
  { firstName: 'Malik', lastName: 'Robinson', username: 'malik_hoops', sport: 'Basketball', bio: 'Center | 6\'10 | Blocking shots and grabbing boards', location: 'Houston' },
  { firstName: 'Savannah', lastName: 'Lee', username: 'sav_track', sport: 'Running', bio: 'Hurdles + long jump | Multi-event athlete', location: 'Phoenix' },
  { firstName: 'Trevor', lastName: 'Wilson', username: 'twil_crossfit', sport: 'CrossFit', bio: 'Functional fitness coach | Master trainer certified', location: 'Los Angeles' },
  { firstName: 'Diana', lastName: 'Price', username: 'diana_volley', sport: 'Volleyball', bio: 'Libero | Defense wins championships | Dig city', location: 'Seattle' },
  { firstName: 'Austin', lastName: 'Clark', username: 'aclark_box', sport: 'Boxing', bio: 'Light heavyweight | Southpaw style | 12-2 record', location: 'Chicago' },
  { firstName: 'Priya', lastName: 'Sharma', username: 'priya_swim', sport: 'Swimming', bio: 'Butterfly specialist | National qualifier | Water is home', location: 'New York' },
  { firstName: 'Jaden', lastName: 'Moore', username: 'jmoore_soccer', sport: 'Soccer', bio: 'Right back | Defensive wall | Clean tackle king', location: 'Denver' },
  { firstName: 'Taylor', lastName: 'Reed', username: 'tay_run', sport: 'Running', bio: '5K specialist | Sub-16 time | Speed demon', location: 'Portland' },
  { firstName: 'Dominic', lastName: 'Garcia', username: 'dom_baseball', sport: 'Baseball', bio: 'Shortstop | .340 batting avg | Gold glove defender', location: 'Los Angeles' },
  { firstName: 'Kira', lastName: 'Foster', username: 'kira_mma', sport: 'MMA', bio: 'Strawweight fighter | Wrestler turned striker', location: 'Phoenix' },
  { firstName: 'Nathan', lastName: 'Scott', username: 'nscott_hoops', sport: 'Basketball', bio: 'Small forward | Triple-double machine | Versatile', location: 'Miami' },
  { firstName: 'Amber', lastName: 'Phillips', username: 'amber_crossfit', sport: 'CrossFit', bio: 'CrossFit L2 trainer | Nutrition coach | Athlete mom', location: 'Atlanta' },
  { firstName: 'Elijah', lastName: 'Martin', username: 'eli_tennis', sport: 'Tennis', bio: 'Serve and volley | Old school style | Net rusher', location: 'Houston' },
  { firstName: 'Luna', lastName: 'Flores', username: 'luna_yoga', sport: 'CrossFit', bio: 'Movement specialist | Flexibility + power | Flow state', location: 'Miami' },
  { firstName: 'Caleb', lastName: 'Washington', username: 'cwash_soccer', sport: 'Soccer', bio: 'Left winger | Speed merchant | Assist machine', location: 'Atlanta' },
  { firstName: 'Riley', lastName: 'Cooper', username: 'riley_swim', sport: 'Swimming', bio: 'IM swimmer | All 4 strokes | Olympic trials qualifier', location: 'Denver' },
  { firstName: 'Xavier', lastName: 'Bell', username: 'xbell_box', sport: 'Boxing', bio: 'Welterweight contender | Technical boxer | Ring IQ', location: 'New York' },
  { firstName: 'Haley', lastName: 'Young', username: 'haley_volley', sport: 'Volleyball', bio: 'Outside hitter | Vertical: 32 inches | Kill machine', location: 'Chicago' },
  { firstName: 'Kai', lastName: 'Henderson', username: 'kai_run', sport: 'Running', bio: 'Trail runner | Mountain ultras | Nature lover', location: 'Portland' },
  { firstName: 'Brooke', lastName: 'Evans', username: 'brooke_tennis', sport: 'Tennis', bio: 'Clay court specialist | Baseline rallies | Patient game', location: 'Los Angeles' },
  { firstName: 'Isaiah', lastName: 'Campbell', username: 'isaiah_mma', sport: 'MMA', bio: 'Lightweight | Wrestling base | Ground and pound', location: 'Houston' },
  { firstName: 'Grace', lastName: 'Murphy', username: 'grace_crossfit', sport: 'CrossFit', bio: 'Olympic lifting focus | Snatch PR: 185lbs | Strong', location: 'Seattle' },
  { firstName: 'Diego', lastName: 'Ramirez', username: 'diego_soccer', sport: 'Soccer', bio: 'Central midfielder | Playmaker | Vision + passing', location: 'Phoenix' },
  { firstName: 'Serena', lastName: 'Butler', username: 'serena_hoops', sport: 'Basketball', bio: 'Point guard | Floor general | Making everyone better', location: 'Denver' },
];

const teamData = [
  { name: 'LA Ballers', sport: 'Basketball', location: 'Los Angeles', description: 'Premier basketball team in LA. Competitive league play and weekend pickup games.', members: 12 },
  { name: 'NYC Runners Club', sport: 'Running', location: 'New York', description: 'Central Park running crew. Marathon training, tempo runs, and trail adventures.', members: 25 },
  { name: 'Miami Fight Club', sport: 'MMA', location: 'Miami', description: 'MMA training team. Striking, grappling, and competitive fight prep.', members: 15 },
  { name: 'Houston Aces', sport: 'Tennis', location: 'Houston', description: 'USTA league team. Singles and doubles competition at 4.0+ level.', members: 8 },
  { name: 'Denver Iron', sport: 'CrossFit', location: 'Denver', description: 'CrossFit competition team. Preparing athletes for the Games.', members: 18 },
  { name: 'Atlanta Aquatics', sport: 'Swimming', location: 'Atlanta', description: 'Masters swimming team. Competing locally and nationally.', members: 20 },
  { name: 'Chi-Town Gloves', sport: 'Boxing', location: 'Chicago', description: 'Boxing gym team. Golden Gloves preparation and amateur fights.', members: 14 },
  { name: 'Portland Trail Mix', sport: 'Running', location: 'Portland', description: 'Trail running collective. Weekend adventures in the PNW.', members: 22 },
  { name: 'Seattle FC', sport: 'Soccer', location: 'Seattle', description: 'Adult rec soccer. Co-ed leagues and tournament play.', members: 18 },
  { name: 'SoCal Spikers', sport: 'Volleyball', location: 'Los Angeles', description: 'Beach and indoor volleyball. Open play and tournaments.', members: 16 },
  { name: 'Phoenix Sluggers', sport: 'Baseball', location: 'Phoenix', description: 'Adult baseball league. Competitive travel ball team.', members: 15 },
  { name: 'NYC Fight Academy', sport: 'Boxing', location: 'New York', description: 'Amateur and pro boxing team. Training champions since 2020.', members: 12 },
];

const postContent = [
  { content: 'Just dropped 35 points in tonight\'s league game! Feeling unstoppable on the court right now 🏀', sport: 'Basketball', hashtags: ['basketball', 'gameday', 'buckets'] },
  { content: 'New PR alert! 3:08 marathon in NYC. The crowd energy was insane. Months of training paid off! 🏃', sport: 'Running', hashtags: ['marathon', 'pr', 'running'] },
  { content: 'Submitted my opponent in the 2nd round via armbar. 3-0 this year, feeling confident about regionals 💪', sport: 'MMA', hashtags: ['mma', 'bjj', 'submission'] },
  { content: 'Amazing doubles match today. Down 4-6, 3-5 and we came back to win in a super tiebreak! Tennis is mental 🎾', sport: 'Tennis', hashtags: ['tennis', 'comeback', 'doubles'] },
  { content: 'Crushed Murph today in under 40 minutes. New gym PR! The heat made it brutal but worth every second', sport: 'CrossFit', hashtags: ['crossfit', 'murph', 'pr'] },
  { content: 'Morning swim session was perfect. Hit my 100m free goal time. Coach says I\'m on track for Nationals 🏊', sport: 'Swimming', hashtags: ['swimming', 'freestyle', 'nationals'] },
  { content: 'Sparring session with a pro today. Got caught with a body shot but landed some clean combos. Learning every day 🥊', sport: 'Boxing', hashtags: ['boxing', 'sparring', 'training'] },
  { content: 'Beautiful sunrise trail run at Mt. Hood today. 15 miles of pure bliss. Nature is the best gym 🏔️', sport: 'Running', hashtags: ['trailrunning', 'mthood', 'nature'] },
  { content: 'Hat trick in today\'s league match! The team played incredibly. 5-2 win puts us top of the table ⚽', sport: 'Soccer', hashtags: ['soccer', 'hattrick', 'winning'] },
  { content: 'Beach volleyball tournament this weekend was a blast. Made it to the semis with an amazing partner 🏐', sport: 'Volleyball', hashtags: ['volleyball', 'beach', 'tournament'] },
  { content: 'Hit a walk-off homer in the bottom of the 9th! Whole team went crazy. Best feeling in sports ⚾', sport: 'Baseball', hashtags: ['baseball', 'walkoff', 'clutch'] },
  { content: 'Back from a knee injury and stronger than ever. First workout in 3 months felt incredible. Grateful for the journey 💪', sport: 'CrossFit', hashtags: ['comeback', 'recovery', 'grateful'] },
  { content: 'Coached my first youth basketball camp today. Seeing those kids light up when they make a shot is everything 🌟', sport: 'Basketball', hashtags: ['coaching', 'youth', 'inspiration'] },
  { content: 'New deadlift PR: 405 lbs! Been chasing this number for 2 years. Consistency wins every time 🏋️', sport: 'CrossFit', hashtags: ['deadlift', 'pr', 'strength'] },
  { content: 'Finished my first open water race. 2.4 miles in the Pacific Ocean. Scary but incredibly rewarding 🌊', sport: 'Swimming', hashtags: ['openwater', 'challenge', 'ocean'] },
  { content: 'Just signed up for my first amateur boxing match next month. Nervous but excited. Time to put in the work! 🥊', sport: 'Boxing', hashtags: ['amateur', 'fight', 'boxing'] },
  { content: 'Team practice was fire today. Our passing game is clicking and everyone is locked in for playoffs 🔥', sport: 'Soccer', hashtags: ['teamwork', 'practice', 'playoffs'] },
  { content: '50-mile ultra marathon complete! 11 hours of running through the mountains. My legs hate me but my heart is full 🏃‍♂️', sport: 'Running', hashtags: ['ultra', 'endurance', 'mountains'] },
  { content: 'Rolled with a visiting black belt today. Got tapped 5 times but learned so much. The mat doesn\'t lie 🥋', sport: 'MMA', hashtags: ['bjj', 'learning', 'humble'] },
  { content: 'Won the club tennis championship! 6-4, 7-5 in the final. All those early morning sessions were worth it 🏆', sport: 'Tennis', hashtags: ['champion', 'tennis', 'trophy'] },
  { content: 'Recovery day: ice bath, foam rolling, and stretching. Your body is your tool, take care of it 🧊', sport: 'CrossFit', hashtags: ['recovery', 'selfcare', 'rest'] },
  { content: 'Great scrimmage with the team today. Our defense is looking solid heading into the season 🛡️', sport: 'Basketball', hashtags: ['defense', 'preseason', 'team'] },
  { content: 'Just finished a 2-hour pool session. Butterfly is finally starting to feel natural. Progress is progress! 🦋', sport: 'Swimming', hashtags: ['butterfly', 'progress', 'swimming'] },
  { content: 'Hosting a free community boxing class this Saturday! Everyone welcome, all skill levels. Let\'s get moving! 🥊', sport: 'Boxing', hashtags: ['community', 'free', 'boxing'] },
  { content: 'Season opener today! 3 goals and an assist. The team chemistry is unreal this year ⚡', sport: 'Soccer', hashtags: ['season', 'goals', 'chemistry'] },
  { content: 'Finally broke the 4-hour barrier on the Grand Canyon rim-to-rim trail. Bucket list achievement unlocked! 🏜️', sport: 'Running', hashtags: ['grandcanyon', 'trail', 'bucketlist'] },
  { content: 'Meal prep Sunday! Chicken, rice, veggies x7. Fuel your body right and the results follow 🍗', sport: 'CrossFit', hashtags: ['mealprep', 'nutrition', 'discipline'] },
  { content: 'Post-match analysis with the team. We lost but learned a ton. Film don\'t lie. Back to work Monday 📹', sport: 'Basketball', hashtags: ['filmreview', 'improvement', 'grind'] },
  { content: 'Night swim under the stars. There\'s something magical about the water at night. Pure peace 🌙', sport: 'Swimming', hashtags: ['nightswim', 'peace', 'water'] },
  { content: 'Just got my USTA ranking updated. Moved up 200 spots this season! Hard work = results 📈', sport: 'Tennis', hashtags: ['ranking', 'improvement', 'tennis'] },
];

const eventData = [
  { title: '5v5 Basketball Tournament', description: 'Open tournament for all skill levels. Teams of 5 with refs and scorekeepers. Prizes for top 3!', eventType: 'competition', sport: 'Basketball', location: 'Downtown Courts, LA', maxParticipants: 40, daysFromNow: 3 },
  { title: 'Central Park 10K', description: 'Weekly group run through Central Park. All paces welcome. Meet at Columbus Circle.', eventType: 'training', sport: 'Running', location: 'Central Park, NYC', maxParticipants: 100, daysFromNow: 1 },
  { title: 'MMA Sparring Night', description: 'Open mat sparring session. Bring your own gear. All disciplines welcome.', eventType: 'training', sport: 'MMA', location: 'Miami Fight Club', maxParticipants: 30, daysFromNow: 2 },
  { title: 'Mixed Doubles Social', description: 'Casual mixed doubles round robin. Snacks and drinks provided. Great way to meet tennis players!', eventType: 'social', sport: 'Tennis', location: 'Memorial Park Courts, Houston', maxParticipants: 16, daysFromNow: 5 },
  { title: 'CrossFit Competition Prep', description: 'Mock competition with 3 workouts. Practice your game-day routine and test your fitness.', eventType: 'competition', sport: 'CrossFit', location: 'Iron Box Gym, Denver', maxParticipants: 24, daysFromNow: 7 },
  { title: 'Masters Swim Meet', description: 'USMS sanctioned meet. Events from 50m to 1500m. Age group competition.', eventType: 'competition', sport: 'Swimming', location: 'Georgia Tech Aquatics, Atlanta', maxParticipants: 200, daysFromNow: 14 },
  { title: 'Boxing Exhibition Night', description: 'Amateur exhibition bouts. 3 rounds each. Matchups by weight and experience.', eventType: 'competition', sport: 'Boxing', location: 'Chi-Town Boxing Club, Chicago', maxParticipants: 20, daysFromNow: 10 },
  { title: 'Trail Running Workshop', description: 'Learn trail running techniques, navigation, and gear selection. Includes a 5-mile group run.', eventType: 'workshop', sport: 'Running', location: 'Forest Park, Portland', maxParticipants: 25, daysFromNow: 4 },
  { title: 'Co-ed Soccer League Kickoff', description: 'Season opener for the adult rec league. 8 teams competing over 10 weeks.', eventType: 'competition', sport: 'Soccer', location: 'Magnuson Park, Seattle', maxParticipants: 80, daysFromNow: 6 },
  { title: 'Beach Volleyball Sunset Session', description: 'Open play at the beach courts. All levels welcome. Bring friends!', eventType: 'social', sport: 'Volleyball', location: 'Manhattan Beach, LA', maxParticipants: 40, daysFromNow: 2 },
  { title: 'Baseball Skills Clinic', description: 'Hitting, fielding, and pitching drills led by former college players.', eventType: 'workshop', sport: 'Baseball', location: 'Tempe Diablo Stadium, Phoenix', maxParticipants: 30, daysFromNow: 8 },
  { title: 'Yoga for Athletes Workshop', description: 'Mobility and flexibility workshop designed for CrossFit and strength athletes.', eventType: 'workshop', sport: 'CrossFit', location: 'Mindful Movement Studio, Portland', maxParticipants: 20, daysFromNow: 3 },
  { title: 'Pickup Basketball Night', description: 'Weekly pickup games. First come, first served. Winners stay on.', eventType: 'social', sport: 'Basketball', location: 'Venice Beach Courts, LA', maxParticipants: 30, daysFromNow: 1 },
  { title: 'Half Marathon Training Group', description: 'Join our 12-week training plan for the spring half marathon. Coaches provided.', eventType: 'training', sport: 'Running', location: 'Piedmont Park, Atlanta', maxParticipants: 50, daysFromNow: 9 },
  { title: 'Grappling Only Tournament', description: 'Submission-only grappling tournament. Gi and no-gi divisions.', eventType: 'competition', sport: 'MMA', location: 'Gracie Miami, FL', maxParticipants: 64, daysFromNow: 21 },
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
  { name: 'Iron Box CrossFit', category: 'gym', sports: ['CrossFit', 'Olympic Lifting'], bio: 'Premier CrossFit box with Olympic lifting platforms and turf area.', address: '1250 W 6th St', city: 'Denver', state: 'CO', latitude: '39.7392', longitude: '-104.9903', amenities: ['showers', 'parking', 'coaching'] },
  { name: 'Venice Beach Courts', category: 'court', sports: ['Basketball', 'Volleyball'], bio: 'Iconic outdoor courts. Basketball and beach volleyball under the California sun.', address: '1800 Ocean Front Walk', city: 'Los Angeles', state: 'CA', latitude: '33.9850', longitude: '-118.4695', amenities: ['outdoor', 'free', 'lighting'] },
  { name: 'Central Park Track', category: 'track', sports: ['Running', 'Track & Field'], bio: 'The famous reservoir loop and track facilities in Central Park.', address: 'Central Park', city: 'New York', state: 'NY', latitude: '40.7829', longitude: '-73.9654', amenities: ['outdoor', 'free', 'restrooms'] },
  { name: 'Miami Fight Academy', category: 'gym', sports: ['MMA', 'Boxing', 'BJJ'], bio: 'Full-service fight gym with cage, ring, and mat space. Pro and amateur training.', address: '3500 NW 2nd Ave', city: 'Miami', state: 'FL', latitude: '25.8028', longitude: '-80.2090', amenities: ['showers', 'parking', 'pro-shop'] },
  { name: 'Memorial Park Tennis Center', category: 'court', sports: ['Tennis'], bio: '16 hard courts with lights. Pro shop and coaching available.', address: '6402 Arnot St', city: 'Houston', state: 'TX', latitude: '29.7604', longitude: '-95.3698', amenities: ['lights', 'pro-shop', 'parking'] },
  { name: 'Georgia Tech Aquatic Center', category: 'pool', sports: ['Swimming', 'Water Polo'], bio: 'Olympic-quality pool facility. 50m competition pool and diving well.', address: '750 Ferst Dr NW', city: 'Atlanta', state: 'GA', latitude: '33.7756', longitude: '-84.3963', amenities: ['indoor', 'timing-system', 'bleachers'] },
  { name: 'Chi-Town Boxing Club', category: 'gym', sports: ['Boxing'], bio: 'Old-school boxing gym. Heavy bags, speed bags, ring. Champions trained here.', address: '2345 S Michigan Ave', city: 'Chicago', state: 'IL', latitude: '41.8525', longitude: '-87.6244', amenities: ['showers', 'coaching', 'equipment'] },
  { name: 'Forest Park Trails', category: 'field', sports: ['Running', 'Hiking'], bio: '80+ miles of trails in Portland\'s urban forest. Perfect for trail running.', address: 'NW 29th Ave', city: 'Portland', state: 'OR', latitude: '45.5272', longitude: '-122.7095', amenities: ['outdoor', 'free', 'trails'] },
  { name: 'Magnuson Field Complex', category: 'field', sports: ['Soccer', 'Football'], bio: 'Multi-field complex for team sports. Turf and natural grass options.', address: '7400 Sand Point Way NE', city: 'Seattle', state: 'WA', latitude: '47.6815', longitude: '-122.2564', amenities: ['lights', 'parking', 'restrooms'] },
  { name: 'Tempe Diablo Training Fields', category: 'field', sports: ['Baseball', 'Softball'], bio: 'Professional-grade baseball diamonds. Spring training quality facilities.', address: '2200 W Alameda Dr', city: 'Phoenix', state: 'AZ', latitude: '33.3884', longitude: '-111.9660', amenities: ['lights', 'dugouts', 'batting-cages'] },
];

async function seed() {
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
  await db.execute(sql`DELETE FROM users WHERE email LIKE '%@surna.app'`);
  console.log('Cleaned!');

  // 1. Create 50 users
  console.log('Creating 50 users...');
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
      profileImageUrl: profileImages[i % profileImages.length],
      bio: u.bio,
      sport: u.sport,
      primarySport: u.sport,
      location: u.location,
      skillLevel: ['beginner', 'intermediate', 'advanced', 'elite'][i % 4],
      verified: i < 10,
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

  // 3. Create follows (social connections)
  console.log('Creating follows...');
  for (let i = 0; i < createdUsers.length; i++) {
    const numFollows = Math.floor(Math.random() * 15) + 5;
    const followed = new Set<number>();
    for (let j = 0; j < numFollows; j++) {
      let target = Math.floor(Math.random() * createdUsers.length);
      while (target === i || followed.has(target)) {
        target = Math.floor(Math.random() * createdUsers.length);
      }
      followed.add(target);
      await db.execute(sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${createdUsers[i].id}, ${createdUsers[target].id})`);
    }
  }

  // 4. Create places
  console.log('Creating places...');
  const createdPlaces: any[] = [];
  for (let pi = 0; pi < placeData.length; pi++) {
    const p = placeData[pi];
    const owner = createdUsers[Math.floor(Math.random() * 10)];
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

  // 7. Create posts (30 posts)
  console.log('Creating posts...');
  const createdPosts: any[] = [];
  for (let i = 0; i < postContent.length; i++) {
    const p = postContent[i];
    const author = createdUsers[i % createdUsers.length];
    const hasImage = Math.random() > 0.12;
    const isVideo = !hasImage && Math.random() > 0.7;
    const pid = uuid();
    const imgUrl = hasImage ? postImages[i % postImages.length] : null;
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

  // Extra posts so feed/home always feels full
  console.log('Creating bonus posts...');
  for (let i = 0; i < postContent.length; i++) {
    const p = postContent[i];
    const author = createdUsers[(i + 7) % createdUsers.length];
    const pid = uuid();
    const imgUrl = postImages[(i + 3) % postImages.length];
    const likes = Math.floor(Math.random() * 200) + 20;
    const comments = Math.floor(Math.random() * 40) + 3;
    const shares = Math.floor(Math.random() * 25) + 2;
    const created = new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000));
    const hashtagsStr = p.hashtags ? `{${p.hashtags.join(',')}}` : null;
    await db.execute(sql`INSERT INTO posts (id, author_id, content, image_url, media_type, sport, hashtags, visibility, post_type, likes_count, comments_count, shares_count, created_at) VALUES (${pid}, ${author.id}, ${p.content}, ${imgUrl}, 'image', ${p.sport}, ${hashtagsStr}::text[], 'public', 'image', ${likes}, ${comments}, ${shares}, ${created.toISOString()})`);
    createdPosts.push({ id: pid });
  }
  console.log(`Total posts: ${createdPosts.length}`);

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

  // 10. Create products
  console.log('Creating products...');
  for (let i = 0; i < productData.length; i++) {
    const p = productData[i];
    const seller = createdUsers[i % 10];
    const prodImg = productImages[i % productImages.length];
    await db.execute(sql`INSERT INTO products (id, seller_id, name, description, price, category, brand, image_url, stock, is_active) VALUES (${uuid()}, ${seller.id}, ${p.name}, ${p.description}, ${p.price}, ${p.category}, ${p.brand}, ${prodImg}, ${p.stock}, true)`);
  }
  console.log(`Created ${productData.length} products`);

  // 11. Create competitive matches
  console.log('Creating matches...');
  const matchData = [
    { title: 'LA Ballers vs Chi-Town Gloves - Charity Game', type: 'teamVsTeam', sport: 'Basketball', status: 'accepted' },
    { title: '1v1 Boxing Showdown', type: 'player1v1', sport: 'Boxing', status: 'live' },
    { title: 'Open 5K Time Trial', type: 'open', sport: 'Running', status: 'pending' },
    { title: 'Tennis Singles Challenge', type: 'player1v1', sport: 'Tennis', status: 'completed' },
    { title: 'Team CrossFit Throwdown', type: 'teamVsTeam', sport: 'CrossFit', status: 'accepted' },
    { title: 'MMA Exhibition Match', type: 'player1v1', sport: 'MMA', status: 'pending' },
    { title: 'Soccer Friendly - Seattle vs Portland', type: 'teamVsTeam', sport: 'Soccer', status: 'accepted' },
    { title: 'Swimming Relay Challenge', type: 'open', sport: 'Swimming', status: 'pending' },
  ];

  for (let i = 0; i < matchData.length; i++) {
    const m = matchData[i];
    const creator = createdUsers[i * 5 % createdUsers.length];
    const timeStart = new Date(Date.now() + (i + 1) * 2 * 24 * 60 * 60 * 1000);

    const mid = uuid();
    const creatorType = m.type === 'teamVsTeam' ? 'team' : 'user';
    const creatorId = m.type === 'teamVsTeam' ? createdTeams[i % createdTeams.length].id : creator.id;
    const opponentId = m.type === 'player1v1' ? createdUsers[(i * 5 + 3) % createdUsers.length].id : null;
    const opponentType = m.type === 'player1v1' ? 'user' : (m.type === 'teamVsTeam' ? 'team' : null);
    const timeEnd = new Date(timeStart.getTime() + 3 * 60 * 60 * 1000);
    const cap = m.type === 'open' ? 50 : null;
    await db.execute(sql`INSERT INTO competitive_matches (id, title, type, sport, creator_type, creator_id, opponent_type, opponent_id, visibility, time_start, time_end, status, reward, capacity) VALUES (${mid}, ${m.title}, ${m.type}, ${m.sport}, ${creatorType}, ${creatorId}, ${opponentType}, ${opponentId}, 'public', ${timeStart.toISOString()}, ${timeEnd.toISOString()}, ${m.status}, 'xp', ${cap})`);
  }
  console.log('Created 8 competitive matches');

  // 12. Stories (24h)
  console.log('Creating stories...');
  let storyCount = 0;
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
  for (let i = 0; i < 24; i++) {
    const author = createdUsers[i % createdUsers.length];
    const sid = uuid();
    const isVideo = i % 5 === 0;
    await db.execute(sql`INSERT INTO stories (id, user_id, owner_type, owner_id, media_url, media_type, thumbnail_url, caption, visibility, view_count, expires_at) VALUES (${sid}, ${author.id}, 'person', ${author.id}, ${isVideo ? SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length] : postImages[i % postImages.length]}, ${isVideo ? 'video' : 'image'}, ${isVideo ? postImages[i % postImages.length] : null}, ${'Game day vibes 🔥'}, 'public', ${Math.floor(Math.random() * 80) + 5}, ${expiresAt})`);
    storyCount++;
    const viewers = Math.floor(Math.random() * 6) + 2;
    const seen = new Set<number>();
    for (let v = 0; v < viewers; v++) {
      let idx = Math.floor(Math.random() * createdUsers.length);
      while (seen.has(idx)) idx = Math.floor(Math.random() * createdUsers.length);
      seen.add(idx);
      await db.execute(sql`INSERT INTO story_viewers (id, story_id, viewer_id) VALUES (${uuid()}, ${sid}, ${createdUsers[idx].id})`);
    }
  }
  console.log(`Created ${storyCount} stories`);

  // 13. Instant join teams
  console.log('Creating instant teams...');
  const instantNames = [
    'Pickup hoops tonight', 'Sunset 5v5', 'Morning run crew', 'Open mat sparring',
    'Tennis doubles needed', 'Soccer scrimmage', 'Beach volleyball', 'CrossFit WOD',
    'Boxing pads session', 'Baseball batting practice', 'Swim laps group', 'Flag football',
  ];
  for (let i = 0; i < instantNames.length; i++) {
    const creator = createdUsers[i * 4 % createdUsers.length];
    const sport = sports[i % sports.length];
    const loc = seedUsers[i % seedUsers.length].location;
    const coords = cityCoords[loc] || cityCoords['Los Angeles'];
    const tid = uuid();
    const start = new Date(Date.now() + (i % 6) * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const needed = 4 + (i % 8);
    const joined = 1 + (i % 4);
    await db.execute(sql`INSERT INTO instant_teams (id, creator_id, name, sport, description, lat, lng, location_name, start_time, end_time, players_needed, players_joined, skill_level, visibility, status) VALUES (${tid}, ${creator.id}, ${instantNames[i]}, ${sport}, ${'Looking for players — all welcome!'}, ${coords.lat}, ${coords.lng}, ${loc}, ${start.toISOString()}, ${end.toISOString()}, ${needed}, ${joined}, 'any', 'public', 'active')`);
    await db.execute(sql`INSERT INTO instant_team_members (id, team_id, user_id, status) VALUES (${uuid()}, ${tid}, ${creator.id}, 'joined')`);
    for (let m = 0; m < joined - 1; m++) {
      const member = createdUsers[(i + m + 1) % createdUsers.length];
      await db.execute(sql`INSERT INTO instant_team_members (id, team_id, user_id, status) VALUES (${uuid()}, ${tid}, ${member.id}, 'joined')`);
    }
  }
  console.log(`Created ${instantNames.length} instant teams`);

  // 14. Direct messages
  console.log('Creating messages...');
  const dmSnippets = [
    'You in for the game tonight?',
    'Great match yesterday — rematch soon?',
    'Sent you the court location pin 📍',
    'Can you bring an extra ball?',
    'Team chat is buzzing, check it out',
    'Congrats on the PR! 🔥',
  ];
  let msgCount = 0;
  for (let i = 0; i < 30; i++) {
    const sender = createdUsers[i % createdUsers.length];
    const receiver = createdUsers[(i + 11) % createdUsers.length];
    if (sender.id === receiver.id) continue;
    await db.execute(sql`INSERT INTO messages (id, sender_id, receiver_id, content, message_type, is_read) VALUES (${uuid()}, ${sender.id}, ${receiver.id}, ${dmSnippets[i % dmSnippets.length]}, 'text', ${Math.random() > 0.4})`);
    msgCount++;
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

  for (let i = 0; i < Math.min(20, createdUsers.length); i++) {
    await db.execute(sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${LOCAL_DEV_ID}, ${createdUsers[i].id})`);
    await db.execute(sql`INSERT INTO user_follows (id, follower_id, followed_id) VALUES (${uuid()}, ${createdUsers[i].id}, ${LOCAL_DEV_ID})`);
  }

  const notifTypes = [
    { type: 'like', title: 'New like', message: 'Marcus liked your post' },
    { type: 'comment', title: 'New comment', message: 'Sophia commented on your highlight' },
    { type: 'follow', title: 'New follower', message: 'DeAndre started following you' },
    { type: 'team_invite', title: 'Team invite', message: 'You were invited to LA Ballers' },
    { type: 'challenge', title: 'Challenge invite', message: '1v1 Boxing Showdown — accept?' },
    { type: 'event', title: 'Event reminder', message: '5v5 Basketball Tournament starts in 2 hours' },
  ];
  for (let i = 0; i < notifTypes.length; i++) {
    const n = notifTypes[i];
    await db.execute(sql`INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (${uuid()}, ${LOCAL_DEV_ID}, ${n.type}, ${n.title}, ${n.message}, ${i > 2})`);
  }

  for (let i = 0; i < 8; i++) {
    const sender = createdUsers[i];
    await db.execute(sql`INSERT INTO messages (id, sender_id, receiver_id, content, message_type, is_read) VALUES (${uuid()}, ${sender.id}, ${LOCAL_DEV_ID}, ${dmSnippets[i % dmSnippets.length]}, 'text', false)`);
  }

  await db.execute(sql`DELETE FROM user_levels WHERE user_id = ${LOCAL_DEV_ID}`);
  await db.execute(sql`INSERT INTO user_levels (id, user_id, level, total_points, points_to_next_level) VALUES (${uuid()}, ${LOCAL_DEV_ID}, 12, 1800, 2000)`);

  console.log('\n✅ Seed complete!');
  console.log(`  ${createdUsers.length} users`);
  console.log(`  ${createdTeams.length} teams`);
  console.log(`  10 fake coach accounts (@surna.app)`);
  console.log(`  ${createdPosts.length} posts with likes/comments`);
  console.log(`  ${createdEvents.length} events`);
  console.log(`  ${productData.length} products`);
  console.log(`  ${createdPlaces.length} places`);
  console.log(`  8 competitive matches`);
  console.log(`  ${createdUsers.length * 10}+ social follows`);
  console.log(`  ${storyCount} stories`);
  console.log(`  ${instantNames.length} instant join games`);
  console.log(`  ${msgCount}+ messages`);
  console.log(`  Local dev (${LOCAL_DEV_ID}) linked with follows + notifications`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
