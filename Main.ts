// Main.ts
import { setupChordProgressionSequencer } from './ChordProgressionSequencer';
import { setupStepSequencerUI } from './StepSequencer';

// Only run the appropriate setup on DOMContentLoaded
function runAppInit() {
    if (document.getElementById('midiForm')) {
        setupChordProgressionSequencer();
    } else if (document.getElementById('sequencerForm')) {
        setupStepSequencerUI();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAppInit);
} else {
    runAppInit();
}
