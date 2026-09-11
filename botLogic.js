import fs from 'fs';
import path from 'path';

/**
 * Conversation States:
 * - NOT_STARTED: Initial state or after reset. User must type 'Ready' to begin.
 * - WAITING_FOR_DETAILS: Bot asked for name and location.
 * - WAITING_FOR_LOCATION_CLARIFICATION: When location was ambiguous (Nairobi vs outside).
 * - NAIROBI_TRAINING: Bot asked if user can attend physical training at Caxton House.
 * - ONLINE_TRAINING: Bot asked if user can attend online training session.
 * - COMPLETED: Training session accepted/concluded.
 */
export const ConversationStates = {
  NOT_STARTED: 'NOT_STARTED',
  WAITING_FOR_DETAILS: 'WAITING_FOR_DETAILS',
  WAITING_FOR_LOCATION_CLARIFICATION: 'WAITING_FOR_LOCATION_CLARIFICATION',
  NAIROBI_TRAINING: 'NAIROBI_TRAINING',
  ONLINE_TRAINING: 'ONLINE_TRAINING',
  COMPLETED: 'COMPLETED',
};

// Known Nairobi locations (case-insensitive)
const NAIROBI_LOCATIONS = [
  'nairobi',
  'nairobi cbd',
  'cbd',
  'westlands',
  'kasarani',
  'embakasi',
  'karen',
  'ruaka',
  'kiambu road',
  'kilimani',
  'upper hill',
  'upperhill',
  'parklands',
  'langata',
  "lang'ata",
  'roysambu',
  'south b',
  'south c',
  'eastleigh',
  'pangani',
  'ngara',
  'thika road',
  'ruiru',
  'kahawa',
  'kahawa west',
  'kahawa wendani',
  'zimmerman',
  'githurai',
  'juja',
  'kikuyu',
  'uthiru',
  'dagoretti',
  'ngong',
  'rongai',
  'ongata rongai',
  'kitengela',
  'syokimau',
  'mlolongo',
  'donholm',
  'buruburu',
  'umoja',
  'fedha',
  'komarock',
  'dandora',
  'kayole',
  'ruai',
  'kangemi',
  'kawangware',
  'lavington',
  'kileleshwa',
  'muthaiga',
  'runda',
  'gigiri',
  'rosslyn',
  'spring valley',
  'highridge',
  'madaraka',
  'nairobi west'
];

// Known towns outside Nairobi
const OUTSIDE_LOCATIONS = [
  'kisii',
  'kisumu',
  'mombasa',
  'nakuru',
  'eldoret',
  'kakamega',
  'nyeri',
  'machakos',
  'meru',
  'naivasha',
  'kericho',
  'kitale',
  'malindi',
  'thika',
  'embu',
  'bungoma',
  'busia',
  'homabay',
  'homa bay',
  'migori',
  'nyamira',
  'siaya',
  'kitui',
  'garissa',
  'wajir',
  'mandera',
  'marsabit',
  'isiolo',
  'lamu',
  'kilifi',
  'kwale',
  'taita taveta',
  'voi',
  'kajiado',
  'narok',
  'bomet',
  'baringo',
  'kabarnet',
  'laikipia',
  'nanyuki',
  'samburu',
  'turkana',
  'lodwar',
  'west pokot',
  'kapenguria',
  'trans nzoia',
  'elgeyo marakwet',
  'iten',
  'uasin gishu',
  'nandi',
  'kapsabet',
  'kirinyaga',
  'kerugoya',
  'murang\'a',
  'muranga',
  'kiambu town',
  'limuru'
];

