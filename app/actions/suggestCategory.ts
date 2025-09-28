'use server';

import { categorizeExpense } from '@/lib/ai';

export async function suggestCategory(
  description: string
): Promise<{ category: string; error?: string }> {
  try {
    if (!description || description.trim().length < 2) {
      return {
        category: 'Other',
        error: 'Description too short for analysis',
      };
    }

    const category = await categorizeExpense(description.trim());
    
    // Check if we got a valid category (the AI function now handles fallbacks internally)
    if (category && category !== 'Other') {
      return { category };
    } else if (category === 'Other') {
      // This could be either AI suggestion or fallback, but it's still valid
      return { category };
    } else {
      return {
        category: 'Other',
        error: 'Could not determine category',
      };
    }
  } catch (error: any) {
    console.error('❌ Error in suggestCategory server action:', error);
    
    // Check if it's a rate limit error
    if (error?.status === 429 || error?.code === 429) {
      return {
        category: 'Other',
        error: 'AI service rate limited, using fallback categorization',
      };
    }
    
    return {
      category: 'Other',
      error: 'Unable to suggest category at this time',
    };
  }
}