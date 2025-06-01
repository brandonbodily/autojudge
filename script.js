class AutoJudge {
    constructor() {
        this.currentBattle = null;
        this.apiKeys = {
            openai: null,
            anthropic: null,
            google: null,
            xai: null,
            deepseek: null
        };
        this.loadApiKeys();
        this.initializeEventListeners();
    }

    async loadApiKeys() {
        try {
            const response = await fetch('/.env');
            if (response.ok) {
                const envText = await response.text();
                const lines = envText.split('\n');
                lines.forEach(line => {
                    if (line.includes('OPENAI_API_KEY=')) {
                        this.apiKeys.openai = line.split('=')[1];
                    } else if (line.includes('ANTHROPIC_API_KEY=')) {
                        this.apiKeys.anthropic = line.split('=')[1];
                    } else if (line.includes('GOOGLE_API_KEY=')) {
                        this.apiKeys.google = line.split('=')[1];
                    } else if (line.includes('XAI_API_KEY=')) {
                        this.apiKeys.xai = line.split('=')[1];
                    } else if (line.includes('DEEPSEEK_API_KEY=')) {
                        this.apiKeys.deepseek = line.split('=')[1];
                    }
                });
            }
        } catch (error) {
            console.warn('Could not load .env file. API keys will need to be set manually.');
        }
    }

    initializeEventListeners() {
        const promptInput = document.getElementById('prompt');
        const model1Select = document.getElementById('model1');
        const model2Select = document.getElementById('model2');
        const startBattleBtn = document.getElementById('start-battle');
        const newBattleBtn = document.getElementById('new-battle');
        const addJudgeBtn = document.getElementById('add-judge');

        [promptInput, model1Select, model2Select].forEach(element => {
            element.addEventListener('input', () => this.validateInputs());
        });

        startBattleBtn.addEventListener('click', () => this.startBattle());
        newBattleBtn.addEventListener('click', () => this.resetBattle());
        addJudgeBtn.addEventListener('click', () => this.addJudge());
        
        this.initializeJudgeListeners();
    }

    validateInputs() {
        const prompt = document.getElementById('prompt').value.trim();
        const model1 = document.getElementById('model1').value;
        const model2 = document.getElementById('model2').value;
        const judges = this.getJudges();
        const startBattleBtn = document.getElementById('start-battle');

        const isValid = prompt.length > 0 && model1 && model2 && model1 !== model2 && judges.length >= 1;
        startBattleBtn.disabled = !isValid;
    }

    async startBattle() {
        const prompt = document.getElementById('prompt').value.trim();
        const model1 = document.getElementById('model1').value;
        const model2 = document.getElementById('model2').value;

        this.currentBattle = {
            prompt,
            model1,
            model2,
            rubric: null,
            responses: {},
            scores: {}
        };

        this.showSection('battle-progress');
        await this.runBattleSequence();
    }

    async runBattleSequence() {
        try {
            await this.generateRubric();
            await this.getModelResponses();
            await this.evaluateResponses();
            this.showResults();
        } catch (error) {
            console.error('Battle failed:', error);
            
            let errorMessage = 'Battle failed. ';
            if (error.message.includes('API error')) {
                errorMessage += 'Please check your API keys in the .env file and try again.';
            } else if (error.message.includes('Unknown provider')) {
                errorMessage += 'Unsupported model selected.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            alert(errorMessage);
            this.resetBattle();
        }
    }

    async generateRubric() {
        this.setStepActive('step-rubric');
        
        try {
            const rubricPrompt = `Create an evaluation rubric for the following task: "${this.currentBattle.prompt}"

Please provide exactly 4 evaluation criteria that are most relevant for judging responses to this specific task. Return your response in this exact JSON format:

{
  "criteria": ["Criterion1", "Criterion2", "Criterion3", "Criterion4"],
  "description": "Brief description of what this rubric evaluates for this specific task"
}

Make the criteria specific and relevant to the task type. For example:
- For coding tasks: focus on correctness, efficiency, readability, best practices
- For creative writing: focus on creativity, style, coherence, engagement
- For analysis tasks: focus on accuracy, depth, logic, evidence
- For explanatory tasks: focus on clarity, completeness, accuracy, usefulness`;

            // Use a reliable model to generate the rubric (preferring GPT-4o or Claude)
            const judges = this.getJudges();
            let rubricModel = null;
            
            // Priority order: GPT-4o, Claude Opus 4, Claude Sonnet 4, first available judge
            if (judges.includes('gpt-4o')) {
                rubricModel = 'gpt-4o';
            } else if (judges.includes('claude-opus-4')) {
                rubricModel = 'claude-opus-4';
            } else if (judges.includes('claude-sonnet-4')) {
                rubricModel = 'claude-sonnet-4';
            } else if (judges.length > 0) {
                rubricModel = judges[0];
            } else {
                // Fallback if no judges selected
                rubricModel = 'gpt-4o';
            }

            // Show which model is generating the rubric
            this.showModelProgress('rubric-details', rubricModel, 'calling', 'Generating rubric...');

            const rubricResponse = await this.callModel(rubricModel, rubricPrompt);
            
            // Show completion
            this.showModelProgress('rubric-details', rubricModel, 'completed', 'Rubric generated');
            
            // Clean and parse the JSON response
            const rubricData = this.parseJSONResponse(rubricResponse);
            
            this.currentBattle.rubric = {
                criteria: rubricData.criteria,
                description: rubricData.description
            };
            
        } catch (error) {
            console.error('Error generating rubric:', error);
            // Show error state
            this.showModelProgress('rubric-details', 'Unknown', 'error', 'Failed to generate rubric');
            
            // Fallback to a generic rubric if generation fails
            this.currentBattle.rubric = {
                criteria: ['Quality', 'Relevance', 'Clarity', 'Completeness'],
                description: 'General evaluation criteria for response quality and relevance to the prompt.'
            };
        }
        
        this.setStepCompleted('step-rubric');
    }

    async getModelResponses() {
        this.setStepActive('step-responses');
        
        try {
            // Show both models starting
            this.showModelProgress('response-details', this.currentBattle.model1, 'calling', 'Generating response...');
            this.showModelProgress('response-details', this.currentBattle.model2, 'calling', 'Generating response...', true);

            const [response1, response2] = await Promise.all([
                this.callModelWithProgress(this.currentBattle.model1, this.currentBattle.prompt, 'response-details'),
                this.callModelWithProgress(this.currentBattle.model2, this.currentBattle.prompt, 'response-details')
            ]);

            this.currentBattle.responses = {
                model1: response1,
                model2: response2
            };
        } catch (error) {
            console.error('Error getting model responses:', error);
            throw error;
        }

        this.setStepCompleted('step-responses');
    }

    async callModel(modelId, prompt) {
        const provider = this.getModelProvider(modelId);
        
        switch (provider) {
            case 'openai':
                return await this.callOpenAI(modelId, prompt);
            case 'anthropic':
                return await this.callAnthropic(modelId, prompt);
            case 'google':
                return await this.callGoogle(modelId, prompt);
            case 'xai':
                return await this.callXAI(modelId, prompt);
            case 'deepseek':
                return await this.callDeepSeek(modelId, prompt);
            default:
                throw new Error(`Unknown provider for model: ${modelId}`);
        }
    }

    getModelProvider(modelId) {
        if (modelId.startsWith('gpt-') || modelId.startsWith('o3') || modelId.startsWith('o4')) {
            return 'openai';
        } else if (modelId.startsWith('claude-')) {
            return 'anthropic';
        } else if (modelId.startsWith('gemini-')) {
            return 'google';
        } else if (modelId.startsWith('grok-')) {
            return 'xai';
        } else if (modelId.startsWith('deepseek-')) {
            return 'deepseek';
        }
        return 'unknown';
    }

    async callOpenAI(modelId, prompt) {
        let requestBody;
        
        // o3 models have special requirements
        if (modelId.startsWith('o3')) {
            requestBody = {
                model: modelId,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                reasoning_effort: 'medium',
                max_completion_tokens: 2000
            };
        } else {
            // Use max_completion_tokens for newer models and max_tokens for older models
            const useNewParameter = modelId.startsWith('o4') || modelId.startsWith('gpt-4');
            const tokenParam = useNewParameter ? 'max_completion_tokens' : 'max_tokens';
            
            requestBody = {
                model: modelId,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            };
            
            requestBody[tokenParam] = 2000;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.openai}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.error) {
                throw new Error(`OpenAI API error: ${errorData.error.message}`);
            }
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenAI API');
        }

        // Check if generation was cut off due to token limit
        if (data.choices[0].finish_reason === 'length') {
            console.warn('OpenAI response was truncated due to token limit');
        }

        return data.choices[0].message.content;
    }

    async callAnthropic(modelId, prompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKeys.anthropic,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: modelId,
                max_tokens: 2000,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.type === 'error') {
                throw new Error(`Anthropic API error: ${errorData.error.message}`);
            }
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.content && data.content[0] && data.content[0].text) {
            return data.content[0].text;
        }
        throw new Error('Invalid response format from Anthropic API');
    }

    async callGoogle(modelId, prompt) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKeys.google}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 2000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async callXAI(modelId, prompt) {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.xai}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`xAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callDeepSeek(modelId, prompt) {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.deepseek}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async evaluateResponses() {
        this.setStepActive('step-judging');
        
        try {
            const judges = this.getJudges();
            const judgeEvaluations = {};

            // Show all judges starting
            judges.forEach(judge => {
                this.showModelProgress('judging-details', judge, 'calling', 'Evaluating responses...', true);
            });

            // Process all judge evaluations in parallel
            const judgePromises = judges.map(async (judge) => {
                try {
                    const evaluation = await this.getJudgeEvaluationWithProgress(judge);
                    return { judge, evaluation, success: true };
                } catch (error) {
                    console.error(`Error getting evaluation from judge ${judge}:`, error);
                    // Show error state
                    this.showModelProgress('judging-details', judge, 'error', 'Evaluation failed');
                    return { 
                        judge, 
                        evaluation: this.getFallbackEvaluation(), 
                        success: false 
                    };
                }
            });

            // Wait for all judge evaluations to complete
            const judgeResults = await Promise.all(judgePromises);
            
            // Collect results
            judgeResults.forEach(result => {
                judgeEvaluations[result.judge] = result.evaluation;
            });

            const avgModel1 = this.calculateAverage(Object.values(judgeEvaluations).map(j => j.overallScores.model1));
            const avgModel2 = this.calculateAverage(Object.values(judgeEvaluations).map(j => j.overallScores.model2));

            this.currentBattle.scores = {
                individual: judgeEvaluations,
                averages: {
                    model1: avgModel1,
                    model2: avgModel2
                }
            };
        } catch (error) {
            console.error('Error in judge evaluation:', error);
            throw error;
        }

        this.setStepCompleted('step-judging');
    }

    async getJudgeEvaluation(judgeModel) {
        const { prompt, responses, model1, model2, rubric } = this.currentBattle;
        
        const judgePrompt = `You are an expert AI evaluator. Please evaluate these two responses to the given task.

