// src/main.ts
import midiWriterJs from 'midi-writer-js';

// --- Constants and Helper Functions ---
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const INTERVALS = {
    P1: 0,
    m2: 1,
    M2: 2,
    m3: 3,
    M3: 4,
    P4: 5,
    A4: 6,
    d5: 6,
    P5: 7,
    A5: 8,
    m6: 8,
    M6: 9,
    d7: 9,
    m7: 10,
    M7: 11,
    P8: 12,
    m9: 13,
    M9: 14,
    P11: 17,
    M13: 21
};
const CHORD_FORMULAS: Record<string, number[]> = {
    '': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5],
    'maj': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5],
    'm': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5],
    'min': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5],
    'dim': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5],
    'aug': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5],
    'sus4': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5],
    'sus2': [INTERVALS.P1, INTERVALS.M2, INTERVALS.P5],
    '7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7],
    'maj7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7],
    'm7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7],
    'm(maj7)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7],
    'dim7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.d7],
    'm7b5': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.m7],
    '9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
    'maj9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9],
    'm9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
    '11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11],
    'm11': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11],
    '13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
    'maj13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13],
    'm13': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
};
const TPQN = 128; // MIDI Writer JS default ticks per quarter note

// --- Helper Functions (normalizeNoteName, getNoteIndex, getMidiNote, getDurationTicks - unchanged) ---
function normalizeNoteName(note: string): string {
    const name = note.toUpperCase();
    switch (name) {
        case 'DB': return 'C#'; case 'EB': return 'D#'; case 'FB': return 'E'; case 'GB': return 'F#'; case 'AB': return 'G#'; case 'BB': return 'A#'; case 'E#': return 'F'; case 'B#': return 'C'; default: return name;
    }
}
function getNoteIndex(note: string): number {
    const normalizedNote = normalizeNoteName(note);
    const index = NOTES.indexOf(normalizedNote);
    if (index === -1) throw new Error(`Invalid note name: ${note}`);
    return index;
}
function getMidiNote(noteName: string, octave: number): number {
    const noteIndex = getNoteIndex(noteName);
    const midiVal = 12 * (octave + 1) + noteIndex;
    if (midiVal < 0 || midiVal > 127) {
        console.warn(`Calculated MIDI note ${midiVal} for ${noteName}${octave} is out of range (0-127). Clamping may occur.`);
    }
    return Math.max(0, Math.min(127, midiVal));
}
function getDurationTicks(durationCode: string): number {
    switch (durationCode) {
        case '16': return TPQN / 4;
        case '8': return TPQN / 2;
        case 'd4': return TPQN * 1.5;
        case '4': return TPQN;
        case 'd2': return TPQN * 3;
        case '2': return TPQN * 2;
        case '1': return TPQN * 4;
        case 'T1024': return 1024;
        case 'T1536': return 1536;
        case 'T2048': return 2048;
        default:
            console.warn(`Unknown duration code: ${durationCode}. Defaulting to quarter note (${TPQN} ticks).`);
            return TPQN;
    }
}

/** Represents a single note event for visualization. */
interface NoteData {
    midiNote: number;
    startTimeTicks: number;
    durationTicks: number;
    velocity: number;
}

// --- Piano Roll Drawing Function ---

/**
 * Draws the piano roll visualization onto a canvas.
 * IMPORTANT: Assumes canvas width/height attributes are already set correctly for the devicePixelRatio.
 * @param notesData - Array of notes to draw.
 * @param canvas - The HTMLCanvasElement to draw on.
 * @param ctx - The 2D rendering context of the canvas.
 * @param options - Drawing options.
 */
