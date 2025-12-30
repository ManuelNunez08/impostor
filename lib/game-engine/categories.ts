/**
 * Game categories and topics
 */

import { Category } from '../../types/game.js';

export const CATEGORIES: Category[] = [
  {
    id: 'household',
    name: 'Household Items',
    description: 'Common items found around the house',
    topics: [
      'Toothbrush',
      'Microwave',
      'Lamp',
      'Pillow',
      'Refrigerator',
      'Couch',
      'Television',
      'Blanket',
      'Clock',
      'Mirror',
      'Vacuum cleaner',
      'Dishwasher',
      'Curtains',
      'Doormat',
      'Coffee maker',
    ],
  },
  {
    id: 'animals',
    name: 'Animals',
    description: 'Various animals from around the world',
    topics: [
      'Elephant',
      'Penguin',
      'Dolphin',
      'Tiger',
      'Giraffe',
      'Kangaroo',
      'Owl',
      'Octopus',
      'Flamingo',
      'Panda',
      'Koala',
      'Whale',
      'Eagle',
      'Zebra',
      'Cheetah',
    ],
  },
  {
    id: 'food',
    name: 'Food & Drinks',
    description: 'Delicious foods and beverages',
    topics: [
      'Pizza',
      'Sushi',
      'Hamburger',
      'Ice cream',
      'Tacos',
      'Pasta',
      'Chocolate',
      'Coffee',
      'Orange juice',
      'Sandwich',
      'Salad',
      'Soup',
      'Bread',
      'Cheese',
      'Apple pie',
    ],
  },
  {
    id: 'professions',
    name: 'Professions',
    description: 'Different jobs and careers',
    topics: [
      'Doctor',
      'Teacher',
      'Chef',
      'Firefighter',
      'Pilot',
      'Farmer',
      'Musician',
      'Artist',
      'Scientist',
      'Engineer',
      'Lawyer',
      'Nurse',
      'Architect',
      'Journalist',
      'Plumber',
    ],
  },
  {
    id: 'sports',
    name: 'Sports & Activities',
    description: 'Sports, games, and physical activities',
    topics: [
      'Soccer',
      'Basketball',
      'Tennis',
      'Swimming',
      'Baseball',
      'Volleyball',
      'Golf',
      'Skiing',
      'Surfing',
      'Rock climbing',
      'Boxing',
      'Yoga',
      'Dancing',
      'Cycling',
      'Bowling',
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    description: 'Famous places and travel destinations',
    topics: [
      'Beach',
      'Mountain',
      'Desert',
      'Forest',
      'City',
      'Museum',
      'Airport',
      'Hotel',
      'Restaurant',
      'Park',
      'Zoo',
      'Castle',
      'Bridge',
      'Lighthouse',
      'Temple',
    ],
  },
];

export function getRandomCategory(): Category {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}