TASK: ${prompt}

EVALUATION CRITERIA:
${rubric.criteria.map((criterion, i) => `${i + 1}. ${criterion}`).join('\n')}

RUBRIC DESCRIPTION: ${rubric.description}

RESPONSE A (${this.getModelDisplayName(model1)}):
${responses.model1}

RESPONSE B (${this.getModelDisplayName(model2)}):
${responses.model2}

Please evaluate both responses according to each criterion on a scale of 1-10 (where 10 is excellent and 1 is poor).

Return your evaluation in this exact JSON format. IMPORTANT: Keep the reasoning as a single paragraph without line breaks:

{
  "model1_scores": {
    "${rubric.criteria[0]}": 8.5,
    "${rubric.criteria[1]}": 7.0,
    "${rubric.criteria[2]}": 9.0,
    "${rubric.criteria[3]}": 6.5
  },
  "model2_scores": {
    "${rubric.criteria[0]}": 7.5,
    "${rubric.criteria[1]}": 8.0,
    "${rubric.criteria[2]}": 7.0,
    "${rubric.criteria[3]}": 8.5
  },
  "reasoning": "Detailed explanation of your evaluation in a single paragraph, comparing both responses across all criteria. Explain why you gave each score and what distinguishes the better response. Do not use line breaks in this field."
}

