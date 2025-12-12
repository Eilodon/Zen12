export const EMERGENCY_KEYWORDS = {
  vietnamese: [
    'muốn chết', 'tự tử', 'kết thúc cuộc đời', 'không muốn sống',
    'tuyệt vọng', 'không còn hy vọng', 'không chịu nổi', 'quá tải',
    'sụp đổ', 'panic', 'hoảng loạn', 'tim đập nhanh', 'khó thở',
    'bế tắc', 'cứu tôi', 'đau khổ tột cùng'
  ],
  english: [
    'want to die', 'kill myself', 'end it all', 'suicide',
    'can\'t take this', 'give up', 'no hope', 'panic attack',
    'chest pain', 'can\'t breathe', 'collapsing', 'help me'
  ]
};

export const detectEmergency = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return [...EMERGENCY_KEYWORDS.vietnamese, ...EMERGENCY_KEYWORDS.english]
    .some(keyword => lowerText.includes(keyword));
};