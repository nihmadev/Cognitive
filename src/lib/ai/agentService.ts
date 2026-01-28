import { invoke } from '@tauri-apps/api/core';
import { Message, ToolCall, ApiKeys } from '../../store/aiStore';

export interface AgentOptions {
    model: string;
    messages: Message[];
    apiKeys: ApiKeys;
    baseUrl?: string;
    ollamaBaseUrl?: string;
    onChunk: (chunk: string) => void;
    onToolStart: (toolCall: ToolCall) => void;
    onToolResult: (id: string, name: string, result: string) => void;
    onToolError: (id: string, name: string, error: string) => void;
}

export class AgentService {
    private maxIterations = 10;
    private allowedTools = [
        "search_codebase", "index_codebase", "read_file", "search_files", 
        "find_by_name", "grep", "list_dir", "todo_list", "todo_add", 
        "todo_complete", "todo_delete", "todo_clear"
    ];

    async run(options: AgentOptions): Promise<void> {
        const { model, messages, apiKeys, onChunk, onToolStart, onToolResult, onToolError } = options;

        // 1. Get system prompt
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        const systemPrompt = await invoke<string>('agentrouter_get_system_prompt', {
            userQuery: lastUserMessage?.content || null
        });

        let fullMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        let currentIteration = 0;

        while (currentIteration < this.maxIterations) {
            currentIteration++;
            let fullResponse = '';

            try {
                // 2. Call AI API
                const stream = await this.callAIStream(model, fullMessages, options);
                
                for await (const chunk of stream) {
                    fullResponse += chunk;
                    onChunk(chunk);
                }

                // 3. Add assistant response to history
                fullMessages.push({ role: 'assistant', content: fullResponse });

                // 4. Parse tool calls
                const toolCalls = this.parseToolCalls(fullResponse);

                if (toolCalls.length === 0) {
                    if (fullResponse.includes('## FINAL ANSWER')) {
                        break;
                    }
                    
                    // If no tool calls and no final answer, nudge the model to continue
                    if (currentIteration < this.maxIterations) {
                        fullMessages.push({
                            role: 'user',
                            content: 'Your response did not include any tool calls or a ## FINAL ANSWER. If you are finished, please provide the ## FINAL ANSWER. If not, please use the appropriate tool to proceed.'
                        });
                        continue;
                    }
                    break;
                }

                // 5. Execute tools
                const toolOutputs: string[] = [];
                for (const call of toolCalls) {
                    const callId = crypto.randomUUID();
                    const toolCall: ToolCall = {
                        id: callId,
                        name: call.name,
                        parameters: call.parameters,
                        status: 'executing',
                        timestamp: Date.now()
                    };

                    onToolStart(toolCall);

                    try {
                        const result = await invoke<string>('agent_execute_tool', {
                            tool: call.name,
                            args: call.parameters
                        });

                        onToolResult(callId, call.name, result);

                        // Format result for LLM
                        const formattedResult = this.formatToolResultForLLM(call.name, result);
                        toolOutputs.push(`[${call.name}] result:\n${formattedResult}`);
                    } catch (error: any) {
                        const errorMsg = error.toString();
                        onToolError(callId, call.name, errorMsg);
                        toolOutputs.push(`Tool '${call.name}' error: ${errorMsg}`);
                    }
                }

                // 6. Add tool results to history
                if (toolOutputs.length > 0) {
                    fullMessages.push({
                        role: 'user',
                        content: `Tool execution results:\n${toolOutputs.join('\n\n')}\n\nPlease analyze these results and take the next step.`
                    });
                } else {
                    break;
                }

            } catch (error) {
                console.error('Agent loop error:', error);
                throw error;
            }
        }
    }

    public async *callAIStream(model: string, messages: any[], options: AgentOptions) {
        if (model.includes('gpt')) {
            yield* this.callOpenAIStream(model, messages, options);
        } else if (model.includes('gemini')) {
            yield* this.callGeminiStream(model, messages, options);
        } else {
            yield* this.callOllamaStream(model, messages, options);
        }
    }

