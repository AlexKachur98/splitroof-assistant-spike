const { ask } = require('./assistant');

// TODO: pull the member from auth instead of making them say who they are
ask(process.argv[2]).then(res => {
  console.log(res.text);
  if (res.toolCalls.length > 0) {
    console.log('- ' + res.toolCalls.map(c => c.name + ' ' + JSON.stringify(c.input)).join(', '));
  }
});
