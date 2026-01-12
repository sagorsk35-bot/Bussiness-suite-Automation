const logger = require('../utils/logger');
const conversationService = require('../services/conversationService');
const facebookService = require('../services/facebookService');
const aiService = require('../services/aiService');

class FlowEngine {
  constructor() {
    this.flows = new Map();
    this.triggers = new Map();
  }

  /**
   * Register a flow
   * @param {string} name - Flow name
   * @param {object} flow - Flow definition
   */
  registerFlow(name, flow) {
    this.flows.set(name, flow);
    logger.info(`Flow registered: ${name}`);

    // Register triggers if defined
    if (flow.triggers) {
      flow.triggers.forEach(trigger => {
        if (!this.triggers.has(trigger.type)) {
          this.triggers.set(trigger.type, []);
        }
        this.triggers.get(trigger.type).push({
          flowName: name,
          ...trigger
        });
      });
    }
  }

  /**
   * Check if a message triggers any flow
   * @param {string} message - The user's message
   * @param {string} userId - The user's ID
   */
  checkTriggers(message, userId) {
    const lowerMessage = message.toLowerCase().trim();

    // Check keyword triggers
    const keywordTriggers = this.triggers.get('keyword') || [];
    for (const trigger of keywordTriggers) {
      const keywords = trigger.keywords || [];
      if (keywords.some(kw => lowerMessage.includes(kw.toLowerCase()))) {
        return trigger.flowName;
      }
    }

    // Check exact match triggers
    const exactTriggers = this.triggers.get('exact') || [];
    for (const trigger of exactTriggers) {
      if (trigger.value?.toLowerCase() === lowerMessage) {
        return trigger.flowName;
      }
    }

    // Check regex triggers
    const regexTriggers = this.triggers.get('regex') || [];
    for (const trigger of regexTriggers) {
      if (new RegExp(trigger.pattern, 'i').test(message)) {
        return trigger.flowName;
      }
    }

    return null;
  }

  /**
   * Execute a flow step
   * @param {string} userId - The user's ID
   * @param {string} flowName - The flow name
   * @param {string} stepName - The step name
   * @param {object} context - Additional context
   */
  async executeStep(userId, flowName, stepName, context = {}) {
    const flow = this.flows.get(flowName);
    if (!flow) {
      logger.error(`Flow not found: ${flowName}`);
      return null;
    }

    const step = flow.steps?.[stepName];
    if (!step) {
      logger.error(`Step not found: ${stepName} in flow ${flowName}`);
      return null;
    }

    logger.debug(`Executing step ${stepName} in flow ${flowName} for user ${userId}`);

    // Execute actions in the step
    for (const action of step.actions || []) {
      await this.executeAction(userId, action, context);
    }

    // Update flow state
    if (step.next) {
      conversationService.setFlow(userId, flowName, step.next);
    } else if (step.waitForInput) {
      conversationService.setFlow(userId, flowName, stepName);
    } else {
      conversationService.clearFlow(userId);
    }

    return step;
  }