    private async *callOpenAIStream(model: string, messages: any[], options: AgentOptions) {
        const { apiKeys, baseUrl } = options;
        const key = apiKeys.openai;
        if (!key) throw new Error('OpenAI API key not configured');

        const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to get response reader');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const cleaned = line.replace(/^data: /, '').trim();
                if (!cleaned || cleaned === '[DONE]') continue;

                try {
                    const json = JSON.parse(cleaned);
                    const content = json.choices[0]?.delta?.content;
                    if (content) yield content;
                } catch (e) {
                    // Ignore parse errors for incomplete chunks
                }
            }
        }
    }

    private async *callGeminiStream(model: string, messages: any[], options: AgentOptions) {
        const { apiKeys } = options;
        const key = apiKeys.google;
        if (!key) throw new Error('Gemini API key not configured');

        // Gemini uses a different message format and system instruction
        const systemMessage = messages.find(m => m.role === 'system');
        const otherMessages = messages.filter(m => m.role !== 'system');

        const contents = otherMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                system_instruction: systemMessage ? {
                    parts: [{ text: systemMessage.content }]
                } : undefined,
                generationConfig: {
                    temperature: 0.7,
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${error}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to get response reader');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            // Gemini stream is a JSON array of objects, but delivered as chunks
            // This is a bit tricky to parse without a full JSON parser that supports streaming
            // For now, let's use a simple regex-based approach for common chunks
            const regex = /"text":\s*"([^"]*)"/g;
            let match;
            while ((match = regex.exec(buffer)) !== null) {
                const text = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                yield text;
                buffer = buffer.slice(match.index + match[0].length);
            }
        }
    }

    private async *callOllamaStream(model: string, messages: any[], options: AgentOptions) {
        const { ollamaBaseUrl } = options;
        const url = `${ollamaBaseUrl || 'http://localhost:11434'}/api/chat`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${error}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to get response reader');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.message?.content) yield json.message.content;
                    if (json.done) break;
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
    }

    private parseToolCalls(text: string): any[] {
        const calls: any[] = [];

        // 1. XML-like format
        // Simple regex-based XML parser for <invoke name="tool"><parameter name="arg">val</parameter></invoke>
        const invokeRegex = /<invoke\s+name="([^"]+)">([\s\S]*?)<\/invoke>/g;
        let match;
        while ((match = invokeRegex.exec(text)) !== null) {
            const name = match[1];
            if (this.allowedTools.includes(name)) {
                const paramsContent = match[2];
                const params: Record<string, any> = {};
                const paramRegex = /<parameter\s+name="([^"]+)">([\s\S]*?)<\/parameter>/g;
                let pMatch;
                while ((pMatch = paramRegex.exec(paramsContent)) !== null) {
                    params[pMatch[1]] = this.parseValue(pMatch[2].trim());
                }
                calls.push({ name, parameters: params });
            }
        }

        // 2. Compact XML format <tool arg="val" />
        const compactRegex = /<(\w+)\s+([^>]+)\/>/g;
        while ((match = compactRegex.exec(text)) !== null) {
            const name = match[1];
            if (this.allowedTools.includes(name)) {
                const attrsStr = match[2];
                const params: Record<string, any> = {};
                const attrRegex = /(\w+)="([^"]*)"/g;
                let aMatch;
                while ((aMatch = attrRegex.exec(attrsStr)) !== null) {
                    params[aMatch[1]] = this.parseValue(aMatch[2]);
                }
                calls.push({ name, parameters: params });
            }
        }

        // 3. JSON format
        const jsonRegex = /\{[\s\S]*?\}/g;
        while ((match = jsonRegex.exec(text)) !== null) {
            try {
                const json = JSON.parse(match[0]);
                const call = this.tryParseJsonToolCall(json);
                if (call && this.allowedTools.includes(call.name)) {
                    if (!calls.some(c => c.name === call.name && JSON.stringify(c.parameters) === JSON.stringify(call.parameters))) {
                        calls.push(call);
                    }
                }
            } catch (e) {
                // Not valid JSON or not a tool call
            }
        }

        return calls;
    }

    private parseValue(s: string): any {
        if (s === 'true') return true;
        if (s === 'false') return false;
        if (!isNaN(Number(s)) && s !== '') return Number(s);
        return s;
    }

    private tryParseJsonToolCall(v: any): any {
        if (v.name && v.parameters) {
            return { name: v.name, parameters: v.parameters };
        }
        if (v.tool && v.args) {
            return { name: v.tool, parameters: v.args };
        }
        if (v.tool_call) {
            return this.tryParseJsonToolCall(v.tool_call);
        }
        return null;
    }

    private formatToolResultForLLM(toolName: string, result: string): string {
        if (result.length > 100000) {
            result = `${result.slice(0, 100000)}... (truncated, total length: ${result.length})`;
        }

        if (toolName === 'search_files' || toolName === 'find_by_name') {
            try {
                const files = JSON.parse(result);
                if (files.length === 0) return 'No files found matching the pattern.';
                return `Found files:\n${files.map((f: any) => f.path).join('\n')}`;
            } catch (e) {
                return result;
            }
        }

        if (toolName === 'search_codebase') {
            try {
                const symbols = JSON.parse(result);
                if (symbols.length === 0) return 'No symbols found matching the query.';
                return `Found symbols:\n${symbols.slice(0, 15).map((s: any) => 
                    `${s.name} (${s.kind}) in ${s.file_path} (line ${s.start_line})`
                ).join('\n')}`;
            } catch (e) {
                return result;
            }
        }

        return result;
    }
}

export const agentService = new AgentService();
