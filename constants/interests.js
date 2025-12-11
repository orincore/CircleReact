// Comprehensive interests and needs data organized by categories

export const INTEREST_CATEGORIES = [
  {
    id: 'creative',
    name: 'Creative & Arts',
    icon: 'color-palette',
    interests: [
      'Art', 'Painting', 'Drawing', 'Sculpture', 'Photography', 'Videography',
      'Music', 'Singing', 'Playing Instruments', 'DJing', 'Music Production',
      'Writing', 'Poetry', 'Blogging', 'Storytelling', 'Journalism',
      'Design', 'Graphic Design', 'UI/UX Design', 'Fashion Design', 'Interior Design',
      'Crafts', 'DIY Projects', 'Pottery', 'Knitting', 'Origami'
    ]
  },
  {
    id: 'tech',
    name: 'Technology & Innovation',
    icon: 'code-slash',
    interests: [
      'Coding', 'Web Development', 'App Development', 'Game Development',
      'AI & Machine Learning', 'Data Science', 'Blockchain', 'Crypto',
      'Cybersecurity', 'Cloud Computing', 'IoT', 'Robotics',
      'Tech Gadgets', 'VR/AR', 'Drones', '3D Printing'
    ]
  },
  {
    id: 'fitness',
    name: 'Fitness & Sports',
    icon: 'fitness',
    interests: [
      'Gym', 'Running', 'Yoga', 'Pilates', 'CrossFit', 'Cycling',
      'Swimming', 'Hiking', 'Rock Climbing', 'Martial Arts', 'Boxing',
      'Football', 'Basketball', 'Tennis', 'Badminton', 'Cricket',
      'Volleyball', 'Golf', 'Skateboarding', 'Surfing', 'Skiing'
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Media',
    icon: 'film',
    interests: [
      'Movies', 'TV Shows', 'Netflix', 'Anime', 'K-Drama',
      'Gaming', 'PC Gaming', 'Console Gaming', 'Mobile Gaming', 'Esports',
      'Podcasts', 'Audiobooks', 'Stand-up Comedy', 'Theater', 'Concerts',
      'Streaming', 'YouTube', 'TikTok', 'Instagram', 'Social Media'
    ]
  },
  {
    id: 'food',
    name: 'Food & Culinary',
    icon: 'restaurant',
    interests: [
      'Cooking', 'Baking', 'Grilling', 'Meal Prep',
      'Food Photography', 'Food Blogging', 'Wine Tasting', 'Coffee',
      'Tea', 'Craft Beer', 'Mixology', 'Veganism', 'Vegetarian',
      'Street Food', 'Fine Dining', 'Food Trucks', 'International Cuisine'
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Adventure',
    icon: 'airplane',
    interests: [
      'Travel', 'Backpacking', 'Road Trips', 'Solo Travel', 'Beach Vacations',
      'Mountain Trekking', 'Camping', 'Adventure Sports', 'Scuba Diving',
      'Skydiving', 'Bungee Jumping', 'Safari', 'Cultural Tours',
      'Food Tourism', 'Photography Tours', 'Volunteering Abroad'
    ]
  },
  {
    id: 'learning',
    name: 'Learning & Knowledge',
    icon: 'book',
    interests: [
      'Reading', 'Books', 'E-books', 'Comics', 'Manga',
      'History', 'Science', 'Philosophy', 'Psychology', 'Astronomy',
      'Languages', 'Online Courses', 'Documentaries', 'Museums',
      'Research', 'Debate', 'Public Speaking', 'Teaching'
    ]
  },
  {
    id: 'business',
    name: 'Business & Finance',
    icon: 'briefcase',
    interests: [
      'Entrepreneurship', 'Startups', 'Business', 'Marketing',
      'Finance', 'Investing', 'Stock Market', 'Real Estate',
      'Cryptocurrency', 'NFTs', 'Personal Finance', 'Economics',
      'Networking', 'Leadership', 'Productivity', 'Self-improvement'
    ]
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle & Wellness',
    icon: 'heart',
    interests: [
      'Meditation', 'Mindfulness', 'Spirituality', 'Self-care',
      'Fashion', 'Beauty', 'Skincare', 'Makeup', 'Hairstyling',
      'Shopping', 'Thrifting', 'Minimalism', 'Sustainability',
      'Gardening', 'Plants', 'Pets', 'Dogs', 'Cats', 'Aquariums'
    ]
  },
  {
    id: 'social',
    name: 'Social & Community',
    icon: 'people',
    interests: [
      'Volunteering', 'Social Causes', 'Activism', 'Charity Work',
      'Community Service', 'Mentoring', 'Networking Events',
      'Meetups', 'Parties', 'Clubbing', 'Bar Hopping', 'Karaoke',
      'Board Games', 'Card Games', 'Trivia Nights', 'Book Clubs'
    ]
  },
  {
    id: 'nature',
    name: 'Nature & Outdoors',
    icon: 'leaf',
    interests: [
      'Nature', 'Wildlife', 'Bird Watching', 'Stargazing',
      'Hiking', 'Camping', 'Fishing', 'Hunting', 'Kayaking',
      'Canoeing', 'Sailing', 'Horseback Riding', 'Farming',
      'Environmental Conservation', 'Eco-tourism'
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive & Mechanics',
    icon: 'car',
    interests: [
      'Cars', 'Motorcycles', 'Racing', 'Car Modification',
      'Mechanics', 'Auto Shows', 'Road Trips', 'Classic Cars',
      'Electric Vehicles', 'Formula 1', 'MotoGP'
    ]
  }
];

// Flatten all interests for search/filter
export const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap(category => 
  category.interests.map(interest => ({
    value: interest,
    category: category.name,
    categoryId: category.id
  }))
);

// Relationship/Connection needs
export const NEED_OPTIONS = [
  {
    id: 'friendship',
    label: 'Friendship',
    description: 'Looking for platonic friends',
    icon: 'people'
  },
  {
    id: 'dating',
    label: 'Dating',
    description: 'Casual dating and getting to know people',
    icon: 'heart'
  },
  {
    id: 'relationship',
    label: 'Serious Relationship',
    description: 'Looking for a committed relationship',
    icon: 'heart-circle'
  },
  {
    id: 'boyfriend',
    label: 'Boyfriend',
    description: 'Looking for a boyfriend',
    icon: 'male'
  },
  {
    id: 'girlfriend',
    label: 'Girlfriend',
    description: 'Looking for a girlfriend',
    icon: 'female'
  },
  // LGBTQ+ inclusive options
  {
    id: 'queer_relationship',
    label: 'Queer Relationship',
    description: 'Open to relationships across the LGBTQ+ spectrum',
    icon: 'heart'
  },
  {
    id: 'lgbtq_friends',
    label: 'LGBTQ+ Friends',
    description: 'Looking for LGBTQ+ community and friendships',
    icon: 'people-circle'
  },
  {
    id: 'same_gender_connection',
    label: 'Same-gender Connection',
    description: 'Specifically looking to connect with the same gender',
    icon: 'male-female'
  },
  {
    id: 'casual',
    label: 'Casual',
    description: 'No strings attached, casual connections',
    icon: 'cafe'
  },
  {
    id: 'situationship',
    label: 'Situationship',
    description: 'Just a casual sexual hookup',
    icon: 'flame'
  },
  {
    id: 'networking',
    label: 'Professional Networking',
    description: 'Business and career connections',
    icon: 'briefcase'
  },
  {
    id: 'activity_partner',
    label: 'Activity Partner',
    description: 'Someone to do activities with',
    icon: 'bicycle'
  },
  {
    id: 'travel_buddy',
    label: 'Travel Buddy',
    description: 'Looking for travel companions',
    icon: 'airplane'
  },
  {
    id: 'study_partner',
    label: 'Study Partner',
    description: 'Academic or learning partner',
    icon: 'book'
  },
  {
    id: 'gym_buddy',
    label: 'Gym Buddy',
    description: 'Workout and fitness partner',
    icon: 'barbell'
  },
  {
    id: 'creative_collab',
    label: 'Creative Collaboration',
    description: 'Partner for creative projects',
    icon: 'color-palette'
  }
];

// Helper function to get interests by category
export const getInterestsByCategory = (categoryId) => {
  const category = INTEREST_CATEGORIES.find(cat => cat.id === categoryId);
  return category ? category.interests : [];
};

// Helper function to search interests
export const searchInterests = (query) => {
  if (!query) return ALL_INTERESTS;
  const lowerQuery = query.toLowerCase();
  return ALL_INTERESTS.filter(interest => 
    interest.value.toLowerCase().includes(lowerQuery) ||
    interest.category.toLowerCase().includes(lowerQuery)
  );
};

// Get popular interests (top picks)
export const POPULAR_INTERESTS = [
  'Travel', 'Music', 'Movies', 'Fitness', 'Food', 'Photography',
  'Reading', 'Gaming', 'Cooking', 'Yoga', 'Coffee', 'Art',
  'Hiking', 'Netflix', 'Gym', 'Fashion', 'Tech', 'Coding'
];
