const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Gaki\\.gemini\\antigravity-ide\\brain\\c15a36d0-c3c9-4881-979f-fc2518de598e\\.system_generated\\logs\\transcript.jsonl';
const outputPath = 'C:\\Users\\Gaki\\Documents\\podocare-system-master\\Sistema de Gestion de Farmacia\\extracted_prompt.md';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  if (lines.length > 0 && lines[0].trim() !== '') {
    const firstStep = JSON.parse(lines[0]);
    const userRequest = firstStep.content;
    fs.writeFileSync(outputPath, userRequest, 'utf8');
    console.log('Successfully wrote prompt to:', outputPath);
  } else {
    console.log('No lines found in transcript.jsonl');
  }
} catch (err) {
  console.error('Error:', err);
}
