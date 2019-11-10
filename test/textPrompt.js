const prompts = require('../dist');

prompts([{
  name: 'textPrompt',
  type: 'text',
  message: 'Please enter some text',
  initial: 'Some initial text',
  hint: 'Testing hint values for text prompt',
  validate: (answer) => {
    if (!/^[a-zA-Z]+$/.test(answer)) {
      return 'Test alpha-only error message, random asldfjasgklhasgiolwrfgkdsgnsk';
    }
    return true;
  },
}]).then(console.log);