function drawPianoRoll(
    notesData: NoteData[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D, // Pass context directly
    options: { noteColor?: string, backgroundColor?: string, gridColor?: string } = {}
) {
    const {
        noteColor = '#2563eb',      // Default blue notes
        backgroundColor = '#f9fafb', // Default light gray background
        gridColor = '#e5e7eb'       // Default lighter gray grid
    } = options;

    // Get canvas dimensions using clientWidth/Height (represents CSS pixels)
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // --- Clear Canvas ---
    // Clear using the *drawing buffer* size (canvas.width/height)
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (notesData.length === 0) {
        ctx.save(); // Save context state
        // Apply scaling for text rendering based on DPR
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Ensure transform is set correctly
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        // Use clientWidth/Height for positioning text in CSS pixels
        ctx.fillText("No notes to display", canvasWidth / 2, canvasHeight / 2);
        ctx.restore(); // Restore context state (removes transform)
        return;
    }

    // --- Determine Range and Scale ---
    let minMidi = 127;
    let maxMidi = 0;
    let maxTimeTicks = 0;
    notesData.forEach(note => {
        minMidi = Math.min(minMidi, note.midiNote);
        maxMidi = Math.max(maxMidi, note.midiNote);
        maxTimeTicks = Math.max(maxTimeTicks, note.startTimeTicks + note.durationTicks);
    });

    minMidi = Math.max(0, minMidi - 2); // Add pitch padding
    maxMidi = Math.min(127, maxMidi + 2); // Add pitch padding
    const midiRange = maxMidi - minMidi + 1;

    // Remove 7 ticks from maxTimeTicks to make it more visually appealing
    if (maxTimeTicks > 0) {
        maxTimeTicks += 1;
    }

    // Calculate scaling factors based on CSS pixel dimensions
    const noteHeight = canvasHeight / midiRange;
    // Prevent division by zero if maxTimeTicks is 0 or negative (after adding 1 tick)
    const timeScale = maxTimeTicks > 0 ? canvasWidth / maxTimeTicks : 0; // pixels per tick


    // --- Draw Grid ---
    ctx.strokeStyle = gridColor;
    const dpr = window.devicePixelRatio || 1; // Get DPR
    ctx.lineWidth = 0.5 * dpr; // Scale line width for high DPI

    // Horizontal lines (pitch) - Draw lines for C notes
    for (let midi = minMidi; midi <= maxMidi; midi++) {
        if (midi % 12 === 0) { // If it's a C note
            const y = canvasHeight - ((midi - minMidi + 0.5) * noteHeight);
            // Draw using canvas buffer coordinates (scaled)
            ctx.beginPath();
            ctx.moveTo(0, y * dpr);
            ctx.lineTo(canvas.width, y * dpr);
            ctx.stroke();
        }
    }

    // --- Draw Notes ---
    ctx.fillStyle = noteColor;
    if (timeScale > 0) { // Only draw notes if timeScale is valid
        notesData.forEach(note => {
            const x = note.startTimeTicks * timeScale;
            // Calculate y based on CSS pixels, then scale for drawing
            const y = canvasHeight - ((note.midiNote - minMidi + 1) * noteHeight);
            const width = note.durationTicks * timeScale;
            const height = noteHeight; // Use full calculated height

            // Draw using canvas buffer coordinates (scaled)
            ctx.fillRect(
                x * dpr, // No inset on x
                y * dpr, // No inset on y
                Math.max(1 * dpr, width * dpr), // No inset on width
                Math.max(1 * dpr, height * dpr) // No inset on height
            );
        });
    }
}


// --- Main Function to Setup Form Interaction ---

function setupMidiForm() {
    const form = document.getElementById('midiForm') as HTMLFormElement | null;
    const statusDiv = document.getElementById('status');
    const velocitySlider = document.getElementById('velocity') as HTMLInputElement | null;
    const velocityValueSpan = document.getElementById('velocityValue');
    const pianoRollCanvas = document.getElementById('pianoRollCanvas') as HTMLCanvasElement | null;
    const downloadLinkContainer = document.getElementById('downloadLinkContainer');

    if (!form || !statusDiv || !velocitySlider || !velocityValueSpan || !pianoRollCanvas || !downloadLinkContainer) {
        console.error("Form or display elements not found!");
        if (statusDiv) statusDiv.textContent = "Error: Could not find necessary HTML elements.";
        return;
    }

    const ctx = pianoRollCanvas.getContext('2d', { alpha: false }); // Improve performance if no transparency needed
    if (!ctx) {
        console.error("Could not get 2D context for canvas");
        return;
    }

    let currentMidiBlobUrl: string | null = null;
    let lastGeneratedNotes: NoteData[] = []; // Store notes for redraw on resize

    // --- Canvas Resizing Function ---
    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        // Get dimensions based on CSS sizing
        const rect = pianoRollCanvas.getBoundingClientRect();

        // Check if canvas dimensions are valid
        if (rect.width <= 0 || rect.height <= 0) {
            console.warn("Canvas dimensions are invalid during resize. Skipping resize.");
            return; // Avoid setting invalid dimensions
        }

        // Set the drawing buffer size correctly
        pianoRollCanvas.width = Math.round(rect.width * dpr); // Use Math.round for integer values
        pianoRollCanvas.height = Math.round(rect.height * dpr);

        // Reset the transformation matrix and scale for high DPI
        // Scaling by DPR is essential for sharp rendering on high-res displays
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Redraw the last generated notes if they exist
        if (lastGeneratedNotes.length > 0) {
            drawPianoRoll(lastGeneratedNotes, pianoRollCanvas, ctx);
        } else {
            // Or clear and show a message if no notes generated yet
            // Clear using buffer coordinates
            ctx.fillStyle = '#f9fafb'; // background color
            ctx.fillRect(0, 0, pianoRollCanvas.width, pianoRollCanvas.height);

            // Draw text using CSS pixel coordinates after setting transform
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Apply scaling for text rendering
            ctx.fillStyle = '#9ca3af'; // gray-400
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            // Position text using clientWidth/Height (CSS Pixels)
            ctx.fillText("Generate a progression to see the preview.", pianoRollCanvas.clientWidth / 2, pianoRollCanvas.clientHeight / 2);
            ctx.restore(); // Restore context state
        }
    };

    // --- Update velocity display ---
    velocitySlider.addEventListener('input', (event) => {
        velocityValueSpan.textContent = (event.target as HTMLInputElement).value;
    });

    // --- Form Submission Handler ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        statusDiv.textContent = 'Generating preview and MIDI...';
        statusDiv.classList.remove('text-red-600', 'text-green-600');
        statusDiv.classList.add('text-gray-600');
        downloadLinkContainer.innerHTML = '';
        if (currentMidiBlobUrl) {
            URL.revokeObjectURL(currentMidiBlobUrl);
            currentMidiBlobUrl = null;
        }
        lastGeneratedNotes = []; // Clear previous notes before generating new ones

        try {
            // 1. Get form data (same as before)
            const formData = new FormData(form);
            const progressionString = formData.get('progression') as string;
            const outputFileName = formData.get('outputFileName') as string || 'progression';
            const addBassNote = formData.has('addBassNote');
            const doInversion = formData.has('doInversion');
            const baseOctave = parseInt(formData.get('baseOctave') as string, 10);
            const chordDurationStr = formData.get('chordDuration') as string;
            const tempo = parseInt(formData.get('tempo') as string, 10);
            const velocity = parseInt(formData.get('velocity') as string, 10);

            if (!progressionString || progressionString.trim() === '') {
                throw new Error("Chord progression cannot be empty.");
            }

            const finalFileName = outputFileName.endsWith('.mid') ? outputFileName : `${outputFileName}.mid`;
            const chordDurationTicks = getDurationTicks(chordDurationStr);

            // 2. Process Chords into NoteData array and MIDI Track (logic largely unchanged)
            const track = new midiWriterJs.Track();
            track.setTempo(tempo);
            // Set time signature (example: 4/4)
            // The parameters are: numerator, denominator, ticks per metronome click, number of 32nd notes per MIDI quarter-note (24 ticks)
            track.setTimeSignature(4, 4, 24, 8);


            const notesForPianoRoll: NoteData[] = [];
            let currentTick = 0;

            const chordSymbols = progressionString.trim().split(/\s+/);
            const chordRegex = /^([A-G][#b]?)(.*)$/;

            for (const symbol of chordSymbols) {
                if (!symbol) continue;
                const match = symbol.match(chordRegex);

                if (!match) {
                    console.warn(`Could not parse chord symbol: "${symbol}". Skipping.`);
                    track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordDurationTicks, duration: 'T0', velocity: 0 }));
                    currentTick += chordDurationTicks;
                    continue;
                }

                const rootNoteName = match[1];
                const qualityAndExtensions = match[2];

                try {
                    const rootMidi = getMidiNote(rootNoteName, baseOctave);
                    let formulaIntervals = CHORD_FORMULAS[qualityAndExtensions];
                    if (formulaIntervals === undefined) {
                        if (qualityAndExtensions === '') { formulaIntervals = CHORD_FORMULAS['']; }
                        else {
                            console.warn(`Chord quality "${qualityAndExtensions}" not found for "${symbol}". Defaulting to major triad.`);
                            formulaIntervals = CHORD_FORMULAS[''];
                        }
                    }

                    let chordMidiNotes = formulaIntervals.map(intervalSemitones => rootMidi + intervalSemitones);

                    if (doInversion && chordMidiNotes.length > 1) {
                        chordMidiNotes.sort((a, b) => a - b);
                        const lowestNote = chordMidiNotes.shift();
                        if (lowestNote !== undefined) { chordMidiNotes.push(lowestNote + 12); }
                        chordMidiNotes.sort((a, b) => a - b);
                    }

                    let eventMidiNotes = [...chordMidiNotes];
                    if (addBassNote) {
                        const bassNoteMidi = rootMidi - 12;
                        if (bassNoteMidi >= 0 && (!eventMidiNotes.length || bassNoteMidi < Math.min(...eventMidiNotes))) {
                            eventMidiNotes.unshift(bassNoteMidi);
                        } else if (bassNoteMidi < 0) {
                            console.warn(`Calculated bass note ${bassNoteMidi} for ${symbol} is below MIDI range 0. Skipping bass note.`);
                        }
                    }

                    eventMidiNotes = eventMidiNotes.filter(note => note >= 0 && note <= 127);
                    eventMidiNotes = [...new Set(eventMidiNotes)];

                    if (eventMidiNotes.length > 0) {
                        eventMidiNotes.forEach(midiNote => {
                            notesForPianoRoll.push({
                                midiNote: midiNote,
                                startTimeTicks: currentTick,
                                durationTicks: chordDurationTicks,
                                velocity: velocity
                            });
                        });
                        track.addEvent(new midiWriterJs.NoteEvent({
                            pitch: eventMidiNotes,
                            duration: 'T' + chordDurationTicks,
                            velocity: velocity
                        }));
                    } else {
                        console.warn(`No valid MIDI notes generated for chord "${symbol}". Adding rest.`);
                        track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordDurationTicks, duration: 'T0', velocity: 0 }));
                    }
                    currentTick += chordDurationTicks;

                } catch (error: any) {
                    console.error(`Error processing chord "${symbol}" for MIDI: ${error.message}. Adding rest.`);
                    statusDiv.textContent = `Error processing chord "${symbol}": ${error.message}`;
                    statusDiv.classList.replace('text-gray-600', 'text-red-600');
                    track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordDurationTicks, duration: 'T0', velocity: 0 }));
                    currentTick += chordDurationTicks;
                }
            } // End chord loop

            // Store generated notes for potential resize redraw
            lastGeneratedNotes = [...notesForPianoRoll];

            // 3. Draw Piano Roll (pass context)
            // Ensure canvas size is correct before drawing
            resizeCanvas(); // Call resize explicitly before drawing
            // Now draw with the updated notes
            drawPianoRoll(lastGeneratedNotes, pianoRollCanvas, ctx);


            // 4. Generate MIDI Data and Create Download Link (same as before)
            const writer = new midiWriterJs.Writer([track]);
            const midiData = writer.buildFile();
            const blob = new Blob([midiData], { type: 'audio/midi' });
            currentMidiBlobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = currentMidiBlobUrl;
            link.download = finalFileName;
            link.textContent = `Download ${finalFileName}`;
            link.className = 'inline-block px-4 py-2 bg-emerald-500 text-white rounded-md shadow-sm hover:bg-emerald-600 transition duration-150 ease-in-out';
            downloadLinkContainer.appendChild(link);

            statusDiv.textContent = `Preview generated. Click link below to download MIDI.`;
            statusDiv.classList.replace('text-gray-600', 'text-green-600');

        } catch (error: any) {
            console.error('Error generating MIDI:', error);
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.classList.replace('text-gray-600', 'text-red-600');
            lastGeneratedNotes = []; // Clear notes on error
            // Clear canvas on error
            const dpr = window.devicePixelRatio || 1;
            ctx.fillStyle = '#f9fafb';
            ctx.fillRect(0, 0, pianoRollCanvas.width, pianoRollCanvas.height);
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Ensure transform for text
            ctx.fillStyle = '#ef4444'; // red-500
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Error generating preview", pianoRollCanvas.clientWidth / 2, pianoRollCanvas.clientHeight / 2);
            ctx.restore();
        }
    });

    // --- Initial Canvas Setup and Resize Listener ---
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        // Debounce resize event
        resizeTimeout = window.setTimeout(resizeCanvas, 100); // Call resizeCanvas after a short delay
    });

    // Initial setup of canvas size when the script runs
    resizeCanvas(); // Set initial size
    // Display initial message is now handled within resizeCanvas if lastGeneratedNotes is empty

} // End setupMidiForm

// --- Run Setup after DOM is loaded ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMidiForm);
} else {
    setupMidiForm();
}
