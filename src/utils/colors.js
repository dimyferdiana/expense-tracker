// Color mappings for categories and tags
export const colorClasses = {
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  lime: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
};

// Get color classes for a category or tag
export const getColorClasses = (colorName) => {
  return colorClasses[colorName] || colorClasses.gray;
};

// Convert full color class string to color name
export const getColorName = (colorClass) => {
  for (const [name, classes] of Object.entries(colorClasses)) {
    if (classes === colorClass) {
      return name;
    }
  }
  return 'gray';
};

// List of available colors
export const availableColors = Object.keys(colorClasses); 