  /**
   * Execute an action
   * @param {string} userId - The user's ID
   * @param {object} action - The action to execute
   * @param {object} context - Additional context
   */
  async executeAction(userId, action, context = {}) {
    const variables = conversationService.getAllVariables(userId);
    const userProfile = conversationService.getUserProfile(userId);

    switch (action.type) {
      case 'send_text':
        let text = this.interpolateVariables(action.text, variables, userProfile);
        await facebookService.sendTypingIndicator(userId);
        await this.delay(action.delay || 500);
        await facebookService.sendTextMessage(userId, text);
        conversationService.addMessage(userId, text, true);
        break;

      case 'send_quick_replies':
        const qrText = this.interpolateVariables(action.text, variables, userProfile);
        await facebookService.sendTypingIndicator(userId);
        await this.delay(action.delay || 500);
        await facebookService.sendQuickReplies(userId, qrText, action.replies);
        conversationService.addMessage(userId, qrText, true);
        break;

      case 'send_buttons':
        const btnText = this.interpolateVariables(action.text, variables, userProfile);
        await facebookService.sendTypingIndicator(userId);
        await this.delay(action.delay || 500);
        await facebookService.sendButtonTemplate(userId, btnText, action.buttons);
        conversationService.addMessage(userId, btnText, true);
        break;

      case 'send_carousel':
        await facebookService.sendTypingIndicator(userId);
        await this.delay(action.delay || 500);
        await facebookService.sendGenericTemplate(userId, action.elements);
        break;

      case 'set_variable':
        let value = action.value;
        if (action.fromInput && context.userInput) {
          value = context.userInput;
        }
        conversationService.setVariable(userId, action.name, value);
        break;

      case 'ai_response':
        await facebookService.sendTypingIndicator(userId);
        const history = conversationService.getHistory(userId);
        const prompt = action.prompt
          ? this.interpolateVariables(action.prompt, variables, userProfile)
          : context.userInput;

        const aiResponse = await aiService.generateResponse(prompt, history, userProfile);
        await facebookService.sendTextMessage(userId, aiResponse);
        conversationService.addMessage(userId, aiResponse, true);
        break;

      case 'condition':
        const result = this.evaluateCondition(action.condition, variables, context);
        if (result && action.then) {
          for (const thenAction of action.then) {
            await this.executeAction(userId, thenAction, context);
          }
        } else if (!result && action.else) {
          for (const elseAction of action.else) {
            await this.executeAction(userId, elseAction, context);
          }
        }
        break;

      case 'goto_flow':
        conversationService.setFlow(userId, action.flow, action.step || 'start');
        await this.executeStep(userId, action.flow, action.step || 'start', context);
        break;

      case 'delay':
        await this.delay(action.duration || 1000);
        break;

      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Handle user input within a flow
   * @param {string} userId - The user's ID
   * @param {string} input - The user's input
   */
  async handleFlowInput(userId, input) {
    const { flow: flowName, step: stepName } = conversationService.getFlowState(userId);

    if (!flowName || !stepName) {
      return false;
    }

    const flow = this.flows.get(flowName);
    const step = flow?.steps?.[stepName];

    if (!step) {
      return false;
    }

    // Check if step is waiting for input
    if (!step.waitForInput) {
      return false;
    }

    // Store input if configured
    if (step.storeInputAs) {
      conversationService.setVariable(userId, step.storeInputAs, input);
    }

    // Check input handlers
    if (step.inputHandlers) {
      for (const handler of step.inputHandlers) {
        let matches = false;

        if (handler.type === 'exact' && input.toLowerCase() === handler.value?.toLowerCase()) {
          matches = true;
        } else if (handler.type === 'contains' && input.toLowerCase().includes(handler.value?.toLowerCase())) {
          matches = true;
        } else if (handler.type === 'regex' && new RegExp(handler.pattern, 'i').test(input)) {
          matches = true;
        } else if (handler.type === 'any') {
          matches = true;
        }

        if (matches) {
          if (handler.actions) {
            for (const action of handler.actions) {
              await this.executeAction(userId, action, { userInput: input });
            }
          }
          if (handler.goto) {
            conversationService.setFlow(userId, flowName, handler.goto);
            await this.executeStep(userId, flowName, handler.goto, { userInput: input });
          }
          return true;
        }
      }
    }

    // Default: move to next step
    if (step.next) {
      conversationService.setFlow(userId, flowName, step.next);
      await this.executeStep(userId, flowName, step.next, { userInput: input });
      return true;
    }

    return false;
  }

  /**
   * Interpolate variables in text
   */
  interpolateVariables(text, variables, userProfile) {
    let result = text;

    // Replace {{variable}} patterns
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (varName === 'first_name' && userProfile?.first_name) {
        return userProfile.first_name;
      }
      if (varName === 'last_name' && userProfile?.last_name) {
        return userProfile.last_name;
      }
      return variables[varName] || match;
    });

    return result;
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(condition, variables, context) {
    const { field, operator, value } = condition;
    const fieldValue = variables[field] || context[field];

    switch (operator) {
      case 'equals':
        return fieldValue == value;
      case 'not_equals':
        return fieldValue != value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      default:
        return false;
    }
  }

  /**
   * Helper to create delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start a flow for a user
   */
  async startFlow(userId, flowName) {
    conversationService.setFlow(userId, flowName, 'start');
    await this.executeStep(userId, flowName, 'start');
  }

  /**
   * Get all registered flows
   */
  getFlows() {
    return Array.from(this.flows.keys());
  }
}

module.exports = new FlowEngine();
