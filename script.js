class AutoJudge {
    constructor() {
        this.currentBattle = null;
        this.initializeEventListeners();
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
            alert('Battle failed. Please try again.');
            this.resetBattle();
        }
    }

    async generateRubric() {
        this.setStepActive('step-rubric');
        
        await this.delay(2000);

        const rubrics = [
            {
                criteria: ['Accuracy', 'Clarity', 'Completeness', 'Creativity'],
                description: 'Evaluation based on factual correctness, clear communication, thoroughness, and innovative approach.'
            },
            {
                criteria: ['Relevance', 'Detail', 'Structure', 'Practicality'],
                description: 'Assessment of how well the response addresses the prompt with appropriate detail and organization.'
            },
            {
                criteria: ['Logic', 'Evidence', 'Coherence', 'Usefulness'],
                description: 'Judgment based on logical reasoning, supporting evidence, consistency, and practical value.'
            }
        ];

        this.currentBattle.rubric = rubrics[Math.floor(Math.random() * rubrics.length)];
        this.setStepCompleted('step-rubric');
    }

    async getModelResponses() {
        this.setStepActive('step-responses');
        
        await this.delay(3000);

        const sampleResponses = {
            'gpt-4o': 'GPT-4o provides a comprehensive and well-structured response with detailed explanations and practical examples.',
            'claude-3.5-sonnet': 'Claude 3.5 Sonnet offers a thoughtful analysis with clear reasoning and creative insights.',
            'gemini-pro': 'Gemini Pro delivers a balanced response with good factual accuracy and helpful suggestions.',
            'llama-3.1-70b': 'Llama 3.1 70B generates a detailed response with strong logical flow and practical applications.'
        };

        this.currentBattle.responses = {
            model1: sampleResponses[this.currentBattle.model1] || 'Model response generated.',
            model2: sampleResponses[this.currentBattle.model2] || 'Model response generated.'
        };

        this.setStepCompleted('step-responses');
    }

    async evaluateResponses() {
        this.setStepActive('step-judging');
        
        await this.delay(4000);

        const judges = this.getJudges();
        const judgeEvaluations = {};

        judges.forEach(judge => {
            const evaluation = this.generateJudgeEvaluation();
            judgeEvaluations[judge] = {
                overallScores: {
                    model1: evaluation.model1Overall,
                    model2: evaluation.model2Overall
                },
                metrics: evaluation.metrics,
                reasoning: evaluation.reasoning
            };
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

        this.setStepCompleted('step-judging');
    }

    generateRandomScore() {
        return Math.round((Math.random() * 4 + 6) * 10) / 10;
    }

    generateJudgeEvaluation() {
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

        const reasoningTemplates = [
            "Model 1 demonstrated stronger logical flow and evidence-based reasoning, while Model 2 excelled in creativity and practical applications.",
            "Both models provided comprehensive responses, but Model 1 showed superior accuracy and detail, whereas Model 2 offered better structure and clarity.",
            "Model 2 outperformed in relevance and usefulness, though Model 1 provided more thorough coverage of the topic with better coherence.",
            "The responses were closely matched, with Model 1 showing slight advantages in completeness and Model 2 demonstrating better practical value."
        ];

        return {
            model1Overall,
            model2Overall,
            metrics,
            reasoning: reasoningTemplates[Math.floor(Math.random() * reasoningTemplates.length)]
        };
    }

    calculateAverage(scores) {
        return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
    }

    showResults() {
        const { model1, model2, rubric, scores, responses } = this.currentBattle;
        const { averages, individual } = scores;

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
            'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
            'gemini-pro': 'Gemini Pro',
            'llama-3.1-70b': 'Llama 3.1 70B'
        };
        return displayNames[modelId] || modelId;
    }

    getJudgeDisplayName(judgeId) {
        const displayNames = {
            'gpt-4o': 'GPT-4o',
            'claude-4-sonnet': 'Claude 4 Sonnet',
            'gemini-2.5': 'Gemini 2.5',
            'o3': 'o3'
        };
        return displayNames[judgeId] || judgeId;
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
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-4-sonnet">Claude 4 Sonnet</option>
                <option value="gemini-2.5">Gemini 2.5</option>
                <option value="o3">o3</option>
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
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="claude-4-sonnet">Claude 4 Sonnet</option>
                    <option value="gemini-2.5">Gemini 2.5</option>
                    <option value="o3" selected>o3</option>
                </select>
                <button type="button" class="remove-judge" style="display: none;">×</button>
            </div>
            <div class="judge-item">
                <select class="judge-select">
                    <option value="">Choose a judge...</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="claude-4-sonnet" selected>Claude 4 Sonnet</option>
                    <option value="gemini-2.5">Gemini 2.5</option>
                    <option value="o3">o3</option>
                </select>
                <button type="button" class="remove-judge" style="display: none;">×</button>
            </div>
            <div class="judge-item">
                <select class="judge-select">
                    <option value="">Choose a judge...</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="claude-4-sonnet">Claude 4 Sonnet</option>
                    <option value="gemini-2.5" selected>Gemini 2.5</option>
                    <option value="o3">o3</option>
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