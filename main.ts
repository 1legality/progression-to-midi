// Main.ts
import { setupChordProgressionSequencer } from './ChordProgressionSequencer';

// Only run the sequencer setup on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupChordProgressionSequencer);
} else {
    setupChordProgressionSequencer();
}
 