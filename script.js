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

        [promptInput, model1Select, model2Select].forEach(element => {
            element.addEventListener('input', () => this.validateInputs());
        });

        startBattleBtn.addEventListener('click', () => this.startBattle());
        newBattleBtn.addEventListener('click', () => this.resetBattle());
    }

    validateInputs() {
        const prompt = document.getElementById('prompt').value.trim();
        const model1 = document.getElementById('model1').value;
        const model2 = document.getElementById('model2').value;
        const startBattleBtn = document.getElementById('start-battle');

        const isValid = prompt.length > 0 && model1 && model2 && model1 !== model2;
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

        const judges = ['Judge A', 'Judge B', 'Judge C'];
        const judgeScores = {};

        judges.forEach(judge => {
            judgeScores[judge] = {
                model1: this.generateRandomScore(),
                model2: this.generateRandomScore()
            };
        });

        const avgModel1 = this.calculateAverage(Object.values(judgeScores).map(j => j.model1));
        const avgModel2 = this.calculateAverage(Object.values(judgeScores).map(j => j.model2));

        this.currentBattle.scores = {
            individual: judgeScores,
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

    calculateAverage(scores) {
        return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
    }

    showResults() {
        const { model1, model2, rubric, scores } = this.currentBattle;
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

        document.getElementById('rubric-display').innerHTML = `
            <strong>Criteria:</strong> ${rubric.criteria.join(', ')}<br>
            <strong>Description:</strong> ${rubric.description}
        `;

        let judgeScoresHtml = '';
        Object.entries(individual).forEach(([judge, scores]) => {
            judgeScoresHtml += `
                <div style="margin-bottom: 10px;">
                    <strong>${judge}:</strong> 
                    ${this.getModelDisplayName(model1)}: ${scores.model1} | 
                    ${this.getModelDisplayName(model2)}: ${scores.model2}
                </div>
            `;
        });
        document.getElementById('judge-scores').innerHTML = judgeScoresHtml;

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
        
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        this.validateInputs();
        this.showSection('battle-setup');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AutoJudge();
});