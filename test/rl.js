const readline = require('readline');
const { cursor, erase } = require('sisteransi');
// const pattern = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/;

const esc = '\x1B';
const csi = `${esc}[`;
const term = {
  clear: () => { process.stdout.write (erase.screen); },
  setScroll: (start = 0, end = process.stdout.rows) => {
    process.stdout.write(`${csi}${start}${end < process.stdout.rows ? `;${end}` : ``}r`)
  },
  reset: () => {
    process.stdout.write(`${csi}!p`)
  },
}
const debugOutput = (key) => {
  process.stdout.write(
    cursor.save +
    cursor.to(0, process.stdout.rows - 2) +
    JSON.stringify(key) +
    erase.lineEnd + `\n` +
    typeof key.sequence +
    erase.lineEnd +
    cursor.restore
  );
};

term.clear();
term.setScroll(process.stdout.rows - 2);
const rl = readline.createInterface(process.stdin, process.stdout);

rl.setPrompt('Test input: ');
rl.prompt();

process.stdin.on('keypress', (c, k) => {
  debugOutput(k)
})
rl.on('close', () => {
  process.exit(0);
});
rl.on('SIGINT', () => {
  console.log('SIGINT');
  rl.close();
})
process.on('exit', () => {
  term.reset();
});
