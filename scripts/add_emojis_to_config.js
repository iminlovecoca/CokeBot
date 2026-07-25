const fs = require('fs');
const path = require('path');

const rawText = `<a:qsf:1530650567590805514><a:qhf:1530650561966244080><a:qdf:1530650555716997140>
<a:qcf:1530650550217998436><a:ksf:1530650545952522271>
<a:khf:1530650540478955641>
<a:kdf:1530650534409797754><a:kcf:1530650528587976794><a:jsf:1530650522648969246><a:jhf:1530650516995182863><a:jdf:1530650510888013894><a:jcf:1530650504810463272><a:asf:1530650498711945447><a:adf:1530650486485680259><a:ahf:1530650492542124263><a:acf:1530650479934177350><a:10sf:1530650473030483998><a:10hf:1530650467103674588><a:10df:1530650461080784956><a:10cf:1530650455347040306><a:9sf:1530650449013641428><a:9hf:1530650443187749006><a:9df:1530650437110202599><a:9cf:1530650430844174506><a:8sf:1530650423709405245><a:8hf:1530650418198216845><a:8df:1530650412309413910><a:8cf:1530650390280929400><a:7sf:1530650382546632838><a:7hf:1530650377102430331><a:7df:1530650369942622208><a:7cf:1530650363966001314><a:6sf:1530650357867479152><a:6hf:1530650352175812799><a:6df:1530650348329631764><a:6cf:1530650342570725456><a:5sf:1530650339919794236><a:5hf:1530650334144237619><a:5df:1530650328335388834><a:5cf:1530650322668879923><a:4sf:1530650316691996834><a:4hf:1530650311277154457><a:4df:1530650306407436399><a:4cf:1530650301797892216><a:3sf:1530650296253026354><a:3hf:1530650290166956376><a:3df:1530650285993627668><a:3cf:1530650280197099520><a:2sf:1530650274367279276><a:2hf:1530650268218163251><a:2df:1530650263868670022><a:2cf:1530650257438937159>`;

const matches = [...rawText.matchAll(/<a:([a-z0-9]+):(\d+)>/gi)];
console.log('Found matches:', matches.length);

const entries = {};
for (const m of matches) {
  const tag = m[0];
  const keyLower = m[1]; // e.g. qsf
  const keyUpper = keyLower.charAt(0).toUpperCase() + keyLower.slice(1); // e.g. Qsf
  entries[keyLower] = tag;
  entries[keyUpper] = tag;
}

const configPath = path.join(__dirname, '..', 'data', 'config.js');
let configFile = fs.readFileSync(configPath, 'utf8');

const targetStr = `Kc: "<:kc:1387746037199798445>",`;
const linesToInsert = Object.entries(entries).map(([k, v]) => `    "${k}": "${v}",`).join('\n');
const replacement = targetStr + '\n' + linesToInsert;

if (configFile.includes(targetStr)) {
  configFile = configFile.replace(targetStr, replacement);
  fs.writeFileSync(configPath, configFile, 'utf8');
  console.log('Successfully added all 52 animated card flip emojis to data/config.js!');
} else {
  console.error('Target string not found in data/config.js');
}
