// services/geminiService.ts
import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { AgentInfo, EditorLanguage } from '../types';
import { REASONING_STRATEGIES } from '../constants'; // Corrected import path
import { MAX_CONTEXT_LENGTH } from '../constants';
import { calculateEntropy, stripCodeBlock } from '../utils/helpers';
import { quantumNotify } from '../utils/quantumEffects';

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // API key is dynamically injected via process.env.API_KEY
    if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      this.isConnected = true;
    } else {
      console.warn("API_KEY not found. Gemini service will operate in disconnected mode.");
      this.isConnected = false;
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  // NOTE: This is a placeholder for `window.aistudio.hasSelectedApiKey()` and `openSelectKey()`
  // which are not available in a standard React environment and are specific to the AI Studio platform.
  // For this environment, we rely on `process.env.API_KEY` being pre-configured.
  public async ensureApiKeySelected(): Promise<boolean> {
    if (this.isConnected) return true;

    // Simulate API key selection for this environment
    // In a real AI Studio environment, you'd use:
    // if (!await window.aistudio.hasSelectedApiKey()) {
    //   await window.aistudio.openSelectKey();
    //   // Assume key selection was successful, re-init.
    //   this.init();
    //   return this.isConnected;
    // }
    // return this.isConnected;

    return new Promise((resolve) => {
      // Small delay to simulate user interaction/API check
      setTimeout(() => {
        if (process.env.API_KEY) {
          this.init(); // Re-initialize if key becomes available
          quantumNotify('Gemini API key detected!', 'success');
          resolve(true);
        } else {
          quantumNotify('Gemini API key not found. Please ensure it is set up.', 'error');
          resolve(false);
        }
      }, 500);
    });
  }


  public async generateGeminiContent(prompt: string, model: string = 'gemini-2.5-flash', systemInstruction?: string): Promise<string> {
    if (!this.ai) {
      throw new Error("Gemini service is not initialized. API key might be missing.");
    }

    try {
      // Using GenerateContentParameters type for config
      const config: GenerateContentParameters = {
        model: model,
        contents: [{text: prompt}],
      };

      if (systemInstruction) {
        config.config = { systemInstruction };
      }

      const response: GenerateContentResponse = await this.ai.models.generateContent(config);
      return response.text;
    } catch (error: any) {
      console.error("Error generating content from Gemini:", error);
      if (error.message.includes("Requested entity was not found.")) {
        quantumNotify("Gemini API call failed: Invalid API key or model not found. Please try re-selecting your API key.", "error");
        this.isConnected = false; // Mark as disconnected
      }
      throw error;
    }
  }

  public async runOrchestrationAgentStep(
    agent: AgentInfo,
    prompt: string,
    context: string,
    round: number,
    editorLanguage: EditorLanguage,
    reasoningDepth: number
  ): Promise<string> {
    if (!this.ai) {
      // Fallback to simulation if AI is not connected
      console.warn(`Agent ${agent.id} falling back to simulation (no AI connection).`);
      await new Promise(r => setTimeout(r, 200 + (Math.random() * 400))); // Simulate delay
      return `// SIMULATED RESPONSE for Agent ${agent.id}
function simulated_task_for_${agent.id.replace('-', '_')}() {
    console.log("This is a simulated response due to lack of AI connection.");
}`;
    }

    const strategyIndex = (round * reasoningDepth) % REASONING_STRATEGIES.length;
    const strategy = REASONING_STRATEGIES[strategyIndex];

    let truncatedContext = context;
    if (context.length > MAX_CONTEXT_LENGTH) {
      const half = MAX_CONTEXT_LENGTH / 2;
      truncatedContext = context.substring(0, half) +
        `\n\n// ... [CODE TRUNCATED FOR BREVITY] ...\n\n` +
        context.substring(context.length - half);
    }

    const fullPrompt = `You are an expert coding agent in a multi-agent system.
Your agent ID is ${agent.id}.
You are in round ${round + 1} of a multi-round reasoning process.
Your assigned strategy is: "${strategy}".

Based on this strategy, analyze the user's request and the provided code to generate an improved or new code snippet.

USER REQUEST: "${prompt}"

CODE CONTEXT:
\`\`\`${editorLanguage}
${truncatedContext}
\`\`\`

Provide only the generated code snippet as your response. Do not include explanations or markdown formatting around the code.`;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-pro', // Use pro model for complex reasoning
        contents: [{text: fullPrompt}],
      });

      const codeCandidate = stripCodeBlock(response.text);

      return `// Agent: ${agent.id} | Round: ${round + 1} | Strategy: ${strategy}
// Seed: ${agent.origin.substring(0, 12)} | Entropy: ${calculateEntropy(agent.origin).toFixed(3)}
${codeCandidate}`;

    } catch (error: any) {
      console.error(`Agent ${agent.id} failed:`, error);
      if (error.message.includes("Requested entity was not found.")) {
        quantumNotify("Gemini API call failed: Invalid API key or model not found. Please try re-selecting your API key.", "error");
        this.isConnected = false; // Mark as disconnected
      }
      throw error;
    }
  }
}

// Export a singleton instance
export const geminiService = new GeminiService();