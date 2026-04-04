// Servicio para integrarse con Google Gemini Vision API
import { getConfig } from '../db/supabase.js';

export async function analyzeFoodImageBase64(base64Data, mimeType) {
    const apiKey = await getConfig('gemini_api_key', '');
    
    if (!apiKey) {
        throw new Error("No has configurado tu API Key de Gemini en los Ajustes.");
    }

    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: "Analiza la siguiente imagen de comida, identifica qué es y devuelve ÚNICAMENTE un objeto JSON válido con las siguientes propiedades matemáticas estimadas (usa números para los valores nutricionales, no strings, y trata de ser preciso para una porción promedio de lo que se ve en la imagen): { \"nombre_comida\": \"Nombre de la comida\", \"calorias\": 500, \"proteinas\": 20.5, \"carbohidratos\": 50.0, \"grasas\": 15.2 }. Si detectas múltiples alimentos, súmalos y dale un nombre representativo al plato. No incluyas backticks (```) ni la palabra 'json' ni ningún otro texto en tu respuesta, SOLO devuelve el JSON."
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.4
        }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errortext = await response.text();
        console.error("Gemini API Error:", errortext);
        throw new Error(`Error de la API de Gemini: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("La IA no devolvió ningún resultado.");
    }

    let textResponse = data.candidates[0].content.parts[0].text;
    
    // Clean potential markdown artifacts
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsedJson = JSON.parse(textResponse);
        return parsedJson;
    } catch (e) {
        console.error("No se pudo parsear el JSON de la IA:", textResponse);
        throw new Error("La IA no devolvió el formato esperado. Intenta con otra foto.");
    }
}

// Utility to convert an image file to Base64 (without the data:image/.. prefix for the payload)
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
             // result is likely 'data:image/jpeg;base64,/9j/4AAQSkZJ...'
             const base64String = reader.result.split(',')[1];
             resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}
