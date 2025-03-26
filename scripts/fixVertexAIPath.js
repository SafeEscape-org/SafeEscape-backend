const fs = require('fs');
const path = require('path');

// Define paths
const sourceDir = path.join(__dirname, '..', 'services', 'vetex ai');
const targetDir = path.join(__dirname, '..', 'services', 'vertexai');

// Check if source directory exists
console.log('Checking for source directory:', sourceDir);
if (!fs.existsSync(sourceDir)) {
  console.log('Source directory does not exist, nothing to migrate');
  process.exit(0);
}

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  console.log('Creating target directory:', targetDir);
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy files from source to target
console.log('Copying files from source to target directory');
fs.readdirSync(sourceDir).forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  
  // Skip if already exists in target
  if (fs.existsSync(targetPath)) {
    console.log(`File already exists in target, skipping: ${file}`);
    return;
  }
  
  // Copy the file
  const content = fs.readFileSync(sourcePath);
  fs.writeFileSync(targetPath, content);
  console.log(`Copied: ${file}`);
});

console.log('File migration complete');
console.log('NOTE: The source directory has not been deleted. After verifying that everything works correctly,');
console.log('you can manually delete the "services/vetex ai" directory.');
