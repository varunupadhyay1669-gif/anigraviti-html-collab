const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const WATCH_DIR = __dirname;
let isPushing = false;
let pushTimeout = null;

console.log(`Starting Auto-Push watcher on: ${WATCH_DIR}`);

// Directories to ignore
const IGNORE_DIRS = ['.git', 'node_modules', '.gemini', '.vscode'];
const IGNORE_FILES = ['auto-push.js'];

function pushChanges() {
    if (isPushing) return;
    
    // Quick check if there are changes before declaring it
    exec('git status --porcelain', { cwd: WATCH_DIR }, (err, stdout) => {
        if (!stdout || stdout.trim() === '') {
            // Nothing to commit
            return;
        }

        isPushing = true;
        console.log(`[${new Date().toLocaleTimeString()}] Detected changes, pushing to GitHub...`);
        
        exec('git add . && git commit -m "Auto-save commit" && git push', { cwd: WATCH_DIR }, (error, stdout2, stderr2) => {
            if (error && !stdout2.includes('nothing to commit')) {
                console.error(`Error during push: ${error.message}`);
                console.error(stderr2);
            } else if (stdout2.includes('nothing to commit')) {
                // Done
            } else {
                console.log(`[${new Date().toLocaleTimeString()}] Successfully pushed changes to GitHub.`);
            }
            isPushing = false;
            
            // Check if more changes happened while pushing
            exec('git status --porcelain', { cwd: WATCH_DIR }, (err3, stdout3) => {
                if (stdout3 && stdout3.trim() !== '') {
                    triggerPush(); // Re-trigger
                }
            });
        });
    });
}

function triggerPush() {
    if (pushTimeout) clearTimeout(pushTimeout);
    pushTimeout = setTimeout(pushChanges, 2000); // 2-second debounce
}

function watchRecursive(dir) {
    try {
        fs.watch(dir, (eventType, filename) => {
            if (filename) {
                // Check ignore list
                if (IGNORE_DIRS.some(ignored => filename.includes(ignored))) return;
                if (IGNORE_FILES.some(ignored => filename === ignored)) return;
            }
            triggerPush();
        });

        fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
            if (ent.isDirectory() && !IGNORE_DIRS.includes(ent.name)) {
                try {
                    watchRecursive(path.join(dir, ent.name));
                } catch(e) {
                    // Ignore access errors
                }
            }
        });
    } catch(e) {
        // Ignore dirs we can't watch
    }
}

watchRecursive(WATCH_DIR);
console.log('Watching for file changes. Keep this terminal open!');
