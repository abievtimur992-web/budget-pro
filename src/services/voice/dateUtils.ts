export const parseRelativeDate = (text: string): string => {
  const lowerText = text.toLowerCase();
  const today = new Date();
  
  if (lowerText.includes('keshe') || lowerText.includes('keshe')) {
    today.setDate(today.getDate() - 1);
  } else if (lowerText.includes('erteń') || lowerText.includes('erten')) {
    today.setDate(today.getDate() + 1);
  }
  // Default is today
  return today.toISOString();
};
