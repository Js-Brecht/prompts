const prompts = require('../dist');

prompts([/* {
  name: 'textEmoji',
  type: 'text',
  message: 'Emoji text prompt',
  hint: 'This prompt should display Emojis as input mask',
  style: 'emoji',
  validate: (answer) => {
    if (!/^[a-zA-Z-]+$/.test(answer)) {
      return 'Test kebab-style-only error message, random asldfjasgklhasgiolwrfgkdsgnsk';
    }
    return true;
  },
}, {
  name: 'textInvisible',
  type: 'text',
  message: 'Password text prompt',
  hint: 'This prompt should display asterisks as input mask',
  style: 'password',
  validate: (answer) => {
    if (!/^[a-zA-Z-]+$/.test(answer)) {
      return 'Test kebab-style-only error message, random asldfjasgklhasgiolwrfgkdsgnsk';
    }
    return true;
  },
},  *//* {
  name: 'textOnePrompt',
  type: 'text',
  message: 'textOnePrompt',
  initial: 'one-line-initial-text',
  hint: 'Testing hint values for text prompt',
  validate: (answer) => {
    if (!/^[a-zA-Z-]+$/.test(answer)) {
      return 'Test kebab-style-only error message, random asldfjasgklhasgiolwrfgkdsgnsk';
    }
    return true;
  },
},  */{
  name: 'textTwoPrompt',
  type: 'text',
  message: 'textTwoPrompt\nTwo line prompt!',
  initial: 'two-line-initial-text',
  hint: 'Testing hint values for two line text prompt',
  validate: (answer) => {
    if (!/^[a-zA-Z-]+$/.test(answer)) {
      return 'Test kebab-style-only error message, random asldfjasgklhasgiolwrfgkdsgnsk';
    }
    return true;
  },
}, {
  name: 'textTwoNoHint',
  type: 'text',
  message: 'No Hint Text Prompt',
  initial: 'no-hint-initial-text',
  validate: (answer) => {
    if (!/^[a-zA-Z-]+$/.test(answer)) {
      return 'Test kebab-style-only error message, random asldfjasgklhasgiolwrfgkdsgnsk';
    }
    return true;
  },
}]).then(console.log);
