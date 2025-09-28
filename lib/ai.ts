import OpenAI from 'openai';

interface RawInsight {
  type?: string;
  title?: string;
  message?: string;
  action?: string;
  confidence?: number;
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'ExpenseTracker AI',
  },
});

export interface ExpenseRecord {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  message: string;
  action?: string;
  confidence: number;
}

export async function generateExpenseInsights(
  expenses: ExpenseRecord[]
): Promise<AIInsight[]> {
  try {
    // Prepare expense data for AI analysis
    const expensesSummary = expenses.map((expense) => ({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
    }));

    const prompt = `Analyze the following expense data and provide 3-4 actionable financial insights. 
    Return a JSON array of insights with this structure:
    {
      "type": "warning|info|success|tip",
      "title": "Brief title",
      "message": "Detailed insight message with specific numbers when possible",
      "action": "Actionable suggestion",
      "confidence": 0.8
    }

    Expense Data:
    ${JSON.stringify(expensesSummary, null, 2)}

    Focus on:
    1. Spending patterns (day of week, categories)
    2. Budget alerts (high spending areas)
    3. Money-saving opportunities
    4. Positive reinforcement for good habits

    Return only valid JSON array, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        {
          role: 'system',
          content:
            'You are a financial advisor AI that analyzes spending patterns and provides actionable insights. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    // Clean the response by removing markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');
    }

    // Parse AI response
    const insights = JSON.parse(cleanedResponse);

    // Add IDs and ensure proper format
    const formattedInsights = insights.map(
      (insight: RawInsight, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        type: insight.type || 'info',
        title: insight.title || 'AI Insight',
        message: insight.message || 'Analysis complete',
        action: insight.action,
        confidence: insight.confidence || 0.8,
      })
    );

    return formattedInsights;
  } catch (error: any) {
    console.error('❌ Error generating AI insights:', error);

    // Check if it's a rate limit error (429)
    if (error?.status === 429 || error?.code === 429) {
      console.log('🔄 Rate limit reached for AI insights');
      return [
        {
          id: 'fallback-rate-limit',
          type: 'warning',
          title: 'AI Analysis Rate Limited',
          message: 'AI service is temporarily rate limited. Your expenses are still being tracked normally. Try refreshing in a few minutes.',
          action: 'Try again later',
          confidence: 0.7,
        },
      ];
    }

    // Fallback to mock insights if AI fails
    return [
      {
        id: 'fallback-1',
        type: 'info',
        title: 'AI Analysis Unavailable',
        message:
          'Unable to generate personalized insights at this time. Please try again later.',
        action: 'Refresh insights',
        confidence: 0.5,
      },
    ];
  }
}

// Local keyword-based categorization fallback
function categorizeExpenseLocally(description: string): string {
  const desc = description.toLowerCase().trim();
  
  // Food & Dining keywords
  const foodKeywords = [
    'restaurant', 'food', 'coffee', 'lunch', 'dinner', 'breakfast', 'cafe', 'pizza', 
    'burger', 'sandwich', 'grocery', 'supermarket', 'market', 'bakery', 'bar', 'pub',
    'drink', 'beer', 'wine', 'snack', 'meal', 'eat', 'dining', 'takeout', 'delivery',
    'mcdonalds', 'starbucks', 'subway', 'kfc', 'dominos', 'uber eats', 'doordash',
    'grubhub', 'postmates', 'foodpanda', 'zomato', 'swiggy'
  ];
  
  // Transportation keywords
  const transportKeywords = [
    'gas', 'fuel', 'petrol', 'diesel', 'uber', 'lyft', 'taxi', 'bus', 'train', 'metro',
    'parking', 'toll', 'car', 'vehicle', 'transport', 'flight', 'airline', 'plane',
    'airport', 'rental', 'maintenance', 'repair', 'oil change', 'tire', 'insurance',
    'registration', 'license', 'subway', 'public transport', 'ride share', 'carpool'
  ];
  
  // Entertainment keywords
  const entertainmentKeywords = [
    'movie', 'cinema', 'theater', 'concert', 'music', 'game', 'gaming', 'netflix',
    'spotify', 'youtube', 'entertainment', 'fun', 'party', 'club', 'event', 'ticket',
    'show', 'performance', 'festival', 'amusement', 'park', 'zoo', 'museum', 'gallery',
    'bowling', 'pool', 'arcade', 'subscription', 'streaming', 'hulu', 'disney', 'prime'
  ];
  
  // Shopping keywords
  const shoppingKeywords = [
    'amazon', 'ebay', 'shop', 'store', 'mall', 'clothing', 'clothes', 'shoes', 'dress',
    'shirt', 'pants', 'jacket', 'electronics', 'phone', 'laptop', 'computer', 'gadget',
    'book', 'furniture', 'home', 'decor', 'gift', 'present', 'online', 'purchase',
    'buy', 'walmart', 'target', 'costco', 'nike', 'adidas', 'apple', 'samsung', 'sony'
  ];
  
  // Bills & Utilities keywords
  const billsKeywords = [
    'electric', 'electricity', 'power', 'water', 'gas bill', 'internet', 'wifi',
    'phone bill', 'mobile', 'cable', 'tv', 'utility', 'utilities', 'rent', 'mortgage',
    'insurance', 'loan', 'payment', 'subscription', 'service', 'maintenance', 'repair',
    'bank', 'fee', 'charge', 'bill', 'invoice', 'statement', 'credit card'
  ];
  
  // Healthcare keywords
  const healthcareKeywords = [
    'doctor', 'hospital', 'medical', 'medicine', 'pharmacy', 'drug', 'prescription',
    'health', 'dental', 'dentist', 'clinic', 'appointment', 'checkup', 'surgery',
    'treatment', 'therapy', 'insurance', 'copay', 'deductible', 'medication', 'pills',
    'vitamins', 'supplements', 'nurse', 'specialist', 'emergency', 'urgent care'
  ];

  // Check each category
  if (foodKeywords.some(keyword => desc.includes(keyword))) {
    return 'Food';
  }
  if (transportKeywords.some(keyword => desc.includes(keyword))) {
    return 'Transportation';
  }
  if (entertainmentKeywords.some(keyword => desc.includes(keyword))) {
    return 'Entertainment';
  }
  if (shoppingKeywords.some(keyword => desc.includes(keyword))) {
    return 'Shopping';
  }
  if (billsKeywords.some(keyword => desc.includes(keyword))) {
    return 'Bills';
  }
  if (healthcareKeywords.some(keyword => desc.includes(keyword))) {
    return 'Healthcare';
  }
  
  return 'Other';
}

export async function categorizeExpense(description: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        {
          role: 'system',
          content:
            'You are an expense categorization AI. Categorize expenses into one of these categories: Food, Transportation, Entertainment, Shopping, Bills, Healthcare, Other. Respond with only the category name.',
        },
        {
          role: 'user',
          content: `Categorize this expense: "${description}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 20,
    });

    const category = completion.choices[0].message.content?.trim();

    const validCategories = [
      'Food',
      'Transportation',
      'Entertainment',
      'Shopping',
      'Bills',
      'Healthcare',
      'Other',
    ];

    const finalCategory = validCategories.includes(category || '')
      ? category!
      : 'Other';
    return finalCategory;
  } catch (error: any) {
    console.error('❌ Error categorizing expense:', error);
    
    // Check if it's a rate limit error (429)
    if (error?.status === 429 || error?.code === 429) {
      console.log('🔄 Rate limit reached, using local categorization fallback');
      return categorizeExpenseLocally(description);
    }
    
    // For any other error, also use local fallback
    console.log('🔄 AI unavailable, using local categorization fallback');
    return categorizeExpenseLocally(description);
  }
}

export async function generateAIAnswer(
  question: string,
  context: ExpenseRecord[]
): Promise<string> {
  try {
    const expensesSummary = context.map((expense) => ({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
    }));

    const prompt = `Based on the following expense data, provide a detailed and actionable answer to this question: "${question}"

    Expense Data:
    ${JSON.stringify(expensesSummary, null, 2)}

    Provide a comprehensive answer that:
    1. Addresses the specific question directly
    2. Uses concrete data from the expenses when possible
    3. Offers actionable advice
    4. Keeps the response concise but informative (2-3 sentences)
    
    Return only the answer text, no additional formatting.`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful financial advisor AI that provides specific, actionable answers based on expense data. Be concise but thorough.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    return response.trim();
  } catch (error: any) {
    console.error('❌ Error generating AI answer:', error);
    
    // Check if it's a rate limit error (429)
    if (error?.status === 429 || error?.code === 429) {
      return "The AI service is currently rate limited. Your question will be answered once the service is available again. Please try again in a few minutes.";
    }
    
    return "I'm unable to provide a detailed answer at the moment. Please try refreshing the insights or check your connection.";
  }
}