const prompts = require('../dist');

prompts([{
  type: 'multiselect',
  name: 'value',
  message: 'Pick colors',
  instructions: true,
  optionsPerPage: 4,
  choices: [
    { title: 'Red', value: '#ff0000' },
    { title: 'Green', value: '#00ff00' },
    { title: 'Blue', value: '#0000ff' },
    { title: 'Yellow', value: '#9B870C' },
    { title: 'Black', value: '#000000' },
    { title: 'Orange', value: '#ffa500' },
    { title: 'Teal', value: '#ff0000' },
    { title: 'Cyan', value: '#008080' },
    { title: 'Magenta', value: '#ff00ff' },
  ],
  // max: 2,
  hint: '- Space to select. Return to submit'
}]).then(console.log);
