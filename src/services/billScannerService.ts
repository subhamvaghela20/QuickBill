import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_KEY_STORAGE = '@quickbill_gemini_api_key';
export const DEFAULT_GEMINI_API_KEY = 'AIzaSyCpzpuyXLTu8RybD3wFCtnKsWPtvnU0s34';

export interface ScannedBillItem {
  id: string;
  productName: string;
  quantityKg: number;
  ratePerKg: number;
  totalAmount: number;
}

export async function getSavedApiKey(): Promise<string> {
  try {
    const key = await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
    return key || DEFAULT_GEMINI_API_KEY;
  } catch {
    return DEFAULT_GEMINI_API_KEY;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  } catch (err) {
    console.error('Error saving API key:', err);
  }
}

/**
 * Extract items from a computerized or handwritten bill photo using Gemini Vision API
 */
export async function parseBillPhotoWithAI(
  base64Image: string,
  apiKey?: string
): Promise<{ success: boolean; items: ScannedBillItem[]; message?: string }> {
  const keyToUse = apiKey || (await getSavedApiKey());

  if (!keyToUse) {
    return {
      success: false,
      items: [],
      message: 'MISSING_KEY',
    };
  }

  const prompt = `You are an expert OCR receipt & bill parser. Analyze this photo, which could be a computerized printed receipt OR a handwritten bill/parchi (in English, Hindi, or Gujarati).
Extract all purchased grocery/vegetable/product items.
For each item extract:
- productName: name of the product (e.g. Tomato, Onion, Potato, Rice, Wheat, Almonds, etc.)
- quantityKg: quantity in kilograms as a positive number (e.g., 2 for 2kg, 0.5 for 500g, 0.25 for 250g, 1.25 for 1.250kg). If no unit is specified, assume kg or pieces converted to approximate weight.
- ratePerKg: price per kg in rupees (number). If only total is shown, calculate ratePerKg = total / quantityKg.
- totalAmount: line total in rupees (number).

Respond strictly with a valid raw JSON array containing objects with these 4 keys. No markdown code blocks, no backticks, no commentary.
Example format:
[{"productName": "Tomato", "quantityKg": 2, "ratePerKg": 40, "totalAmount": 80}]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${keyToUse}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return {
        success: false,
        items: [],
        message: `API request failed (${response.status}). Please check your API key.`,
      };
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Extract JSON array using regex or fallback to cleaned text
    const jsonMatch = candidateText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const jsonStringToParse = jsonMatch
      ? jsonMatch[0]
      : candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Parse JSON
    const parsed = JSON.parse(jsonStringToParse);
    if (!Array.isArray(parsed)) {
      return {
        success: false,
        items: [],
        message: 'AI did not return a valid list of items.',
      };
    }

    const items: ScannedBillItem[] = parsed.map((item: any, idx: number) => {
      const qty = parseFloat(item.quantityKg) || 1;
      let rate = parseFloat(item.ratePerKg) || 0;
      let total = parseFloat(item.totalAmount) || 0;

      if (rate === 0 && total > 0 && qty > 0) {
        rate = Math.round((total / qty) * 100) / 100;
      } else if (total === 0 && rate > 0 && qty > 0) {
        total = Math.round(rate * qty * 100) / 100;
      }

      return {
        id: 'scan_' + Date.now() + '_' + idx,
        productName: String(item.productName || 'Item ' + (idx + 1)).trim(),
        quantityKg: qty,
        ratePerKg: rate,
        totalAmount: total,
      };
    });

    return {
      success: true,
      items,
    };
  } catch (err: any) {
    console.error('OCR Parsing exception:', err);
    return {
      success: false,
      items: [],
      message: err?.message || 'Failed to parse image with AI.',
    };
  }
}