// In-memory state store backed by optional JSON persistence
class ConversationStore {
  constructor(filePath = 'conversation_states.json') {
    this.filePath = path.resolve(process.cwd(), filePath);
    this.states = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          this.states.set(key, val);
        }
      }
    } catch (err) {
      console.warn('Could not load conversation states from disk, starting fresh:', err.message);
    }
  }

  save() {
    try {
      const obj = Object.fromEntries(this.states);
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.warn('Could not save conversation states to disk:', err.message);
    }
  }

  get(phone) {
    return this.states.get(phone) || {
      phone,
      state: ConversationStates.NOT_STARTED,
      name: '',
      location: '',
      isNairobi: null,
      updatedAt: new Date().toISOString(),
    };
  }

  set(phone, data) {
    const updated = {
      ...this.get(phone),
      ...data,
      phone,
      updatedAt: new Date().toISOString(),
    };
    this.states.set(phone, updated);
    this.save();
    return updated;
  }

  reset(phone) {
    const cleared = {
      phone,
      state: ConversationStates.NOT_STARTED,
      name: '',
      location: '',
      isNairobi: null,
      updatedAt: new Date().toISOString(),
    };
    this.states.set(phone, cleared);
    this.save();
    return cleared;
  }

  getAll() {
    return Array.from(this.states.values());
  }
}

export const conversationStore = new ConversationStore();

/**
 * Determine if a location is in Nairobi, outside Nairobi, or ambiguous
 * Returns: 'NAIROBI' | 'OUTSIDE' | 'AMBIGUOUS'
 */
