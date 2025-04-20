// main.ts
import { MidiGenerator, MidiGenerationOptions, MidiGenerationResult } from './MidiGenerator';
import { PianoRollDrawer } from './PianoRollDrawer';
import { SynthChordPlayer } from './SynthChordPlayer'; 

// Keep NoteData interface accessible if needed by main.ts directly
interface NoteData {
    midiNote: number;
    startTimeTicks: number;
    durationTicks: number;
    velocity: number;
}


/**
 * Creates a temporary link and clicks it to download a blob.
 * @param blob - The Blob to download.
 * @param filename - The desired filename for the download.
 */
function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
}

function setupApp() {
    const form = document.getElementById('midiForm') as HTMLFormElement | null;
    const statusDiv = document.getElementById('status');
    const velocitySlider = document.getElementById('velocity') as HTMLInputElement | null;
    const velocityValueSpan = document.getElementById('velocityValue');
    const pianoRollCanvas = document.getElementById('pianoRollCanvas') as HTMLCanvasElement | null;
    const downloadMidiOnlyButton = document.getElementById('downloadMidiOnlyButton') as HTMLButtonElement | null;
    const playButtonContainer = document.getElementById('playButtonContainer') as HTMLDivElement | null;
    const playButton = document.getElementById('playButton') as HTMLButtonElement | null;

    if (!form || !statusDiv || !velocitySlider || !velocityValueSpan || !pianoRollCanvas || !downloadMidiOnlyButton || !playButtonContainer || !playButton) {
        console.error("One or more required HTML elements not found!");
        if (statusDiv) statusDiv.textContent = "Error: Could not initialize the application (missing elements).";
        return;
    }

    let pianoRollDrawer: PianoRollDrawer;
    try {
        pianoRollDrawer = new PianoRollDrawer(pianoRollCanvas);
    } catch (error: any) {
        console.error("Failed to initialize PianoRollDrawer:", error);
        if (statusDiv) {
            statusDiv.textContent = `Error: Canvas setup failed - ${error.message}`;
            statusDiv.classList.add('text-danger'); // Bootstrap's text-danger for error styling
        }
        pianoRollCanvas.style.border = '2px solid red'; // Visual indicator
        return;
    }

    const midiGenerator = new MidiGenerator();
    let lastGeneratedResult: MidiGenerationResult | null = null; // Store the last successful result
    const synth = new SynthChordPlayer(0.5); // Initialize the synthesizer with default volume
    let lastGeneratedNotes: NoteData[] = []; // Store the last generated notes for playback
    let lastGeneratedMidiBlob: Blob | null = null; // Store the generated MIDI blob in memory

    // --- Update velocity display ---
    velocitySlider.addEventListener('input', (event) => {
        velocityValueSpan.textContent = (event.target as HTMLInputElement).value;
    });

    // --- Common function to get options and generate MIDI ---
    const handleGeneration = (isDownloadOnly: boolean): void => {
        const actionText = isDownloadOnly ? "Generating MIDI file" : "Generating preview and MIDI";
        statusDiv.textContent = `${actionText}...`;
        statusDiv.classList.remove('text-danger', 'text-success');
        statusDiv.classList.add('text-muted'); // Bootstrap's text-muted for neutral status

        try {
            // Stop any currently playing chord loop before generating a new preview
            synth.stopAll();

            // 1. Get form data
            const formData = new FormData(form);
            const options: MidiGenerationOptions = {
                progressionString: formData.get('progression') as string,
                outputFileName: formData.get('outputFileName') as string || undefined, // Let generator handle default
                addBassNote: formData.has('addBassNote'),
                inversionType: formData.get('inversionType') as 'none' | 'first' | 'smooth',
                baseOctave: parseInt(formData.get('baseOctave') as string, 10),
                chordDurationStr: formData.get('chordDuration') as string,
                tempo: parseInt(formData.get('tempo') as string, 10),
                velocity: parseInt(formData.get('velocity') as string, 10)
            };

            // Basic validation for inversionType in case something goes wrong with form data
            if (!['none', 'first', 'smooth'].includes(options.inversionType)) {
                console.warn(`Invalid inversionType received: ${options.inversionType}. Defaulting to 'none'.`);
                options.inversionType = 'none';
            }

            // 2. Generate MIDI and Notes
            const generationResult = midiGenerator.generate(options);
            lastGeneratedResult = generationResult; // Store successful result
            lastGeneratedNotes = generationResult.notesForPianoRoll; // Store notes for playback
            lastGeneratedMidiBlob = generationResult.midiBlob; // Store the MIDI blob for playback

            // 3. Update UI / Trigger Download
            if (isDownloadOnly) {
                triggerDownload(generationResult.midiBlob, generationResult.finalFileName);
                statusDiv.textContent = `MIDI file "${generationResult.finalFileName}" download initiated.`;
                statusDiv.classList.replace('text-muted', 'text-success'); // Bootstrap's text-success for success
            } else {
                pianoRollDrawer.draw(generationResult.notesForPianoRoll);
                statusDiv.textContent = `Preview generated.`;
                statusDiv.classList.replace('text-muted', 'text-success'); // Bootstrap's text-success for success
            }

            // Show the play button if there is MIDI data to play
            if (lastGeneratedMidiBlob) {
                playButtonContainer.classList.remove('d-none'); // Bootstrap's d-none to show the container
            } else {
                playButtonContainer.classList.add('d-none'); // Hide the container
            }

        } catch (error: any) {
            console.error(`Error during MIDI generation (${actionText}):`, error);
            lastGeneratedResult = null; // Clear last result on error
            lastGeneratedNotes = []; // Clear notes on error
            lastGeneratedMidiBlob = null; // Clear MIDI blob on error
            statusDiv.textContent = `Error: ${error.message || 'Failed to generate MIDI.'}`;
            statusDiv.classList.replace('text-muted', 'text-danger'); // Bootstrap's text-danger for errors
            pianoRollDrawer.drawErrorMessage("Error generating preview"); // Use drawer's error display
            playButtonContainer.classList.add('d-none'); // Hide play button on error
        }
    };

    // --- Form Submission Handler (Generate Preview) ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleGeneration(false); // Generate preview + MIDI data
    });

    // --- Event Listener for "Download MIDI Only" Button ---
    downloadMidiOnlyButton.addEventListener('click', (event) => {
        event.preventDefault();
        handleGeneration(true); // Generate MIDI data only for download
    });

    // Add logic to toggle play and stop functionality for the play button
    let isPlaying = false;

    playButton.addEventListener('click', async () => {
        if (isPlaying) {
            synth.stopAll();
            playButton.textContent = 'Play Chord Progression';
            playButton.classList.remove('stop'); // Remove red styling
            isPlaying = false;
            return;
        }

        if (!lastGeneratedNotes || lastGeneratedNotes.length === 0) {
            console.warn("No notes to play.");
            return;
        }

        await synth.ensureContextResumed();

        const sortedNotes = [...lastGeneratedNotes].sort((a, b) => a.startTimeTicks - b.startTimeTicks);
        const tempo = parseInt((form.querySelector('[name="tempo"]') as HTMLInputElement).value, 10) || 120;
        const ticksPerQuarterNote = 480;
        const secondsPerTick = (60 / tempo) / ticksPerQuarterNote;

        const playProgression = () => {
            if (!isPlaying) return;

            sortedNotes.forEach(note => {
                const startTime = note.startTimeTicks * secondsPerTick;
                const duration = note.durationTicks * secondsPerTick;

                setTimeout(() => {
                    if (isPlaying) {
                        synth.playChord([note.midiNote], duration);
                    }
                }, startTime * 1000);
            });

            const totalDuration = sortedNotes[sortedNotes.length - 1].startTimeTicks * secondsPerTick + 
                                  sortedNotes[sortedNotes.length - 1].durationTicks * secondsPerTick;
            setTimeout(() => {
                if (isPlaying) playProgression();
            }, totalDuration * 1000);
        };

        isPlaying = true;
        playButton.textContent = 'Stop Chord Progression';
        playButton.classList.add('stop'); // Add red styling
        playProgression();
    });

    // --- Canvas Resize Listener ---
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        // Debounce resize event
        resizeTimeout = window.setTimeout(() => {
            pianoRollDrawer.resize(); // Let the drawer handle resizing and redrawing
        }, 100);
    });

    // --- Initial state ---
    statusDiv.textContent = "Enter a progression and click generate.";
    pianoRollDrawer.draw([]); // Draw empty initial state

}

// --- Run Setup after DOM is loaded ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupApp);
} else {
    setupApp(); // DOMContentLoaded has already fired
}
