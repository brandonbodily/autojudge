# AutoJudge
**Task-Agnostic Evaluation Framework**

AutoJudge is a powerful web-based tool that enables head-to-head evaluation of AI language models across any task or domain. By leveraging multiple AI judges, it provides objective, comprehensive assessments to help you choose the best model for your specific needs.

## Features

- **Universal Model Comparison**: Automatically compare any two AI models across diverse tasks
- **Multi-Judge Evaluation**: Uses multiple AI models as judges for balanced assessment
- **Dynamic Rubric Generation**: Automatically creates task-specific evaluation criteria
- **Real-time Progress Tracking**: Monitor evaluation stages with live updates
- **Comprehensive Results**: Detailed scoring, reasoning, and model outputs

## Supported Models

### OpenAI
- GPT-4o
- GPT-4.1 Mini
- o3 Mini
- o4 Mini

## Getting Started

### Prerequisites

1. **API Keys**: You'll need API keys for the model providers you want to use
2. **Web Browser**: Modern browser with JavaScript enabled
3. **Local Server**: For serving the application files

### Setup

1. **Clone or Download** the AutoJudge files
2. **Configure API Keys**: Create a `.env` file in the root directory:
   ```
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here
   GOOGLE_API_KEY=your_google_key_here
   XAI_API_KEY=your_xai_key_here
   DEEPSEEK_API_KEY=your_deepseek_key_here
   ```
3. **Serve the Application**: Use a local web server to serve the files:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
4. **Access AutoJudge**: Open `http://localhost:8000` in your browser

### Usage

1. **Enter Task Prompt**: Describe the task you want the models to perform
2. **Select Models**: Choose two models to compare
3. **Configure Judges**: Select 3 or more judge models for evaluation
4. **Start Evaluation**: Click "Start Eval" to begin the comparison
5. **Review Results**: Analyze scores, reasoning, and detailed outputs

## Applications

### Utility Applications

#### General Public Model Selection
Quickly identify the best model for specialized tasks:
- Creating a Twitter bot for Bay Area bike club
- Explaining quantum physics to children  
- Planning coding project for calculator app

#### Fine-Tuned Model Guardrail Monitoring
Instantly check if hyper-fine-tuned models deviate from intended guidelines:
- Supplements limited human-created test questions
- Ensures model behavior stays within acceptable boundaries

### Research Applications

#### LLM Self-Preference Bias
Investigate if models inherently favor their own outputs:
- Crucial implications for SEO and content ranking
- Important for platforms like Google that may use AI for ranking

#### Identifying Niche Knowledge Gaps
Discover specific domains or topics inadequately covered by models:
- Enables targeted data augmentation efforts
- Guides additional training in weak areas

## How It Works

1. **Rubric Generation**: AutoJudge creates task-specific evaluation criteria using a reliable judge model
2. **Model Response Collection**: Both selected models generate responses to your prompt
3. **Multi-Judge Evaluation**: Judge models assess responses across the generated criteria
4. **Score Aggregation**: Individual judge scores are combined for final rankings
5. **Comprehensive Reporting**: Detailed results include scores, reasoning, and full model outputs

## File Structure

```
autojudge/
├── index.html          # Main application interface
├── script.js           # Core application logic
├── styles.css          # User interface styling
├── .env               # API keys configuration
└── README.md          # This documentation
```
