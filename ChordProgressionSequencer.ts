import { MidiGenerator, MidiGenerationOptions, MidiGenerationResult, CHORD_FORMULAS, NOTES, OutputType, InversionType } from './MidiGenerator';
import { PianoRollDrawer } from './PianoRollDrawer';
import { SynthChordPlayer, ActiveNote } from './SynthChordPlayer';
import { ChordInfoModal } from './ChordInfoModal';
import { normalizeNoteName, getMidiNote, getNoteNameFromMidi } from './Utils';
import { ALL_POSSIBLE_NOTE_NAMES_FOR_VALIDATION, VALID_DURATION_CODES, generateValidChordPattern } from './ValidationUtils';
import { wirePrintButton } from './PrintProgression';

// Keep NoteData interface accessible if needed by Main.ts directly
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

export function setupChordProgressionSequencer() {
    const form = document.getElementById('midiForm') as HTMLFormElement | null;
    const statusDiv = document.getElementById('status');
    const velocitySlider = document.getElementById('velocity') as HTMLInputElement | null;
    const velocityValueSpan = document.getElementById('velocityValue');
    const pianoRollCanvas = document.getElementById('pianoRollCanvas') as HTMLCanvasElement | null;
    const downloadMidiOnlyButton = document.getElementById('downloadMidiOnlyButton') as HTMLButtonElement | null;
    const chordIndicator = document.getElementById('chordIndicator');

    if (!form || !statusDiv || !velocitySlider || !velocityValueSpan || !pianoRollCanvas || !downloadMidiOnlyButton) {
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
    const synthChordPlayer = new SynthChordPlayer();
    let lastGeneratedResult: MidiGenerationResult | null = null; // Store the last successful result
    let lastGeneratedNotes: NoteData[] = []; // Store the last generated notes for playback
    let lastGeneratedMidiBlob: Blob | null = null; // Store the generated MIDI blob in memory

    // Wire the print button using the helper in PrintProgression.ts
    wirePrintButton(() => lastGeneratedResult, {
        buttonId: 'printProgressionButton',
        baseOctaveSelectorId: 'baseOctave', 
        filename: 'progression.pdf',
        statusElement: statusDiv
    });

    // Ensure the audio context is resumed on user interaction
    const resumeAudioContext = () => synthChordPlayer.ensureContextResumed();
    document.addEventListener('click', resumeAudioContext, { once: true });

    // --- Update velocity display ---
    velocitySlider.addEventListener('input', (event) => {
        velocityValueSpan.textContent = (event.target as HTMLInputElement).value;
    });

    // Update chord button click logic to show a visual indicator
    const updateChordIndicator = (chord: string) => {
        if (chordIndicator) {
            chordIndicator.textContent = `Playing: ${chord}`;
            chordIndicator.classList.add('text-primary');
            setTimeout(() => {
                chordIndicator.textContent = '';
                chordIndicator.classList.remove('text-primary');
            }, 2000); // Reset after 2 seconds
        }
    };

    function validateChordProgression(progression: string): string {
        const normalizedProgression = progression
            .replace(/\|/g, ' ') // Replace pipes with spaces
            .replace(/->/g, ' ') // Replace arrows with spaces
            .replace(/\s*-\s*/g, ' ') // Treat hyphens as separators for chords
            .replace(/\s+/g, ' ') // Normalize multiple spaces
            .trim();

        if (!normalizedProgression) {
            return ""; // Allow empty progression to clear piano roll
        }

        const chordEntries = normalizedProgression.split(/\s+/);
        const validChordSymbolPattern = generateValidChordPattern();
        const validatedEntries: string[] = [];

        for (const entry of chordEntries) {
            if (!entry) continue;

            const parts = entry.split(':');
            const chordSymbol = parts[0];
            const durationStr = parts.length > 1 ? parts[1] : undefined;

            // Accept R as a valid rest symbol
            if (chordSymbol.toUpperCase() === 'R') {
                // Accept any positive duration for rest
                if (durationStr === undefined || isNaN(parseFloat(durationStr)) || parseFloat(durationStr) <= 0) {
                    throw new Error(`Rest "R" must have a positive duration (e.g., R:1 for one bar rest).`);
                }
                validatedEntries.push(entry);
                continue;
            }

            if (!validChordSymbolPattern.test(chordSymbol)) {
                throw new Error(`Invalid chord symbol: "${chordSymbol}" in entry "${entry}". Use formats like C, Cm, G7.`);
            }

            if (durationStr !== undefined) {
                const numericDuration = parseFloat(durationStr);
                const isValidNumeric = !isNaN(numericDuration) && numericDuration > 0;
                const isKnownCode = VALID_DURATION_CODES.includes(durationStr.toLowerCase());
                const isTCode = /^t\d+$/i.test(durationStr);

                if (!isValidNumeric && !isKnownCode && !isTCode) {
                    throw new Error(`Invalid duration: "${durationStr}" for chord "${chordSymbol}". Use beats (e.g., 0.5, 1), codes (e.g., q, 8, d4), or T-codes (e.g., T128).`);
                }
                validatedEntries.push(`${chordSymbol}:${durationStr}`);
            } else {
                validatedEntries.push(chordSymbol); // No duration specified, MidiGenerator will use default
            }
        }
        return validatedEntries.join(' ');
    }

    // --- Common function to get options and generate MIDI ---
    const handleGeneration = (isDownloadOnly: boolean): void => {
        const actionText = isDownloadOnly ? "Generating MIDI file" : "Generating preview and MIDI";
        statusDiv.textContent = `${actionText}...`;
        statusDiv.classList.remove('text-danger', 'text-success');
        statusDiv.classList.add('text-muted'); // Bootstrap's text-muted for neutral status

        try {
            // 1. Get form data
            const formData = new FormData(form);
            const rawProgression = formData.get('progression') as string;
            const validatedProgression = validateChordProgression(rawProgression);

            const options: MidiGenerationOptions = {
                progressionString: validatedProgression,
                outputFileName: formData.get('outputFileName') as string || undefined, // Let generator handle default
                outputType: formData.get('outputType') as OutputType,
                inversionType: formData.get('inversionType') as InversionType,
                baseOctave: parseInt(formData.get('baseOctave') as string, 10),
                chordDurationStr: formData.get('chordDuration') as string,
                tempo: parseInt(formData.get('tempo') as string, 10),
                velocity: parseInt(formData.get('velocity') as string, 10)
            };

            // 2. Generate MIDI and Notes
            const generationResult = midiGenerator.generate(options);
            lastGeneratedResult = generationResult; // Store successful result
            lastGeneratedNotes = generationResult.notesForPianoRoll; // Store notes for playback
            const chordDetails = generationResult.chordDetails; // Access detailed chord information for further use
            console.log('Chord Details:', chordDetails); // Example usage: log chord details to the console
            lastGeneratedMidiBlob = generationResult.midiBlob; // Store the MIDI blob for playback

            // Render chord buttons for the entire progression
            const progressionChordSymbols = validatedProgression.split(' ').map(entry => entry.split(':')[0]);
            pianoRollDrawer.renderChordButtons(progressionChordSymbols, chordDetails);

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

        } catch (error: any) {
            console.error(`Error during MIDI generation (${actionText}):`, error);
            lastGeneratedResult = null; // Clear last result on error
            lastGeneratedNotes = []; // Clear notes on error
            lastGeneratedMidiBlob = null; // Clear MIDI blob on error
            statusDiv.textContent = `Error: ${error.message || 'Failed to generate MIDI.'}`;
            statusDiv.classList.replace('text-muted', 'text-danger'); // Bootstrap's text-danger for errors
            pianoRollDrawer.drawErrorMessage("Error generating preview"); // Use drawer's error display
        }
    };

    // Modify renderChordButtons to handle chord playback while button is pressed
    pianoRollDrawer.renderChordButtons = (chords, chordDetails) => {
        const buttonContainer = document.getElementById('chordButtonContainer');
        if (!buttonContainer) {
            console.error('Chord button container not found!');
            return;
        }
        buttonContainer.innerHTML = '';

        const activeNotesMap = new Map<number, ActiveNote[]>(); // Map to track active notes per button

        chords.forEach((chord, index) => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-primary m-1';
            button.textContent = chord;

            // Play chord on mousedown or touchstart
            button.addEventListener('mousedown', () => {
                if (chordDetails && chordDetails[index]) {
                    const midiNotes = chordDetails[index].adjustedVoicing;
                    const activeNotes = synthChordPlayer.startChord(midiNotes); // Start the chord
                    activeNotesMap.set(index, activeNotes); // Track active notes for this button
                } else {
                    console.warn(`No details available for chord at index ${index}`);
                }
            });
            button.addEventListener('touchstart', (event) => {
                event.preventDefault(); // Prevent mouse event emulation
                if (chordDetails && chordDetails[index]) {
                    const midiNotes = chordDetails[index].adjustedVoicing;
                    const activeNotes = synthChordPlayer.startChord(midiNotes); // Start the chord
                    activeNotesMap.set(index, activeNotes); // Track active notes for this button
                } else {
                    console.warn(`No details available for chord at index ${index}`);
                }
            });

            // Stop chord on mouseup or touchend
            button.addEventListener('mouseup', () => {
                const activeNotes = activeNotesMap.get(index);
                if (activeNotes) {
                    synthChordPlayer.stopNotes(activeNotes); // Stop the chord
                    activeNotesMap.delete(index); // Remove from tracking
                }
            });
            button.addEventListener('touchend', (event) => {
                event.preventDefault(); // Prevent mouse event emulation
                const activeNotes = activeNotesMap.get(index);
                if (activeNotes) {
                    synthChordPlayer.stopNotes(activeNotes); // Stop the chord
                    activeNotesMap.delete(index); // Remove from tracking
                }
            });

            // Stop chord if mouse leaves the button or touch is canceled
            button.addEventListener('mouseleave', () => {
                const activeNotes = activeNotesMap.get(index);
                if (activeNotes) {
                    synthChordPlayer.stopNotes(activeNotes); // Stop the chord
                    activeNotesMap.delete(index); // Remove from tracking
                }
            });
            button.addEventListener('touchcancel', () => {
                const activeNotes = activeNotesMap.get(index);
                if (activeNotes) {
                    synthChordPlayer.stopNotes(activeNotes); // Stop the chord
                    activeNotesMap.delete(index); // Remove from tracking
                }
            });

            buttonContainer.appendChild(button);
        });
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

    // Add event listeners to form inputs to trigger preview generation on change
    const formInputs = form.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('change', () => {
            handleGeneration(false); // Generate preview automatically
        });
    });

    // // Add a 2-second delay for the progression text box
    // const progressionInput = form.querySelector('textarea[name="progression"]');
    // if (progressionInput) {
    //     let timeoutId: number;
    //     progressionInput.addEventListener('input', () => {
    //         clearTimeout(timeoutId);
    //         timeoutId = window.setTimeout(() => {
    //             handleGeneration(false); // Generate preview after delay
    //         }, 2000);
    //     });
    // }

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

    const helpButton = document.getElementById('helpButton');
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            ChordInfoModal.injectModalIntoDOM();
            // Ensure Bootstrap is imported or available globally
            const modal = new (window as any).bootstrap.Modal(document.getElementById('chordInfoModal')!);
            modal.show();
        });
    }
}