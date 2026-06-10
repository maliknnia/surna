// Comprehensive list of sports from around the world
export const SPORTS_CATEGORIES = [
  // Popular Team Sports
  { name: "Football", icon: "🏈", category: "Team Sports" },
  { name: "Soccer", icon: "⚽", category: "Team Sports" },
  { name: "Basketball", icon: "🏀", category: "Team Sports" },
  { name: "Baseball", icon: "⚾", category: "Team Sports" },
  { name: "Volleyball", icon: "🏐", category: "Team Sports" },
  { name: "Hockey", icon: "🏒", category: "Team Sports" },
  { name: "Rugby", icon: "🏉", category: "Team Sports" },
  { name: "Cricket", icon: "🏏", category: "Team Sports" },
  { name: "Handball", icon: "🤾", category: "Team Sports" },
  { name: "Water Polo", icon: "🤽", category: "Team Sports" },

  // Individual Sports
  { name: "Tennis", icon: "🎾", category: "Individual Sports" },
  { name: "Swimming", icon: "🏊", category: "Individual Sports" },
  { name: "Running", icon: "🏃", category: "Individual Sports" },
  { name: "Cycling", icon: "🚴", category: "Individual Sports" },
  { name: "Golf", icon: "⛳", category: "Individual Sports" },
  { name: "Boxing", icon: "🥊", category: "Individual Sports" },
  { name: "Wrestling", icon: "🤼", category: "Individual Sports" },
  { name: "Track and Field", icon: "🏃", category: "Individual Sports" },
  { name: "Badminton", icon: "🏸", category: "Individual Sports" },
  { name: "Table Tennis", icon: "🏓", category: "Individual Sports" },

  // Water Sports
  { name: "Surfing", icon: "🏄", category: "Water Sports" },
  { name: "Diving", icon: "🤿", category: "Water Sports" },
  { name: "Sailing", icon: "⛵", category: "Water Sports" },
  { name: "Rowing", icon: "🚣", category: "Water Sports" },
  { name: "Kayaking", icon: "🛶", category: "Water Sports" },
  { name: "Windsurfing", icon: "🏄", category: "Water Sports" },
  { name: "Kitesurfing", icon: "🪁", category: "Water Sports" },
  { name: "Water Skiing", icon: "🎿", category: "Water Sports" },

  // Winter Sports
  { name: "Skiing", icon: "⛷️", category: "Winter Sports" },
  { name: "Snowboarding", icon: "🏂", category: "Winter Sports" },
  { name: "Ice Skating", icon: "⛸️", category: "Winter Sports" },
  { name: "Ice Hockey", icon: "🏒", category: "Winter Sports" },
  { name: "Curling", icon: "🥌", category: "Winter Sports" },
  { name: "Bobsledding", icon: "🛷", category: "Winter Sports" },
  { name: "Figure Skating", icon: "⛸️", category: "Winter Sports" },

  // Combat Sports
  { name: "Martial Arts", icon: "🥋", category: "Combat Sports" },
  { name: "Karate", icon: "🥋", category: "Combat Sports" },
  { name: "Judo", icon: "🥋", category: "Combat Sports" },
  { name: "Taekwondo", icon: "🥋", category: "Combat Sports" },
  { name: "Jiu-Jitsu", icon: "🥋", category: "Combat Sports" },
  { name: "Kickboxing", icon: "🥊", category: "Combat Sports" },
  { name: "Mixed Martial Arts", icon: "🥊", category: "Combat Sports" },
  { name: "Fencing", icon: "🤺", category: "Combat Sports" },

  // Racquet Sports
  { name: "Squash", icon: "🎾", category: "Racquet Sports" },
  { name: "Racquetball", icon: "🎾", category: "Racquet Sports" },
  { name: "Pickleball", icon: "🏓", category: "Racquet Sports" },

  // Extreme & Adventure Sports
  { name: "Rock Climbing", icon: "🧗", category: "Extreme Sports" },
  { name: "Skateboarding", icon: "🛹", category: "Extreme Sports" },
  { name: "Snowboarding", icon: "🏂", category: "Extreme Sports" },
  { name: "Parkour", icon: "🤸", category: "Extreme Sports" },
  { name: "Bungee Jumping", icon: "🪂", category: "Extreme Sports" },
  { name: "Skydiving", icon: "🪂", category: "Extreme Sports" },
  { name: "Base Jumping", icon: "🪂", category: "Extreme Sports" },
  { name: "Mountain Biking", icon: "🚵", category: "Extreme Sports" },

  // Equestrian & Animal Sports
  { name: "Horse Riding", icon: "🏇", category: "Equestrian" },
  { name: "Polo", icon: "🏇", category: "Equestrian" },
  { name: "Dressage", icon: "🏇", category: "Equestrian" },
  { name: "Show Jumping", icon: "🏇", category: "Equestrian" },
  { name: "Rodeo", icon: "🤠", category: "Equestrian" },

  // Mind Sports
  { name: "Chess", icon: "♟️", category: "Mind Sports" },
  { name: "Checkers", icon: "⚫", category: "Mind Sports" },
  { name: "Poker", icon: "🃏", category: "Mind Sports" },
  { name: "Bridge", icon: "🃏", category: "Mind Sports" },
  { name: "Esports", icon: "🎮", category: "Mind Sports" },

  // Gymnastics & Dance
  { name: "Gymnastics", icon: "🤸", category: "Gymnastics" },
  { name: "Rhythmic Gymnastics", icon: "🤸", category: "Gymnastics" },
  { name: "Ballet", icon: "🩰", category: "Dance" },
  { name: "Ballroom Dancing", icon: "💃", category: "Dance" },
  { name: "Hip Hop Dance", icon: "🕺", category: "Dance" },
  { name: "Contemporary Dance", icon: "💃", category: "Dance" },

  // Motor Sports
  { name: "Car Racing", icon: "🏎️", category: "Motor Sports" },
  { name: "Motorcycle Racing", icon: "🏍️", category: "Motor Sports" },
  { name: "Go-Kart Racing", icon: "🏎️", category: "Motor Sports" },
  { name: "ATV Racing", icon: "🏍️", category: "Motor Sports" },

  // Track & Field
  { name: "Sprinting", icon: "🏃", category: "Track & Field" },
  { name: "Marathon", icon: "🏃", category: "Track & Field" },
  { name: "Hurdles", icon: "🏃", category: "Track & Field" },
  { name: "Long Jump", icon: "🏃", category: "Track & Field" },
  { name: "High Jump", icon: "🏃", category: "Track & Field" },
  { name: "Pole Vault", icon: "🏃", category: "Track & Field" },
  { name: "Shot Put", icon: "🏃", category: "Track & Field" },
  { name: "Discus Throw", icon: "🏃", category: "Track & Field" },
  { name: "Javelin Throw", icon: "🏃", category: "Track & Field" },
  { name: "Hammer Throw", icon: "🏃", category: "Track & Field" },

  // Fitness & Training
  { name: "Weightlifting", icon: "🏋️", category: "Fitness" },
  { name: "Powerlifting", icon: "🏋️", category: "Fitness" },
  { name: "CrossFit", icon: "🏋️", category: "Fitness" },
  { name: "Bodybuilding", icon: "💪", category: "Fitness" },
  { name: "Yoga", icon: "🧘", category: "Fitness" },
  { name: "Pilates", icon: "🧘", category: "Fitness" },
  { name: "Aerobics", icon: "🤸", category: "Fitness" },
  { name: "Calisthenics", icon: "🤸", category: "Fitness" },

  // Outdoor & Adventure
  { name: "Hiking", icon: "🥾", category: "Outdoor" },
  { name: "Mountaineering", icon: "⛰️", category: "Outdoor" },
  { name: "Camping", icon: "🏕️", category: "Outdoor" },
  { name: "Fishing", icon: "🎣", category: "Outdoor" },
  { name: "Hunting", icon: "🏹", category: "Outdoor" },
  { name: "Archery", icon: "🏹", category: "Outdoor" },
  { name: "Orienteering", icon: "🧭", category: "Outdoor" },

  // Unique & Traditional Sports
  { name: "Bowling", icon: "🎳", category: "Recreational" },
  { name: "Billiards", icon: "🎱", category: "Recreational" },
  { name: "Darts", icon: "🎯", category: "Recreational" },
  { name: "Frisbee", icon: "🥏", category: "Recreational" },
  { name: "Ultimate Frisbee", icon: "🥏", category: "Team Sports" },
  { name: "Lacrosse", icon: "🥍", category: "Team Sports" },
  { name: "Field Hockey", icon: "🏑", category: "Team Sports" },

  // Cultural & Traditional Sports
  { name: "Sumo Wrestling", icon: "🤼", category: "Traditional" },
  { name: "Kabaddi", icon: "🤼", category: "Traditional" },
  { name: "Capoeira", icon: "🤸", category: "Traditional" },
  { name: "Sepak Takraw", icon: "🏐", category: "Traditional" },
  { name: "Kendo", icon: "🗡️", category: "Traditional" },

  // Olympic Sports
  { name: "Weightlifting", icon: "🏋️", category: "Olympic" },
  { name: "Synchronized Swimming", icon: "🏊", category: "Olympic" },
  { name: "Triathlon", icon: "🏊", category: "Olympic" },
  { name: "Pentathlon", icon: "🏃", category: "Olympic" },
  { name: "Decathlon", icon: "🏃", category: "Olympic" },

  // Disability Sports
  { name: "Wheelchair Basketball", icon: "♿", category: "Adaptive Sports" },
  { name: "Paralympic Athletics", icon: "🏃", category: "Adaptive Sports" },
  { name: "Wheelchair Racing", icon: "♿", category: "Adaptive Sports" },

  // New Age Sports
  { name: "Drone Racing", icon: "🚁", category: "Technology Sports" },
  { name: "Virtual Reality Sports", icon: "🥽", category: "Technology Sports" },
  { name: "Laser Tag", icon: "🔫", category: "Technology Sports" },
  { name: "Paintball", icon: "🎨", category: "Recreation" },

  // Professional Sports
  { name: "Formula 1", icon: "🏎️", category: "Professional" },
  { name: "NASCAR", icon: "🏎️", category: "Professional" },
  { name: "Professional Wrestling", icon: "🤼", category: "Professional" },
] as const;

// Helper functions
export const getSportsByCategory = (category: string) => {
  return SPORTS_CATEGORIES.filter(sport => sport.category === category);
};

export const getAllSportsNames = () => {
  return SPORTS_CATEGORIES.map(sport => sport.name);
};

export const getSportCategories = () => {
  const categories = Array.from(new Set(SPORTS_CATEGORIES.map(sport => sport.category)));
  return categories.sort();
};

export const findSportByName = (name: string) => {
  return SPORTS_CATEGORIES.find(sport => sport.name.toLowerCase() === name.toLowerCase());
};

// Popular sports for quick selection
export const POPULAR_SPORTS = [
  "Soccer", "Basketball", "Football", "Tennis", "Swimming", 
  "Running", "Volleyball", "Baseball", "Golf", "Hockey"
];

// Mind sports for intellectual athletes
export const MIND_SPORTS = [
  "Chess", "Poker", "Bridge", "Checkers", "Esports"
];

// Adventure sports for thrill seekers
export const ADVENTURE_SPORTS = [
  "Rock Climbing", "Skydiving", "Bungee Jumping", "Surfing", "Skateboarding"
];