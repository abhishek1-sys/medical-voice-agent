import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { base64, mimeType } = await req.json();

    if (!base64 || !mimeType) {
      return Response.json({ success: false, error: "Invalid input" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent([
      `
      You are a medical assistant AI.

      Analyze this prescription/report and return:

      a summary and if there is any of the bellow the give after summary 
      - Medicines (name + purpose)
      - Dosage instructions
      - Possible condition (if mentioned)
      - Warnings or precautions
      - Simple explanation for patient
      and if not then gic=ve only summary 
      dont use the * type of symble

      Keep it short, clear, and easy to understand.
      
      `,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();

    return Response.json({
      success: true,
      text,
    });

  } catch (error) {
    console.error(error);
    return Response.json({
      success: false,
      error: "Failed to analyze prescription",
    });
  }
}