export function classifyLocation(locStr) {
  if (!locStr) return 'AMBIGUOUS';
  const clean = locStr.toLowerCase().trim();

  // Explicit check for Nairobi keywords
  for (const nLoc of NAIROBI_LOCATIONS) {
    // Check whole word or substring boundary
    const regex = new RegExp(`\\b${nLoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(clean)) {
      return 'NAIROBI';
    }
  }

  // Explicit check for Outside Nairobi locations
  for (const oLoc of OUTSIDE_LOCATIONS) {
    const regex = new RegExp(`\\b${oLoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(clean)) {
      return 'OUTSIDE';
    }
  }

  // Check if string contains "outside nairobi" or "not in nairobi"
  if (clean.includes('outside nairobi') || clean.includes('outside') || clean.includes('upcountry')) {
    return 'OUTSIDE';
  }

  return 'AMBIGUOUS';
}

/**
 * Section 20 Question-Answering Engine.
 * Answers prospect questions using strictly verified information from Bonan Vivon administrators.
 * Returns { isQuestion: boolean, answer: string | null }
 */
export function answerQuestion(rawText, userState) {
  if (!rawText) return { isQuestion: false, answer: null };

  const text = rawText.trim();
  const lower = text.toLowerCase();

  // Quick check if input is a question
  const hasQuestionMark = text.includes('?');
  const startsWithQuestionWord = /^(what|where|when|who|why|how|is|are|can|could|will|would|do|does|am i|tell me|explain|clarify)\b/i.test(text);
  
  // Specific question keywords
  const hasQuestionKeywords = /(bonan vivon|how it works|how does it work|how to join|need to join|is it online|where is the training|where.*office|caxton|travel to nairobi|happens during|what will i learn|how long|duration|ask questions|legitimate|legit|scam|pyramid|fraud|cost|fee|fees|price|how much|earn|income|salary|profits|guaranteed|what time)/i.test(lower);

  if (!hasQuestionMark && !startsWithQuestionWord && !hasQuestionKeywords) {
    return { isQuestion: false, answer: null };
  }

  // 1. "What is Bonan Vivon?"
  if (
    /what\s+(is|about|does)\s+bonan/i.test(lower) ||
    /who\s+(is|are)\s+bonan/i.test(lower) ||
    /what('s|\s+is)\s+this\s+project/i.test(lower) ||
    /tell\s+me\s+about\s+(bonan|the\s+project)/i.test(lower) ||
    /explain\s+(bonan|the\s+project)/i.test(lower) ||
    lower === 'what is bonan vivon?' ||
    lower === 'what is bonan vivon'
  ) {
    return {
      isQuestion: true,
      answer:
        "*Bonan Vivon Project* is an international non-governmental initiative that shows selected people how to generate cashflow for personal projects and residual income without interest or collateral."
    };
  }

  // 2. "How does it work?"
  if (
    /how\s+does\s+(it|this|the\s+project|the\s+system)\s+work/i.test(lower) ||
    /how\s+it\s+works/i.test(lower) ||
    /how\s+do\s+you\s+work/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "The project introduces selected people to a system and provides training on how it works. The training is the best place to understand the process in detail and ask questions before making any decisions."
    };
  }

  // 3. "What do I need to join?" / How to join / Requirements
  if (
    /what\s+do\s+i\s+need\s+to\s+join/i.test(lower) ||
    /how\s+(do\s+i|to|can\s+i)\s+join/i.test(lower) ||
    /requirements/i.test(lower) ||
    /qualification/i.test(lower) ||
    /who\s+qualifies/i.test(lower) ||
    /what\s+is\s+required/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "The first step is to understand the project through the training. I can help you get started with the appropriate training session."
    };
  }

  // 4. "Do I have to travel to Nairobi?"
  if (
    /travel\s+to\s+nairobi/i.test(lower) ||
    /must\s+i\s+(travel|come)\s+to\s+nairobi/i.test(lower) ||
    /do\s+i\s+(have|need)\s+to\s+(travel|come)\s+to\s+nairobi/i.test(lower) ||
    /should\s+i\s+come\s+to\s+nairobi/i.test(lower) ||
    /come\s+all\s+the\s+way\s+to\s+nairobi/i.test(lower)
  ) {
    if (userState.isNairobi === false) {
      return {
        isQuestion: true,
        answer: "No. If you're outside Nairobi, you can attend the training online."
      };
    }
    return {
      isQuestion: true,
      answer: "No. If you're outside Nairobi, you can attend the training online without traveling."
    };
  }

  // 5. "Is it online?"
  if (
    /is\s+(it|the\s+training|this)\s+online/i.test(lower) ||
    /can\s+i\s+(attend|do\s+it)\s+online/i.test(lower) ||
    /is\s+there\s+an\s+online\s+(option|session|training)/i.test(lower) ||
    /virtual\s+training/i.test(lower)
  ) {
    if (userState.isNairobi === false) {
      return {
        isQuestion: true,
        answer: "Yes. Since you're outside Nairobi, you can attend an online training session."
      };
    } else if (userState.isNairobi === true) {
      return {
        isQuestion: true,
        answer:
          "If you're in Nairobi, you can attend the physical training at Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building. An online option can also be discussed if necessary."
      };
    } else {
      return {
        isQuestion: true,
        answer:
          "If you're in Nairobi, you can attend physical training at Caxton House, 1st Floor, Kenyatta Avenue. If you're outside Nairobi, you can attend an online training session."
      };
    }
  }

  // 6. "Where is the training?" / Where is the office?
  if (
    /where\s+(is|are)\s+(the\s+training|training|the\s+office|your\s+office|your\s+offices|it\s+located|you\s+located)/i.test(lower) ||
    /where\s+does\s+it\s+take\s+place/i.test(lower) ||
    /office\s+location/i.test(lower) ||
    /where\s+at\s+caxton/i.test(lower)
  ) {
    if (userState.isNairobi === true) {
      return {
        isQuestion: true,
        answer:
          "The physical training is at Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building."
      };
    } else if (userState.isNairobi === false) {
      return {
        isQuestion: true,
        answer:
          "You can attend an online training session, so you don't need to travel to Nairobi."
      };
    } else {
      return {
        isQuestion: true,
        answer:
          "The physical training is at Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building. If you're outside Nairobi, you can attend an online training session so you don't need to travel."
      };
    }
  }

  // 7. "What happens during the training?" / What is taught?
  if (
    /what\s+happens\s+(during|in)\s+(the\s+)?training/i.test(lower) ||
    /what\s+is\s+taught/i.test(lower) ||
    /what\s+will\s+i\s+learn/i.test(lower) ||
    /what\s+do\s+you\s+teach/i.test(lower) ||
    /what\s+is\s+covered/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "The training explains the project, how the system works, and gives you an opportunity to ask questions so you can understand it clearly."
    };
  }

  // 8. "How long is the training?" / Duration
  if (
    /how\s+long\s+(is|does\s+it\s+take|will\s+it\s+take)/i.test(lower) ||
    /duration/i.test(lower) ||
    /how\s+many\s+hours/i.test(lower) ||
    /how\s+many\s+days/i.test(lower) ||
    /how\s+many\s+minutes/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "I don't want to give you an incorrect duration. The Bonan Vivon team can confirm the current training schedule."
    };
  }

  // 9. "Can I ask questions during training?"
  if (
    /can\s+i\s+ask\s+questions/i.test(lower) ||
    /allowed\s+to\s+ask\s+questions/i.test(lower) ||
    /will\s+i\s+be\s+able\s+to\s+ask\s+questions/i.test(lower) ||
    /is\s+there\s+q(&|and)a/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "Yes. The training is also an opportunity to ask questions and get clarification about the project."
    };
  }

  // 10. "Is income guaranteed?" (Check before general income questions)
  if (
    /guaranteed\s+(income|profits?|returns?|money)/i.test(lower) ||
    /is\s+(income|profit|money)\s+guaranteed/i.test(lower) ||
    /guarantee/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "No specific income should be assumed or guaranteed. The training is intended to help you understand the project before making your own decision."
    };
  }

  // 11. "How much can I earn?" / Income / Profits
  if (
    /how\s+much\s+(can\s+i|will\s+i|do\s+i)\s+(earn|make|get)/i.test(lower) ||
    /what\s+is\s+the\s+(salary|income|profit|earnings)/i.test(lower) ||
    /how\s+much\s+money\s+can\s+i\s+make/i.test(lower) ||
    /income\s+potential/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "Income can depend on individual circumstances and the activities involved. I can't promise or estimate a specific amount. The training is the best place to understand the opportunity and ask questions."
    };
  }

  // 12. "Is it legitimate?" / Scam / Real / Pyramid / Registered
  if (
    /legitimate/i.test(lower) ||
    /legit\b/i.test(lower) ||
    /scam/i.test(lower) ||
    /genuine/i.test(lower) ||
    /is\s+it\s+real/i.test(lower) ||
    /pyramid/i.test(lower) ||
    /ponzi/i.test(lower) ||
    /fraud/i.test(lower) ||
    /legal\s+status/i.test(lower) ||
    /government\s+approval/i.test(lower) ||
    /is\s+it\s+registered/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "It's understandable to want to verify things before proceeding. The training gives you an opportunity to learn more and ask questions directly. I can also have the Bonan Vivon team clarify any specific concerns you have."
    };
  }

  // 13. "How much does it cost?" / Fees / Payment / Price
  if (
    /how\s+much\s+(does\s+it\s+cost|is\s+it|to\s+join)/i.test(lower) ||
    /registration\s+fee/i.test(lower) ||
    /joining\s+(fee|cost)/i.test(lower) ||
    /is\s+it\s+free/i.test(lower) ||
    /any\s+(fees?|charges?|payment|cost)/i.test(lower) ||
    /do\s+i\s+(have\s+to\s+)?pay/i.test(lower) ||
    /what\s+is\s+the\s+(cost|fee|price)/i.test(lower)
  ) {
    return {
      isQuestion: true,
      answer:
        "I don't have an official cost to provide here. The Bonan Vivon team can clarify any current costs or requirements during the appropriate stage."
    };
  }

  // 14. Unrelated Safe Question: "What time is it?"
  if (
    /what\s+(time\s+is\s+it|is\s+the\s+time)/i.test(lower) ||
    /current\s+time/i.test(lower) ||
    /time\s+now/i.test(lower)
  ) {
    try {
      const nowEat = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Nairobi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date());
      return {
        isQuestion: true,
        answer: `It's currently ${nowEat} in Nairobi (EAT). Would you like to continue with the Bonan Vivon training information?`
      };
    } catch {
      return {
        isQuestion: true,
        answer: "Would you like to continue with the Bonan Vivon training information?"
      };
    }
  }

  // 15. Other Question: Any other interrogative or unknown question
  if (hasQuestionMark || startsWithQuestionWord) {
    return {
      isQuestion: true,
      answer:
        "That's a good question. I don't want to give you incorrect information, so I'll have the Bonan Vivon team clarify that for you."
    };
  }

  return { isQuestion: false, answer: null };
}

