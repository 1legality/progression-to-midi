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


function setupMidiForm() {
    const form = document.getElementById('midiForm') as HTMLFormElement | null;
    const statusDiv = document.getElementById('status');
    const velocitySlider = document.getElementById('velocity') as HTMLInputElement | null;
    const velocityValueSpan = document.getElementById('velocityValue');
    const pianoRollCanvas = document.getElementById('pianoRollCanvas') as HTMLCanvasElement | null;
    // Get the new button
    const downloadMidiOnlyButton = document.getElementById('downloadMidiOnlyButton') as HTMLButtonElement | null;

    if (!form || !statusDiv || !velocitySlider || !velocityValueSpan || !pianoRollCanvas  || !downloadMidiOnlyButton) {
        console.error("Form, display elements, or download button not found!");
        if (statusDiv) statusDiv.textContent = "Error: Could not find necessary HTML elements.";
        return;
    }

    const ctx = pianoRollCanvas.getContext('2d', { alpha: false });
    if (!ctx) {
        console.error("Could not get 2D context for canvas");
        return;
    }

    let lastGeneratedNotes: NoteData[] = [];

    // --- Canvas Resizing Function (Keep as is) ---
    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        // Set actual buffer size
        pianoRollCanvas.width = pianoRollCanvas.clientWidth * dpr;
        pianoRollCanvas.height = pianoRollCanvas.clientHeight * dpr;
    
        // Scale the drawing context to match CSS pixels
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Use setTransform for clean scaling
    
        // ---> IMPORTANT: Redraw after resizing <---
        // You might need to redraw the *current* notes after resizing
        // If you store the notes (e.g., lastGeneratedNotes), redraw them here:
        // drawPianoRoll(lastGeneratedNotes, pianoRollCanvas, ctx);
        // Or at least redraw the empty grid if no notes generated yet:
         if (lastGeneratedNotes.length === 0) {
           drawPianoRoll([], pianoRollCanvas, ctx);
         } else {
           drawPianoRoll(lastGeneratedNotes, pianoRollCanvas, ctx);
         }
    };

    // --- Update velocity display (Keep as is) ---
    velocitySlider.addEventListener('input', (event) => {
        velocityValueSpan.textContent = (event.target as HTMLInputElement).value;
    });

    // --- **MODIFIED** Form Submission Handler (Generate Preview + Link) ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        statusDiv.textContent = 'Generating preview and MIDI...';
        statusDiv.classList.remove('text-red-600', 'text-green-600');
        statusDiv.classList.add('text-gray-600');
        // No need to manage currentMidiBlobUrl here anymore
        lastGeneratedNotes = [];

        const generationResult = generateMidiData(form); // Call the refactored function

        if (generationResult) {
            const { notesForPianoRoll, midiBlob, finalFileName } = generationResult;
            lastGeneratedNotes = [...notesForPianoRoll];

            // Draw Piano Roll
            resizeCanvas(); // Ensure canvas size is correct
            drawPianoRoll(lastGeneratedNotes, pianoRollCanvas, ctx);

            statusDiv.textContent = `Preview generated.`;
            statusDiv.classList.replace('text-gray-600', 'text-green-600');

        } else {
            // Handle generation error (UI update)
            statusDiv.textContent = `Error generating MIDI. Check console for details.`;
            statusDiv.classList.replace('text-gray-600', 'text-red-600');
            lastGeneratedNotes = [];
            // Clear canvas on error (keep existing error drawing logic)
            const dpr = window.devicePixelRatio || 1;
            ctx.fillStyle = '#f9fafb';
            ctx.fillRect(0, 0, pianoRollCanvas.width, pianoRollCanvas.height);
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#ef4444'; // red-500
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Error generating preview", pianoRollCanvas.clientWidth / 2, pianoRollCanvas.clientHeight / 2);
            ctx.restore();
        }
    });

    // --- **NEW** Event Listener for "Download MIDI Only" Button ---
    downloadMidiOnlyButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent potential form submission if it were type="submit"
        statusDiv.textContent = 'Generating MIDI file...';
        statusDiv.classList.remove('text-red-600', 'text-green-600');
        statusDiv.classList.add('text-gray-600');

        const generationResult = generateMidiData(form); // Call the refactored function

        if (generationResult) {
            const { midiBlob, finalFileName } = generationResult;

            // Trigger direct download
            triggerDownload(midiBlob, finalFileName);

            statusDiv.textContent = `MIDI file "${finalFileName}" download initiated.`;
            statusDiv.classList.replace('text-gray-600', 'text-green-600');
        } else {
             // Handle generation error (UI update)
             statusDiv.textContent = `Error generating MIDI. Check console for details.`;
             statusDiv.classList.replace('text-gray-600', 'text-red-600');
        }
    });


    // --- Initial Canvas Setup and Resize Listener (Keep as is) ---
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(resizeCanvas, 100);
    });
    resizeCanvas();

}

/**
 * Creates a temporary link and clicks it to download a blob.
 * @param blob - The Blob to download.
 * @param filename - The desired filename for the download.
 */
function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
}

/**
 * Generates MIDI data and note array from form data.
 * @param form - The HTMLFormElement containing the settings.
 * @returns Object containing notesForPianoRoll, midiBlob, and finalFileName, or null on error.
 */
function generateMidiData(form: HTMLFormElement): { notesForPianoRoll: NoteData[], midiBlob: Blob, finalFileName: string } | null {
    try {
        // 1. Get form data
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

        // 2. Process Chords into NoteData array and MIDI Track
        const track = new midiWriterJs.Track();
        track.setTempo(tempo);
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
                     // Defaulting logic remains the same...
                     if (qualityAndExtensions === '') { formulaIntervals = CHORD_FORMULAS['']; }
                     else {
                         console.warn(`Chord quality "${qualityAndExtensions}" not found for "${symbol}". Defaulting to major triad.`);
                         formulaIntervals = CHORD_FORMULAS[''];
                     }
                }

                let chordMidiNotes = formulaIntervals.map(intervalSemitones => rootMidi + intervalSemitones);

                // Inversion logic remains the same...
                 if (doInversion && chordMidiNotes.length > 1) {
                     chordMidiNotes.sort((a, b) => a - b);
                     const lowestNote = chordMidiNotes.shift();
                     if (lowestNote !== undefined) { chordMidiNotes.push(lowestNote + 12); }
                     chordMidiNotes.sort((a, b) => a - b);
                 }

                // Bass note logic remains the same...
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
                // Don't update statusDiv here, let the caller handle UI
                track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordDurationTicks, duration: 'T0', velocity: 0 }));
                currentTick += chordDurationTicks;
                // Optionally re-throw or handle specific errors if needed
                // throw new Error(`Error processing chord "${symbol}": ${error.message}`); // Or just let it add rests
            }
        } // End chord loop

        // 3. Generate MIDI Data Blob
        const writer = new midiWriterJs.Writer([track]);
        const midiDataBytes = writer.buildFile(); // Get byte array
        const midiBlob = new Blob([midiDataBytes], { type: 'audio/midi' });

        return { notesForPianoRoll, midiBlob, finalFileName };

    } catch (error: any) {
        console.error('Error generating MIDI data:', error);
        // Let the caller handle UI updates for errors
        // Return null to indicate failure
        return null;
    }
}

// --- Run Setup after DOM is loaded ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMidiForm);
} else {
    setupMidiForm();
}