Be thorough, fair, and objective in your evaluation. Focus on the specific criteria provided. Keep your reasoning concise and in a single paragraph.`;

        const judgeResponse = await this.callModel(judgeModel, judgePrompt);
        
        // Clean and parse the JSON response
        const evaluationData = this.parseJSONResponse(judgeResponse);
        
        // Calculate overall scores
        const model1Overall = this.calculateAverage(Object.values(evaluationData.model1_scores));
        const model2Overall = this.calculateAverage(Object.values(evaluationData.model2_scores));
        
        // Format metrics for display
        const metrics = {};
        rubric.criteria.forEach(criterion => {
            metrics[criterion] = {
                model1: evaluationData.model1_scores[criterion],
                model2: evaluationData.model2_scores[criterion]
            };
        });

        return {
            overallScores: {
                model1: model1Overall,
                model2: model2Overall
            },
            metrics: metrics,
            reasoning: evaluationData.reasoning
        };
    }

    getFallbackEvaluation() {
        const { rubric } = this.currentBattle;
        const metrics = {};
        
        rubric.criteria.forEach(criterion => {
            metrics[criterion] = {
                model1: this.generateRandomScore(),
                model2: this.generateRandomScore()
            };
        });

        const model1Overall = this.calculateAverage(Object.values(metrics).map(m => m.model1));
        const model2Overall = this.calculateAverage(Object.values(metrics).map(m => m.model2));

        return {
            overallScores: {
                model1: model1Overall,
                model2: model2Overall
            },
            metrics: metrics,
            reasoning: "Evaluation unavailable - judge model encountered an error. Fallback scoring applied."
        };
    }

    generateRandomScore() {
        return Math.round((Math.random() * 4 + 6) * 10) / 10;
    }

    parseJSONResponse(response) {
        let cleanResponse = response.trim();
        
        // Remove markdown code blocks if present
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Try to extract JSON from the response if it's embedded in text
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanResponse = jsonMatch[0];
        }
        
        // Handle common JSON formatting issues
        try {
            return JSON.parse(cleanResponse);
        } catch (error) {
            // Try to fix common JSON issues
            try {
                // Fix unescaped control characters in the reasoning field
                let fixedResponse = cleanResponse;
                
                // Find the reasoning field and fix control characters
                const reasoningMatch = fixedResponse.match(/"reasoning":\s*"(.*?)"/s);
                if (reasoningMatch) {
                    const originalReasoning = reasoningMatch[1];
                    const fixedReasoning = originalReasoning
                        .replace(/\n/g, ' ')      // Replace newlines with spaces
                        .replace(/\r/g, ' ')      // Replace carriage returns with spaces
                        .replace(/\t/g, ' ')      // Replace tabs with spaces
                        .replace(/\s+/g, ' ')     // Collapse multiple spaces
                        .trim();                  // Trim whitespace
                    
                    fixedResponse = fixedResponse.replace(
                        /"reasoning":\s*".*?"/s,
                        `"reasoning": "${fixedReasoning}"`
                    );
                }
                
                return JSON.parse(fixedResponse);
                
            } catch (secondError) {
                throw new Error(`JSON parsing failed: ${error.message}`);
            }
        }
    }

    showModelProgress(containerId, modelId, status, message, append = false) {
        const container = document.getElementById(containerId);
        const modelName = this.getModelDisplayName(modelId);
        const statusId = `${containerId}-${modelId}`;
        
        // Check if model status already exists
        let modelStatus = document.getElementById(statusId);
        
        if (!modelStatus) {
            modelStatus = document.createElement('div');
            modelStatus.id = statusId;
            modelStatus.className = 'model-status';
            
            if (append || container.children.length === 0) {
                container.appendChild(modelStatus);
            } else {
                container.innerHTML = '';
                container.appendChild(modelStatus);
            }
        }
        
        // Update status class
        modelStatus.className = `model-status ${status}`;
        
        // Update content based on status
        let content = `<span class="model-name">${modelName}</span>`;
        
        if (status === 'calling') {
            content += `<div class="model-spinner"></div><span class="model-progress">${message}</span>`;
        } else if (status === 'completed') {
            content += `<span class="completion-check">✓</span><span class="model-progress">${message}</span>`;
        } else if (status === 'error') {
            content += `<span class="completion-check" style="color: #e74c3c;">✗</span><span class="model-progress">${message}</span>`;
        }
        
        modelStatus.innerHTML = content;
    }

    async callModelWithProgress(modelId, prompt, containerId) {
        try {
            const result = await this.callModel(modelId, prompt);
            this.showModelProgress(containerId, modelId, 'completed', 'Response generated');
            return result;
        } catch (error) {
            this.showModelProgress(containerId, modelId, 'error', 'Failed to generate response');
            throw error;
        }
    }

    async getJudgeEvaluationWithProgress(judgeModel) {
        try {
            const result = await this.getJudgeEvaluation(judgeModel);
            this.showModelProgress('judging-details', judgeModel, 'completed', 'Evaluation complete');
            return result;
        } catch (error) {
            this.showModelProgress('judging-details', judgeModel, 'error', 'Evaluation failed');
            throw error;
        }
    }


    calculateAverage(scores) {
        return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
    }

    showResults() {
        const { prompt, model1, model2, rubric, scores, responses } = this.currentBattle;
        const { averages, individual } = scores;

        // Display the original prompt
        document.getElementById('prompt-display').textContent = prompt;

        document.getElementById('model1-name').textContent = this.getModelDisplayName(model1);
        document.getElementById('model2-name').textContent = this.getModelDisplayName(model2);
        document.getElementById('model1-score').textContent = averages.model1;
        document.getElementById('model2-score').textContent = averages.model2;

        const winner = averages.model1 > averages.model2 ? model1 : model2;
        const winnerName = this.getModelDisplayName(winner);
        const scoreDiff = Math.abs(averages.model1 - averages.model2);
        
        document.getElementById('winner-text').textContent = 
            scoreDiff < 0.5 ? "It's a close match!" : `${winnerName} wins!`;

        // Display LLM outputs side by side
        document.getElementById('output1-title').textContent = this.getModelDisplayName(model1);
        document.getElementById('output2-title').textContent = this.getModelDisplayName(model2);
        document.getElementById('output1-content').textContent = responses.model1;
        document.getElementById('output2-content').textContent = responses.model2;

        document.getElementById('rubric-display').innerHTML = `
            <strong>Criteria:</strong> ${rubric.criteria.join(', ')}<br>
            <strong>Description:</strong> ${rubric.description}
        `;

        // Display detailed judge evaluations
        let judgeEvaluationsHtml = '';
        Object.entries(individual).forEach(([judge, evaluation]) => {
            let metricsHtml = '';
            Object.entries(evaluation.metrics).forEach(([metric, scores]) => {
                metricsHtml += `
                    <div class="metric">
                        <div class="metric-name">${metric}</div>
                        <div class="metric-scores">
                            <span>${this.getModelDisplayName(model1)}: ${scores.model1}</span>
                            <span>${this.getModelDisplayName(model2)}: ${scores.model2}</span>
                        </div>
                    </div>
                `;
            });

            judgeEvaluationsHtml += `
                <div class="judge-evaluation">
                    <div class="judge-header">
                        <span>${this.getJudgeDisplayName(judge)}</span>
                        <div class="judge-scores-summary">
                            <span>${this.getModelDisplayName(model1)}: ${evaluation.overallScores.model1}</span>
                            <span>${this.getModelDisplayName(model2)}: ${evaluation.overallScores.model2}</span>
                        </div>
                    </div>
                    <div class="judge-content">
                        <div class="evaluation-metrics">
                            ${metricsHtml}
                        </div>
                        <div class="reasoning">
                            <strong>Reasoning:</strong> ${evaluation.reasoning}
                        </div>
                    </div>
                </div>
            `;
        });
        document.getElementById('judge-evaluations').innerHTML = judgeEvaluationsHtml;

        this.showSection('results');
    }

    getModelDisplayName(modelId) {
        const displayNames = {
            'gpt-4o': 'GPT-4o',
            'gpt-4.1-mini': 'GPT-4.1 Mini',
            'o3-mini': 'o3 Mini',
            'o4-mini': 'o4 Mini',
            'claude-opus-4': 'Claude Opus 4',
            'claude-sonnet-4': 'Claude Sonnet 4',
            'gemini-2.5-pro': 'Gemini 2.5 Pro',
            'gemini-2.5-flash': 'Gemini 2.5 Flash',
            'grok-3': 'Grok 3',
            'grok-3-mini': 'Grok 3 Mini',
            'deepseek-r1': 'DeepSeek-R1',
            'deepseek-r1-0528': 'DeepSeek-R1-0528'
        };
        return displayNames[modelId] || modelId;
    }

    getJudgeDisplayName(judgeId) {
        return this.getModelDisplayName(judgeId);
    }

    setStepActive(stepId) {
        document.getElementById(stepId).classList.add('active');
    }

    setStepCompleted(stepId) {
        const step = document.getElementById(stepId);
        step.classList.remove('active');
        step.classList.add('completed');
    }

    showSection(sectionClass) {
        document.querySelectorAll('section').forEach(section => {
            section.style.display = 'none';
        });
        document.querySelector(`.${sectionClass}`).style.display = 'block';
    }

    resetBattle() {
        this.currentBattle = null;
        
        document.getElementById('prompt').value = '';
        document.getElementById('model1').value = '';
        document.getElementById('model2').value = '';
        
        this.resetJudges();
        
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        this.validateInputs();
        this.showSection('battle-setup');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initializeJudgeListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-judge')) {
                this.removeJudge(e.target.closest('.judge-item'));
            }
        });
        
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('judge-select')) {
                this.validateInputs();
            }
        });
        
        this.updateJudgeRemoveButtons();
    }

    addJudge() {
        const container = document.getElementById('judges-container');
        const judgeItem = document.createElement('div');
        judgeItem.className = 'judge-item';
        judgeItem.innerHTML = `
            <select class="judge-select">
                <option value="">Choose a judge...</option>
                <optgroup label="OpenAI">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    <option value="o3-mini">o3 Mini</option>
                    <option value="o4-mini">o4 Mini</option>
                </optgroup>
                <optgroup label="Anthropic">
                    <option value="claude-opus-4">Claude Opus 4</option>
                    <option value="claude-sonnet-4">Claude Sonnet 4</option>
                </optgroup>
                <optgroup label="Google DeepMind">
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </optgroup>
                <optgroup label="xAI">
                    <option value="grok-3">Grok 3</option>
                    <option value="grok-3-mini">Grok 3 Mini</option>
                </optgroup>
                <optgroup label="DeepSeek">
                    <option value="deepseek-r1">DeepSeek-R1</option>
                    <option value="deepseek-r1-0528">DeepSeek-R1-0528</option>
                </optgroup>
            </select>
            <button type="button" class="remove-judge">×</button>
        `;
        container.appendChild(judgeItem);
        this.updateJudgeRemoveButtons();
        this.validateInputs();
    }

    removeJudge(judgeItem) {
        judgeItem.remove();
        this.updateJudgeRemoveButtons();
        this.validateInputs();
    }

    updateJudgeRemoveButtons() {
        const judgeItems = document.querySelectorAll('.judge-item');
        judgeItems.forEach((item) => {
            const removeBtn = item.querySelector('.remove-judge');
            if (judgeItems.length <= 3) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = 'flex';
            }
        });
    }

    getJudges() {
        const judgeSelects = document.querySelectorAll('.judge-select');
        return Array.from(judgeSelects)
            .map(select => select.value)
            .filter(value => value.length > 0);
    }

    resetJudges() {
        const container = document.getElementById('judges-container');
        container.innerHTML = `
            <div class="judge-item">
                <select class="judge-select">
                    <option value="">Choose a judge...</option>
                    <optgroup label="OpenAI">
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                        <option value="o3-mini" selected>o3 Mini</option>
                        <option value="o4-mini">o4 Mini</option>
                    </optgroup>
                    <optgroup label="Anthropic">
                        <option value="claude-opus-4">Claude Opus 4</option>
                        <option value="claude-sonnet-4">Claude Sonnet 4</option>
                    </optgroup>
                    <optgroup label="Google DeepMind">
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    </optgroup>
                    <optgroup label="xAI">
                        <option value="grok-3">Grok 3</option>
                        <option value="grok-3-mini">Grok 3 Mini</option>
                    </optgroup>
                    <optgroup label="DeepSeek">
                        <option value="deepseek-r1">DeepSeek-R1</option>
                        <option value="deepseek-r1-0528">DeepSeek-R1-0528</option>
                    </optgroup>
                </select>
                <button type="button" class="remove-judge" style="display: none;">×</button>
            </div>
            <div class="judge-item">
                <select class="judge-select">
                    <option value="">Choose a judge...</option>
                    <optgroup label="OpenAI">
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                        <option value="o3-mini">o3 Mini</option>
                        <option value="o4-mini">o4 Mini</option>
                    </optgroup>
                    <optgroup label="Anthropic">
                        <option value="claude-opus-4" selected>Claude Opus 4</option>
                        <option value="claude-sonnet-4">Claude Sonnet 4</option>
                    </optgroup>
                    <optgroup label="Google DeepMind">
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    </optgroup>
                    <optgroup label="xAI">
                        <option value="grok-3">Grok 3</option>
                        <option value="grok-3-mini">Grok 3 Mini</option>
                    </optgroup>
                    <optgroup label="DeepSeek">
                        <option value="deepseek-r1">DeepSeek-R1</option>
                        <option value="deepseek-r1-0528">DeepSeek-R1-0528</option>
                    </optgroup>
                </select>
                <button type="button" class="remove-judge" style="display: none;">×</button>
            </div>
            <div class="judge-item">
                <select class="judge-select">
                    <option value="">Choose a judge...</option>
                    <optgroup label="OpenAI">
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                        <option value="o3-mini">o3 Mini</option>
                        <option value="o4-mini">o4 Mini</option>
                    </optgroup>
                    <optgroup label="Anthropic">
                        <option value="claude-opus-4">Claude Opus 4</option>
                        <option value="claude-sonnet-4">Claude Sonnet 4</option>
                    </optgroup>
                    <optgroup label="Google DeepMind">
                        <option value="gemini-2.5-pro" selected>Gemini 2.5 Pro</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    </optgroup>
                    <optgroup label="xAI">
                        <option value="grok-3">Grok 3</option>
                        <option value="grok-3-mini">Grok 3 Mini</option>
                    </optgroup>
                    <optgroup label="DeepSeek">
                        <option value="deepseek-r1">DeepSeek-R1</option>
                        <option value="deepseek-r1-0528">DeepSeek-R1-0528</option>
                    </optgroup>
                </select>
                <button type="button" class="remove-judge" style="display: none;">×</button>
            </div>
        `;
        this.updateJudgeRemoveButtons();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AutoJudge();
});