/**
 * Returns the polite continuity prompt for the prospect's current state.
 */
export function getContinuationMessage(userState) {
  switch (userState.state) {
    case ConversationStates.NOT_STARTED:
      return "To begin, please type *Ready*.";
    case ConversationStates.WAITING_FOR_DETAILS:
      return "To help us get you set up with the right training, please share your *name and location* in one message.";
    case ConversationStates.WAITING_FOR_LOCATION_CLARIFICATION:
      return "To help guide you to the right session, are you currently based in *Nairobi* or *outside Nairobi*?";
    case ConversationStates.NAIROBI_TRAINING:
      return "Since you're in Nairobi, would you be able to attend the physical training at our main offices:\n\n*Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building.*?";
    case ConversationStates.ONLINE_TRAINING:
      return "Since you're outside Nairobi, would you be available to attend an *online training session*?";
    case ConversationStates.COMPLETED:
      return "";
    default:
      return "Please type *Ready* when you're ready to begin.";
  }
}

/**
 * Extract prospect name and location from various natural message formats
 */
export function extractNameAndLocation(text) {
  if (!text) return null;
  const raw = text.trim();

  // Pattern 1: Delimiters like —, -, –, ,, /
  // e.g. "Felix — Nairobi", "Felix, Nairobi", "Felix / Kisumu", "Felix - Westlands"
  const delimiterMatch = raw.match(/^([a-zA-Z\s'.]+?)\s*(?:—|–|-|,|\/)\s*(.+)$/i);
  if (delimiterMatch) {
    const name = cleanName(delimiterMatch[1]);
    const location = cleanLocation(delimiterMatch[2]);
    if (name && location) {
      return { name, location };
    }
  }

  // Pattern 2: "My name is [Name] and I'm in/from [Location]"
  const sentenceMatch1 = raw.match(/(?:my name is|i am|i'm)\s+([a-zA-Z\s'.]+?)\s+(?:and\s+)?(?:i'm in|i am in|in|from)\s+(.+)/i);
  if (sentenceMatch1) {
    const name = cleanName(sentenceMatch1[1]);
    const location = cleanLocation(sentenceMatch1[2]);
    if (name && location) {
      return { name, location };
    }
  }

  // Pattern 3: "[Name] from [Location]"
  const sentenceMatch2 = raw.match(/^([a-zA-Z\s'.]+?)\s+from\s+(.+)$/i);
  if (sentenceMatch2) {
    const name = cleanName(sentenceMatch2[1]);
    const location = cleanLocation(sentenceMatch2[2]);
    if (name && location) {
      return { name, location };
    }
  }

  // Pattern 4: Key-value style: "Name: Felix Location: Nairobi"
  const kvMatch = raw.match(/name:\s*([^,\n]+?)(?:[,\n\s]+location:\s*|\s+in\s+)(.+)/i);
  if (kvMatch) {
    const name = cleanName(kvMatch[1]);
    const location = cleanLocation(kvMatch[2]);
    if (name && location) {
      return { name, location };
    }
  }

  // Pattern 5: Two or three words where the last word is a recognized city/town
  const words = raw.split(/\s+/);
  if (words.length >= 2 && words.length <= 4) {
    const lastWord = words[words.length - 1];
    const cityClass = classifyLocation(lastWord);
    if (cityClass !== 'AMBIGUOUS') {
      const name = cleanName(words.slice(0, words.length - 1).join(' '));
      const location = cleanLocation(lastWord);
      if (name && location) {
        return { name, location };
      }
    }
  }

  return null;
}

function cleanName(str) {
  if (!str) return '';
  return str
    .replace(/^(my name is|i am|i'm|name:\s*)/i, '')
    .trim()
    .replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function cleanLocation(str) {
  if (!str) return '';
  return str
    .replace(/^(location:\s*|i am in\s*|i'm in\s*|based in\s*|stay in\s*|in\s*|from\s*)/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();
}

/**
 * Main dialogue engine.
 * Receives phone number and raw message text, returns array of reply messages to send.
 */
export function handleIncomingMessage(phone, rawText) {
  const trimmed = (rawText || '').trim();
  const lower = trimmed.toLowerCase();

  // Handle global reset / restart command
  if (lower === 'reset' || lower === 'restart') {
    conversationStore.reset(phone);
    return [
      "No problem 👍 Let's start again.\n\nPlease type *Ready* when you're ready to begin."
    ];
  }

  const userState = conversationStore.get(phone);

  // If user sends 'ready' at any time, restart conversation
  if (lower === 'ready') {
    conversationStore.set(phone, {
      state: ConversationStates.WAITING_FOR_DETAILS,
      name: '',
      location: '',
      isNairobi: null,
    });
    return [
      "Welcome to Bonan Vivon Project! 👋\n\nTo get started, please send me your *name and location* in one message."
    ];
  }

  // Check if incoming message is a question or contains a question
  const qResult = answerQuestion(trimmed, userState);

  // If it is a question, answer it first, then continue conversation from the appropriate state
  if (qResult.isQuestion) {
    const answer = qResult.answer;

    // STATE: NOT_STARTED
    if (userState.state === ConversationStates.NOT_STARTED) {
      return [
        answer,
        "To begin and explore the project, please type *Ready*."
      ];
    }

    // STATE: WAITING_FOR_DETAILS
    if (userState.state === ConversationStates.WAITING_FOR_DETAILS) {
      // Check if user ALSO provided name and location in the same message
      const extracted = extractNameAndLocation(trimmed);
      if (extracted && extracted.name && extracted.location) {
        const { name, location } = extracted;
        const classification = classifyLocation(location);

        if (classification === 'NAIROBI') {
          conversationStore.set(phone, {
            state: ConversationStates.NAIROBI_TRAINING,
            name,
            location,
            isNairobi: true,
          });

          return [
            answer,
            `Nice to meet you, ${name}! 👋\n\nSince you're in Nairobi, you can attend the training physically at our main offices:\n\n*Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building.*\n\nWould you be able to attend the training there?`
          ];
        } else if (classification === 'OUTSIDE') {
          conversationStore.set(phone, {
            state: ConversationStates.ONLINE_TRAINING,
            name,
            location,
            isNairobi: false,
          });

          return [
            answer,
            `Nice to meet you, ${name}! 👋\n\nSince you're outside Nairobi, no problem. You can attend an *online training session* instead.\n\nWould you be available to attend an online training session?`
          ];
        } else {
          conversationStore.set(phone, {
            state: ConversationStates.WAITING_FOR_LOCATION_CLARIFICATION,
            name,
            location,
            isNairobi: null,
          });

          return [
            answer,
            `Nice to meet you, ${name}! 👋\n\nTo help guide you to the right session, are you currently based in Nairobi or outside Nairobi?`
          ];
        }
      }

      return [
        answer,
        "To help us get you set up with the right training, please share your *name and location* in one message."
      ];
    }

    // STATE: WAITING_FOR_LOCATION_CLARIFICATION
    if (userState.state === ConversationStates.WAITING_FOR_LOCATION_CLARIFICATION) {
      const classification = classifyLocation(trimmed);

      if (classification === 'NAIROBI' || lower.includes('in nairobi')) {
        conversationStore.set(phone, {
          state: ConversationStates.NAIROBI_TRAINING,
          isNairobi: true,
        });

        return [
          answer,
          "Since you're in Nairobi, you can attend the training physically at our main offices:\n\n*Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building.*\n\nWould you be able to attend the training there?"
        ];
      } else if (classification === 'OUTSIDE' || lower.includes('outside')) {
        conversationStore.set(phone, {
          state: ConversationStates.ONLINE_TRAINING,
          isNairobi: false,
        });

        return [
          answer,
          "Since you're outside Nairobi, no problem. You can attend an *online training session* instead.\n\nWould you be available to attend an online training session?"
        ];
      }

      return [
        answer,
        "To help guide you to the right session, are you currently based in Nairobi or outside Nairobi?"
      ];
    }

    // STATE: NAIROBI_TRAINING
    if (userState.state === ConversationStates.NAIROBI_TRAINING) {
      const isAffirmative = /\b(yes|yeah|yep|sure|okay|ok|i can|i will|definitely|available|ndio|sawa)\b/i.test(lower);
      const isNegative = /\b(no|nope|cannot|can't|unable|not available|hapana)\b/i.test(lower);

      if (isAffirmative) {
        conversationStore.set(phone, { state: ConversationStates.COMPLETED });
        return [
          answer,
          `Wonderful, ${userState.name || 'there'}! 👍 We've noted your availability for the in-person training at our main offices:\n\n*Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building.*\n\nOur coordinator will contact you with session timing and directions. We look forward to meeting you!`
        ];
      } else if (isNegative) {
        conversationStore.set(phone, { state: ConversationStates.ONLINE_TRAINING, isNairobi: false });
        return [
          answer,
          "No problem at all! If attending physically isn't convenient, you can attend an *online training session* instead.\n\nWould you be available to attend an online training session?"
        ];
      }

      return [
        answer,
        "Would you be able to attend the in-person training at our Caxton House office on Kenyatta Avenue? A simple *Yes* or *No* is perfect."
      ];
    }

    // STATE: ONLINE_TRAINING
    if (userState.state === ConversationStates.ONLINE_TRAINING) {
      const isAffirmative = /\b(yes|yeah|yep|sure|okay|ok|i can|i will|available|definitely|ndio|sawa)\b/i.test(lower);
      const isNegative = /\b(no|nope|not now|busy|cannot|can't|hapana)\b/i.test(lower);

      if (isAffirmative) {
        conversationStore.set(phone, { state: ConversationStates.COMPLETED });
        return [
          answer,
          `Great, ${userState.name || 'there'}! 👍 We've noted your interest for the online training session.\n\nWe will share the session link, date, and time right here on WhatsApp. The session will take you through the project and give you an opportunity to ask questions.\n\nLooking forward to having you with us!`
        ];
      } else if (isNegative) {
        conversationStore.set(phone, { state: ConversationStates.COMPLETED });
        return [
          answer,
          `Thank you for letting us know, ${userState.name || 'there'}. Whenever your schedule opens up, feel free to message *Ready* to explore future sessions. Have a great day!`
        ];
      }

      return [
        answer,
        "Would you be available to attend an online training session? Please reply with *Yes* or *No*."
      ];
    }

    // STATE: COMPLETED
    if (userState.state === ConversationStates.COMPLETED) {
      return [answer];
    }

    const cont = getContinuationMessage(userState);
    if (cont) {
      return [answer, cont];
    }
    return [answer];
  }

  // STATE: NOT_STARTED
  if (userState.state === ConversationStates.NOT_STARTED) {
    // Bot must NOT begin until person types Ready
    return [
      "Welcome to Bonan Vivon Project. To begin, please type *Ready*."
    ];
  }

  // STATE: WAITING_FOR_DETAILS
  if (userState.state === ConversationStates.WAITING_FOR_DETAILS) {
    const extracted = extractNameAndLocation(trimmed);

    if (!extracted || !extracted.name || !extracted.location) {
      return [
        "Please send your *name and location* together in one message so we can assist you properly."
      ];
    }

    const { name, location } = extracted;
    const classification = classifyLocation(location);

    if (classification === 'NAIROBI') {
      conversationStore.set(phone, {
        state: ConversationStates.NAIROBI_TRAINING,
        name,
        location,
        isNairobi: true,
      });

      return [
        `Nice to meet you, ${name}! 👋\n\n*Bonan Vivon Project* is an international non-governmental initiative that shows selected people how to generate cashflow for personal projects and residual income without interest or collateral.`,
        "Since you're in Nairobi, you can attend the training physically at our main offices:\n\n*Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building.*\n\nWould you be able to attend the training there?"
      ];
    } else if (classification === 'OUTSIDE') {
      conversationStore.set(phone, {
        state: ConversationStates.ONLINE_TRAINING,
        name,
        location,
        isNairobi: false,
      });

      return [
        `Nice to meet you, ${name}! 👋\n\n*Bonan Vivon Project* is an international non-governmental initiative that shows selected people how to generate cashflow for personal projects and residual income without interest or collateral.`,
        "Since you're outside Nairobi, no problem. You can attend an *online training session* instead. The online session will take you through the project and give you an opportunity to ask questions.\n\nWould you be available to attend an online training session?"
      ];
    } else {
      // Ambiguous location
      conversationStore.set(phone, {
        state: ConversationStates.WAITING_FOR_LOCATION_CLARIFICATION,
        name,
        location,
        isNairobi: null,
      });

      return [
        `Nice to meet you, ${name}! 👋\n\n*Bonan Vivon Project* is an international non-governmental initiative that shows selected people how to generate cashflow for personal projects and residual income without interest or collateral.`,
        "To help guide you to the right session, are you currently based in Nairobi or outside Nairobi?"
      ];
    }
  }

  // STATE: WAITING_FOR_LOCATION_CLARIFICATION
  if (userState.state === ConversationStates.WAITING_FOR_LOCATION_CLARIFICATION) {
    const classification = classifyLocation(trimmed);

    if (classification === 'NAIROBI' || lower.includes('nairobi') || lower === 'in nairobi') {
      conversationStore.set(phone, {
        state: ConversationStates.NAIROBI_TRAINING,
        isNairobi: true,
      });

      return [
        "Since you're in Nairobi, you can attend the training physically at our main offices:\n\n*Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building.*\n\nWould you be able to attend the training there?"
      ];
    } else if (classification === 'OUTSIDE' || lower.includes('outside') || lower.includes('not in nairobi') || lower.includes('outside nairobi')) {
      conversationStore.set(phone, {
        state: ConversationStates.ONLINE_TRAINING,
        isNairobi: false,
      });

      return [
        "Since you're outside Nairobi, no problem. You can attend an *online training session* instead. The online session will take you through the project and give you an opportunity to ask questions.\n\nWould you be available to attend an online training session?"
      ];
    } else {
      return [
        "Are you currently based in Nairobi or outside Nairobi? Please reply with either *Nairobi* or *Outside Nairobi*."
      ];
    }
  }

  // STATE: NAIROBI_TRAINING
  if (userState.state === ConversationStates.NAIROBI_TRAINING) {
    const isAffirmative = /^(yes|yeah|yep|sure|okay|ok|i can|i will|definitely|available|yes please|i am able|can attend|ndio|sawa)/i.test(lower);
    const isNegative = /^(no|nope|cannot|can't|unable|not available|far|impossible|hapana)/i.test(lower);

    if (isAffirmative) {
      conversationStore.set(phone, { state: ConversationStates.COMPLETED });
      return [
        `Wonderful, ${userState.name || 'there'}! 👍 We've noted your availability for the in-person training at our main offices:\n\n*Caxton House, 1st Floor, Kenyatta Avenue, Nairobi, near GPO / opposite I&M Building.*\n\nOur coordinator will contact you with session timing and directions. We look forward to meeting you!`
      ];
    } else if (isNegative) {
      conversationStore.set(phone, { state: ConversationStates.ONLINE_TRAINING, isNairobi: false });
      return [
        "No problem at all! If attending physically isn't convenient, you can attend an *online training session* instead.\n\nWould you be available to attend an online training session?"
      ];
    } else {
      return [
        "Would you be able to attend the in-person training at our Caxton House office on Kenyatta Avenue? A simple *Yes* or *No* is perfect."
      ];
    }
  }

  // STATE: ONLINE_TRAINING
  if (userState.state === ConversationStates.ONLINE_TRAINING) {
    const isAffirmative = /^(yes|yeah|yep|sure|okay|ok|i am|i will|available|definitely|yes please|ndio|sawa)/i.test(lower);
    const isNegative = /^(no|nope|not now|busy|cannot|can't|hapana)/i.test(lower);

    if (isAffirmative) {
      conversationStore.set(phone, { state: ConversationStates.COMPLETED });
      return [
        `Great, ${userState.name || 'there'}! 👍 We've noted your interest for the online training session.\n\nWe will share the session link, date, and time right here on WhatsApp. The session will take you through the project and give you an opportunity to ask questions.\n\nLooking forward to having you with us!`
      ];
    } else if (isNegative) {
      conversationStore.set(phone, { state: ConversationStates.COMPLETED });
      return [
        `Thank you for letting us know, ${userState.name || 'there'}. Whenever your schedule opens up, feel free to message *Ready* to explore future sessions. Have a great day!`
      ];
    } else {
      return [
        "Would you be available to attend an online training session? Please reply with *Yes* or *No*."
      ];
    }
  }

  // STATE: COMPLETED
  if (userState.state === ConversationStates.COMPLETED) {
    if (lower.includes('thank') || lower.includes('asante')) {
      return [
        "You're welcome! Feel free to ask any questions anytime."
      ];
    }
    return [
      "If you have any questions about Bonan Vivon Project or your training session, feel free to ask anytime!"
    ];
  }

  return [
    "Welcome to Bonan Vivon Project. To begin, please type *Ready*."
  ];
}
